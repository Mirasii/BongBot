import { ChatInputCommandInteraction, ButtonInteraction, Message, StringSelectMenuInteraction } from 'discord.js';
import Database, { PterodactylServer as DbPterodactylServer } from '../../helpers/database.js';
import { buildError } from '../../helpers/errorBuilder.js';
import { Caller } from '../../helpers/caller.js';
import { fetchServers, fetchServerResources, fetchAllServerResources, sendServerCommand } from './shared/pterodactylApi.js';
import { buildServerStatusEmbed } from './shared/serverStatusEmbed.js';
import { buildServerControlComponents, disableAllComponents } from './shared/serverControlComponents.js';
import { Logger } from '../../helpers/interfaces.js'
export default class ServerStatus {
    private db: Database;
    private caller: Caller;
    private _logger: Logger;

    constructor(db: Database, caller: Caller, _logger: Logger) {
        this.db = db;
        this.caller = caller;
        this._logger = _logger;
    }

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const userServers = this.db.getServersByUserId(interaction.user.id);

            if (!userServers || userServers.length === 0) {
                throw new Error('You have no registered servers. Use `/pterodactyl register` to add one.');
            }

            const serverName = interaction.options.getString('server_name');
            if (userServers.length > 1 && !serverName) {
                const serverList = userServers.map(s => `• ${s.serverName}`).join('\n');
                throw new Error(`You have multiple registered servers. Please specify which one to query using the \`server_name\` option. Your registered servers:\n\n${serverList}`);
            }

            const selectedServer = userServers.length === 1
                ? userServers[0]
                : userServers.find(s => s.serverName === serverName);

            if (!selectedServer) {
                const serverList = userServers.map(s => `• ${s.serverName}`).join('\n');
                throw new Error(`No server found with name "${serverName}". Your registered servers:\n\n${serverList}`);
            }

            const servers = await fetchServers(this.caller, selectedServer.serverUrl, selectedServer.apiKey);
            const resources = await fetchAllServerResources(this.caller, servers, selectedServer.serverUrl, selectedServer.apiKey);

            const embed = buildServerStatusEmbed(servers, resources);
            const components = buildServerControlComponents(servers, resources, selectedServer.id!);

