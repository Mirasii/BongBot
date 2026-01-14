import { EmbedBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ButtonInteraction, ComponentType, APIButtonComponent, Message, StringSelectMenuBuilder, StringSelectMenuInteraction, Client } from 'discord.js';
import Database from '../../helpers/database.js';
import { buildError } from '../../helpers/errorBuilder.js';

export default class ServerStatus {
    private db : Database;
    constructor(db: Database) {
        this.db = db;
    }
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const userServers = this.db.getServersByUserId(interaction.user.id);

            if (!userServers || userServers.length === 0) {
                throw new Error('You have no registered servers. Use `/register_server` to add one.');
            }

            const serverName = interaction.options.getString('server_name');
            if (userServers.length > 1 && !serverName) {
                const serverList = userServers.map(s => `• ${s.serverName}`).join('\n');
                throw new Error(`You have multiple registered servers. Please specify which one to query using the \`server_name\` option. Your registered servers:\n\n${serverList}`);
            }

            let selectedServer = userServers.length === 1 ? userServers[0] : userServers.find(s => s.serverName === serverName);
            if (!selectedServer) {
                const serverList = userServers.map(s => `• ${s.serverName}`).join('\n');
                throw new Error(`No server found with name "${serverName}". Your registered servers:\n\n${serverList}`);
            }

            const servers = await fetchServers(
                selectedServer.serverUrl,
                selectedServer.apiKey,
            );

            const resources = await Promise.all(
                servers.map((server) =>
                    fetchServerResources(
                        server.attributes.identifier,
                        selectedServer.serverUrl,
                        selectedServer.apiKey,
                    ),
                ),
            );

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎮 Game Server Status')
                .setTimestamp();

            servers.forEach((server, index) => {
                const resource = resources[index];
                const state = resource?.attributes.current_state || 'unknown';
                const statusEmoji = getStatusEmoji(state);

                let value = `${statusEmoji} **Status:** ${state}`;

                if (resource && state === 'running') {
                    const res = resource.attributes.resources;
                    const memoryMB = formatBytes(res.memory_bytes);
                    const cpuPercent = res.cpu_absolute.toFixed(1);
                    const uptime = formatUptime(res.uptime);

                    value += `\n💾 **Memory:** ${memoryMB} MB`;
                    value += `\n⚡ **CPU:** ${cpuPercent}%`;
                    value += `\n⏱️ **Uptime:** ${uptime}`;
                }

                embed.addFields({
                    name: `${server.attributes.name}`,
                    value: value,
                    inline: false,
                });
            });

            const components = createControlComponents(servers, resources, selectedServer);

