import { SlashCommandBuilder, ChatInputCommandInteraction, Client } from 'discord.js';
import * as registerServer from './register_server.js';
import * as listServers from './list_servers.js';
import * as serverStatus from './server_status.js';
import * as updateServer from './update_server.js';
import * as removeServer from './remove_server.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pterodactyl')
        .setDescription('Manage your Pterodactyl panel servers')
        .addSubcommand(subcommand =>
            subcommand
                .setName('register')
                .setDescription('Register a new Pterodactyl server')
                .addStringOption(option =>
                    option
                        .setName('server_name')
                        .setDescription('A friendly name for this server')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('server_url')
                        .setDescription('The URL of your Pterodactyl panel')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('api_key')
                        .setDescription('Your Pterodactyl API key')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all your registered servers')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('manage')
                .setDescription('View the status and manage your servers')
                .addStringOption(option =>
                    option
                        .setName('server_name')
                        .setDescription('The name of the server to manage')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Update a server configuration')
                .addStringOption(option =>
                    option
                        .setName('server_name')
                        .setDescription('The name of the server to update')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('server_url')
                        .setDescription('The new URL of the pterodactyl panel')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('api_key')
                        .setDescription('The new API key')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a registered server')
                .addStringOption(option =>
                    option
                        .setName('server_name')
                        .setDescription('The name of the server to remove')
                        .setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'register':
                return await registerServer.execute(interaction, client);
            case 'list':
                return await listServers.execute(interaction, client);
            case 'manage':
                return await serverStatus.execute(interaction, client);
            case 'update':
                return await updateServer.execute(interaction, client);
            case 'remove':
                return await removeServer.execute(interaction, client);
            default:
                return {
                    content: 'Unknown subcommand',
                    ephemeral: true,
                };
        }
    },

    setupCollector: serverStatus.setupCollector,

    fullDesc: {
        description: 'Manage your Pterodactyl panel servers. Use subcommands to register, list, view status, update, or remove servers. View the full guide [here](https://docs.google.com/document/d/1Zp2gsq3bqzJwQ6OeA4nu_3XM3is3-TM8ynA1vWxIZL8/edit?tab=t.0&usp=sharing).',
        options: [
            {
                name: 'register',
                description: 'Register a new Pterodactyl server with the bot',
            },
            {
                name: 'list',
                description: 'List all your registered servers',
            },
            {
                name: 'manage',
                description: 'View the status and control your servers',
            },
            {
                name: 'update',
                description: 'Update server URL or API key',
            },
            {
                name: 'remove',
                description: 'Remove a registered server',
            },
        ],
    },
};