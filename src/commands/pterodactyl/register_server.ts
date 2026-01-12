import { SlashCommandBuilder, ChatInputCommandInteraction, Client } from 'discord.js';
import { buildError } from '../../helpers/errorBuilder.js';
import Database from '../../helpers/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('register_server')
        .setDescription('Register a new pterodactyl server to the bot.')
        .addStringOption(option => option.setName('server_url').setDescription('The URL of the pterodactyl panel.').setRequired(true))
        .addStringOption(option => option.setName('api_key').setDescription('The API key for the pterodactyl panel.').setRequired(true))
        .addStringOption(option => option.setName('server_name').setDescription('The Name of the server to register.').setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        try {
            const db = new Database(
                process.env.SERVER_DATABASE || 'pterodactyl.db',
            );
            let serverUrl = interaction.options.getString('server_url', true).trim();
            const apiKey = interaction.options.getString('api_key', true).trim();
            const serverName = interaction.options.getString('server_name', true).trim();
            const userId = interaction.user.id;
            if (serverUrl.endsWith('/')) {
                serverUrl = serverUrl.slice(0, -1);
            }
            const serverId = db.addServer({
                userId,
                serverName,
                serverUrl,
                apiKey
            });

            db.close();

            return {
                content: `Successfully registered server **${serverName}** (ID: ${serverId})!\nURL: ${serverUrl}`,
                ephemeral: true
            };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: 'Registers a new pterodactyl server to the bot.',
    },
};