            return {
                embeds: [embed],
                components: components,
            };
        } catch (error) {
            return await buildError(interaction, error);
        } finally {
            this.db?.close();
        }
    }

    async setupCollector(interaction: ChatInputCommandInteraction, message: Message): Promise<void> {
        const collector = message.createMessageComponentCollector({
            time: 600000,
        });

        collector.on(
            'collect',
            async (componentInteraction: ButtonInteraction | StringSelectMenuInteraction) => {
                if (componentInteraction.user.id !== interaction.user.id) {
                    await componentInteraction.reply({
                        content: '❌ You cannot control servers for another user.',
                        ephemeral: true,
                    });
                    return;
                }

                await componentInteraction.deferUpdate();

                let dbServerId: string;
                let identifier: string;
                let action: string;

                if (componentInteraction.isStringSelectMenu()) {
                    [dbServerId, identifier, action] = componentInteraction.values[0].split(':');
                } else {
                    [, dbServerId, identifier, action] = componentInteraction.customId.split(':');
                }

                const actionText = action === 'start' ? '▶️ Starting' : '🔄 Restarting';
                const replyMessage = {
                    stop: '⏹️ Stopping all servers... Status will update automatically.',
                    start: `${actionText} server... Status will update automatically.`,
                    restart: `${actionText} server... Status will update automatically.`,
                }[action] || 'Processing your request...';

                await componentInteraction.followUp({
                    content: replyMessage,
                    ephemeral: true,
                });
                try {
                    const disabledComponents = message.components.map((row) => {
                        const actionRow = row as any;
                        const firstComponent = actionRow.components[0];

                        if (firstComponent.type === ComponentType.StringSelect) {
                            const newRow = new ActionRowBuilder<StringSelectMenuBuilder>();
                            newRow.addComponents(
                                StringSelectMenuBuilder.from(firstComponent).setDisabled(true)
                            );
                            return newRow;
                        } else if (firstComponent.type === ComponentType.Button) {
                            const newRow = new ActionRowBuilder<ButtonBuilder>();
                            actionRow.components.forEach((component: APIButtonComponent) => {
                                newRow.addComponents(
                                    ButtonBuilder.from(component).setDisabled(true)
                                );
                            });
                            return newRow;
                        }
                        return row;
                    });

                    await componentInteraction.editReply({
                        components: disabledComponents,
                    });

                    this.db = new Database(process.env.SERVER_DATABASE || 'pterodactyl.db');
                    const dbServer = this.db.getServerById(parseInt(dbServerId));

                    if (!dbServer || !dbServer.id) {
                        await componentInteraction.followUp({
                            content: '❌ Server configuration not found.',
                            ephemeral: true,
                        });
                        return;
                    }

                    if (identifier === 'all' && action === 'stop') {
                        const servers = await fetchServers(
                            dbServer.serverUrl,
                            dbServer.apiKey,
                        );
                        const stopPromises = servers.map((server) =>
                            sendServerCommand(
                                server.attributes.identifier,
                                'stop',
                                dbServer.serverUrl,
                                dbServer.apiKey,
                            ),
                        );
                        await Promise.all(stopPromises);

                        await pollUntilStateChange(
                            componentInteraction,
                            servers.map((s) => s.attributes.identifier),
                            'offline',
                            dbServer.serverUrl,
                            dbServer.apiKey,
                            dbServer.id,
                        );
                    } else {
                        const success = await sendServerCommand(
                            identifier,
                            action as 'start' | 'stop' | 'restart',
                            dbServer.serverUrl,
                            dbServer.apiKey,
                        );

                        if (!success) {
                            await componentInteraction.followUp({
                                content: '❌ Failed to control server.',
                                ephemeral: true,
                            });
                            await refreshStatus(
                                componentInteraction,
                                dbServer.id,
                            );
                            return;
                        }

                        const expectedState = action === 'start' ? 'running' : action === 'stop' ? 'offline' : 'running';

                        await pollUntilStateChange(
                            componentInteraction,
                            [identifier],
                            expectedState,
                            dbServer.serverUrl,
                            dbServer.apiKey,
                            dbServer.id,
                        );
                    }
                } catch (error) {
                    console.error('Component interaction error:', error);
                    await componentInteraction
                        .followUp({
                            content: '❌ An error occurred processing your request.',
                            ephemeral: true,
                        })
                        .catch(() => {});
                    if (dbServerId) {
                        await refreshStatus(componentInteraction, parseInt(dbServerId));
                    }
                } finally {
                    this.db?.close();
                }
            },
        );

        collector.on('end', () => {
            message.edit({
                components: [],
            }).catch((error) => {console.error('Error clearing components after collector end:', error);});
        });
    }
}