            return {
                embeds: [embed],
                components: components,
            };
        } catch (error) {
            return await buildError(interaction, error);
        }
    }

    async setupCollector(interaction: ChatInputCommandInteraction, message: Message): Promise<void> {
        if (!('manage' === interaction.options.getSubcommand())) { return; }
        const collector = message.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async (componentInteraction: ButtonInteraction | StringSelectMenuInteraction) => {
            if (componentInteraction.user.id !== interaction.user.id) {
                await componentInteraction.reply({
                    content: '❌ You cannot control servers for another user.',
                    ephemeral: true,
                });
                return;
            }

            await componentInteraction.deferUpdate();

            const { dbServerId, identifier, action } = this.parseComponentInteraction(componentInteraction);
            const replyMessage = this.getActionMessage(action, identifier);

            await componentInteraction.followUp({ content: replyMessage, ephemeral: true });

            try {
                await componentInteraction.editReply({
                    components: disableAllComponents(message.components),
                });

                const dbServer = this.db.getServerById(parseInt(dbServerId));

                if (!dbServer || !dbServer.id) {
                    await componentInteraction.followUp({
                        content: '❌ Server configuration not found.',
                        ephemeral: true,
                    });
                    return;
                }

                await this.handleServerAction(componentInteraction, dbServer as ValidatedDbServer, identifier, action);
            } catch (error) {
                this._logger.error(error as Error);
                await componentInteraction.followUp({
                    content: '❌ An error occurred processing your request.',
                    ephemeral: true,
                }).catch(() => {});

                if (dbServerId) {
                    await this.refreshStatus(componentInteraction, parseInt(dbServerId));
                }
            }
        });

        collector.on('end', () => {
            message.edit({ components: [] }).catch((error) => {
                this._logger.error(error);
            });
        });
    }

    private parseComponentInteraction(componentInteraction: ButtonInteraction | StringSelectMenuInteraction): {
        dbServerId: string;
        identifier: string;
        action: string;
    } {
        if (componentInteraction.isStringSelectMenu()) {
            const [dbServerId, identifier, action] = componentInteraction.values[0].split(':');
            return { dbServerId, identifier, action };
        }
        const [, dbServerId, identifier, action] = componentInteraction.customId.split(':');
        return { dbServerId, identifier, action };
    }

    private getActionMessage(action: string, identifier: string): string {
        const actionText = action === 'start' ? '▶️ Starting' : '🔄 Restarting';
        const stopMessage = identifier === 'all'
            ? '⏹️ Stopping all servers... Status will update automatically.'
            : '⏹️ Stopping server... Status will update automatically.';

        return {
            stop: stopMessage,
            start: `${actionText} server... Status will update automatically.`,
            restart: `${actionText} server... Status will update automatically.`,
        }[action] || 'Processing your request...';
    }

    private async handleServerAction(
        componentInteraction: ButtonInteraction | StringSelectMenuInteraction,
        dbServer: ValidatedDbServer,
        identifier: string,
        action: string
    ): Promise<void> {
        if (identifier === 'all' && action === 'stop') {
            const servers = await fetchServers(this.caller, dbServer.serverUrl, dbServer.apiKey);
            const stopPromises = servers.map((server) =>
                sendServerCommand(this.caller, server.attributes.identifier, 'stop', dbServer.serverUrl, dbServer.apiKey)
                    .then((success) => ({ identifier: server.attributes.identifier, name: server.attributes.name, success }))
            );
            const results = await Promise.allSettled(stopPromises);

            const failedServers: string[] = [];
            const successfulIdentifiers: string[] = [];

            for (const result of results) {
                // sendServerCommand catches all errors, so results are always fulfilled
                const value = (result as PromiseFulfilledResult<{ identifier: string; name: string; success: boolean }>).value;
                if (!value.success) {
                    failedServers.push(value.name);
                    this._logger.debug(`Failed to stop server: ${value.identifier} (${value.name})`);
                } else {
                    successfulIdentifiers.push(value.identifier);
                }
            }

            if (failedServers.length > 0) {
                await componentInteraction.followUp({
                    content: `⚠️ Failed to stop ${failedServers.length} server(s): ${failedServers.join(', ')}`,
                    ephemeral: true,
                });
            }

            if (successfulIdentifiers.length > 0) {
                await this.pollUntilStateChange(
                    componentInteraction,
                    successfulIdentifiers,
                    'offline',
                    dbServer
                );
            } else {
                await this.refreshStatus(componentInteraction, dbServer.id);
            }
        } else {
            const success = await sendServerCommand(
                this.caller,
                identifier,
                action as 'start' | 'stop' | 'restart',
                dbServer.serverUrl,
                dbServer.apiKey
            );

            if (!success) {
                await componentInteraction.followUp({
                    content: '❌ Failed to control server.',
                    ephemeral: true,
                });
                await this.refreshStatus(componentInteraction, dbServer.id);
                return;
            }

            const expectedState = action === 'start' ? 'running' : action === 'stop' ? 'offline' : 'running';

            await this.pollUntilStateChange(
                componentInteraction,
                [identifier],
                expectedState,
                dbServer
            );
        }
    }

    private async pollUntilStateChange(
        componentInteraction: ButtonInteraction | StringSelectMenuInteraction,
        identifiers: string[],
        expectedState: string,
        dbServer: ValidatedDbServer,
        maxAttempts: number = 120,
        interval: number = 500
    ): Promise<void> {
        let attempts = 0;

        const checkStatus = async (): Promise<boolean> => {
            attempts++;

            const resources = await Promise.all(
                identifiers.map((id) =>
                    fetchServerResources(this.caller, id, dbServer.serverUrl, dbServer.apiKey)
                )
            );

            const allReached = resources.every((r) => {
                if (!r) return false;
                const state = r.attributes.current_state;
                return state === expectedState;
            });

            if (allReached || attempts >= maxAttempts) {
                await this.refreshStatus(componentInteraction, dbServer.id);
                return true;
            }

            return false;
        };

        const done = await checkStatus();
        if (done) { return; }

        const pollInterval = setInterval(async () => {
            const done = await checkStatus();
            if (done) { clearInterval(pollInterval); }
        }, interval);

    }

    private async refreshStatus(
        componentInteraction: ButtonInteraction | StringSelectMenuInteraction,
        dbServerId: number
    ): Promise<void> {
        try {
            const dbServer = this.db.getServerById(dbServerId);

            if (!dbServer) {
                return;
            }

            const servers = await fetchServers(this.caller, dbServer.serverUrl, dbServer.apiKey);
            const resources = await fetchAllServerResources(this.caller, servers, dbServer.serverUrl, dbServer.apiKey);

            const embed = buildServerStatusEmbed(
                servers,
                resources,
                '*Last updated: ' + new Date().toLocaleTimeString() + '*'
            );
            const components = buildServerControlComponents(servers, resources, dbServer.id!);

            await componentInteraction.editReply({
                embeds: [embed],
                components: components,
            });
        } catch (error) {
            this._logger.error(error as Error);
        }
    }
}

type ValidatedDbServer = DbPterodactylServer & { id: number };