async function fetchServers(serverUrl: string, apiKey: string): Promise<PterodactylServer[]> {
    const response = await fetch(`${serverUrl}/api/client`, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch servers: ${response.statusText}`);
    }

    const json: ApiResponse<PterodactylServer> = await response.json();
    return json.data;
}

async function fetchServerResources(identifier: string, serverUrl: string, apiKey: string): Promise<ServerResources | null> {
    try {
        const response = await fetch(
            `${serverUrl}/api/client/servers/${identifier}/resources`,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            },
        );

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch {
        return null;
    }
}

async function sendServerCommand(identifier: string, signal: 'start' | 'stop' | 'restart', serverUrl: string, apiKey: string): Promise<boolean> {
    try {
        const response = await fetch(
            `${serverUrl}/api/client/servers/${identifier}/power`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ signal }),
            },
        );

        return response.ok;
    } catch {
        return false;
    }
}

async function pollUntilStateChange(
    componentInteraction: ButtonInteraction | StringSelectMenuInteraction,
    identifiers: string[],
    expectedState: string,
    serverUrl: string,
    apiKey: string,
    dbServerId: number,
    maxAttempts: number = 120,
    interval: number = 500,
): Promise<void> {
    let attempts = 0;

    const checkStatus = async (): Promise<boolean> => {
        attempts++;

        const resourcePromises = identifiers.map((id) =>
            fetchServerResources(id, serverUrl, apiKey),
        );
        const resources = await Promise.all(resourcePromises);

        const allReached = resources.every((r) => {
            if (!r) return false;
            const state = r.attributes.current_state;
            return state === expectedState;
        });

        if (allReached || attempts >= maxAttempts) {
            await refreshStatus(componentInteraction, dbServerId);
            return true;
        }

        return false;
    };

    const pollInterval = setInterval(async () => {
        const done = await checkStatus();
        if (done) {
            clearInterval(pollInterval);
        }
    }, interval);

    const done = await checkStatus();
    if (done) {
        clearInterval(pollInterval);
    }
}

async function refreshStatus(componentInteraction: ButtonInteraction | StringSelectMenuInteraction, dbServerId: number): Promise<void> {
    let db: Database | undefined;
    try {
        db = new Database(process.env.SERVER_DATABASE || 'pterodactyl.db');
        const dbServer = db.getServerById(dbServerId);

        if (!dbServer) {
            return;
        }

        const servers = await fetchServers(
            dbServer.serverUrl,
            dbServer.apiKey,
        );

        const resources = await Promise.all(
            servers.map((server) =>
                fetchServerResources(
                    server.attributes.identifier,
                    dbServer.serverUrl,
                    dbServer.apiKey,
                ),
            ),
        );

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎮 Game Server Status')
            .setDescription('*Last updated: ' + new Date().toLocaleTimeString() + '*')
            .setTimestamp();

        servers.forEach((server, index) => {
            const resource = resources[index];
            const state = resource?.attributes.current_state || 'unknown';
            const statusEmoji = getStatusEmoji(state);

            let value = `${statusEmoji} **Status:** ${state}`;

            if (resource && state === 'running') {
                const res = resource.attributes.resources;
                const memoryMB = formatBytes(res.memory_bytes);
                const cpuPercent = res.cpu_absolute.toFixed(1);
                const uptime = formatUptime(res.uptime);

                value += `\n💾 **Memory:** ${memoryMB} MB`;
                value += `\n⚡ **CPU:** ${cpuPercent}%`;
                value += `\n⏱️ **Uptime:** ${uptime}`;
            }

            embed.addFields({
                name: `${server.attributes.name}`,
                value: value,
                inline: false,
            });
        });

        const components = createControlComponents(servers, resources, dbServer);

        await componentInteraction.editReply({
            embeds: [embed],
            components: components,
        });
    } catch (error) {
        console.error('Error refreshing status:', error);
    } finally {
        db?.close();
    }
}

function createControlComponents(
    servers: PterodactylServer[],
    resources: (ServerResources | null)[],
    dbServer: any,
): (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[] {
    const rows: (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[] = [];
    const allOptions: { label: string; description: string; value: string }[] = [];

    servers.forEach((server, index) => {
        const state = resources[index]?.attributes.current_state || 'unknown';
        const serverName = server.attributes.name.length > 80 ? server.attributes.name.substring(0, 77) + '...' : server.attributes.name;

        if (state === 'offline') {
            allOptions.push({
                label: `▶️ Start ${serverName}`,
                description: 'Start the server',
                value: `${dbServer.id}:${server.attributes.identifier}:start`,
            });
        }

        if (state === 'running') {
            allOptions.push({
                label: `🔄 Restart ${serverName}`,
                description: 'Restart the server',
                value: `${dbServer.id}:${server.attributes.identifier}:restart`,
            });
        }

        if (state === 'running') {
            allOptions.push({
                label: `⏹️ Stop ${serverName}`,
                description: 'Stop the server',
                value: `${dbServer.id}:${server.attributes.identifier}:stop`,
            });
        }
    });

    const maxRowsForSelects = 3;
    const optionsPerMenu = Math.ceil(allOptions.length / Math.min(maxRowsForSelects, Math.ceil(allOptions.length / 25)));

    for (let i = 0; i < allOptions.length; i += optionsPerMenu) {
        const menuOptions = allOptions.slice(i, i + optionsPerMenu);
        if (menuOptions.length > 0) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`server_control:${dbServer.id}:menu${i}`)
                .setPlaceholder(`Server Actions (${i / optionsPerMenu + 1}/${Math.ceil(allOptions.length / optionsPerMenu)})`)
                .addOptions(menuOptions);

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
            rows.push(row);

            if (rows.length >= 4) break;
        }
    }

    const anyRunning = resources.some((r) => r?.attributes.current_state === 'running');
    if (anyRunning && rows.length < 5) {
        const stopRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`server_control:${dbServer.id}:all:stop`)
                .setLabel('⏹️ Stop All Servers')
                .setStyle(ButtonStyle.Danger),
        );
        rows.push(stopRow);
    }

    return rows;
}

function formatBytes(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(0);
}

function formatUptime(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
}

function getStatusEmoji(state: string): string {
    switch (state) {
        case 'running':
            return '🟢';
        case 'starting':
            return '🟡';
        case 'stopping':
            return '🟠';
        case 'offline':
            return '🔴';
        default:
            return '⚪';
    }
}

interface PterodactylServer {
    attributes: {
        identifier: string;
        name: string;
        description: string;
    };
}

interface ServerResources {
    attributes: {
        current_state: string;
        resources: {
            memory_bytes: number;
            cpu_absolute: number;
            disk_bytes: number;
            uptime: number;
        };
    };
}

interface ApiResponse<T> {
    data: T[];
}
