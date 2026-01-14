import { ChatInputCommandInteraction } from 'discord.js';
import { buildError } from '../../helpers/errorBuilder.js';
import Database from '../../helpers/database.js';

export default class RegisterServer {
    private db : Database;
    constructor(db: Database) {
        this.db = db;
    }
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            let serverUrl = interaction.options.getString('server_url', true).trim();
            const apiKey = interaction.options.getString('api_key', true).trim();
            const serverName = interaction.options.getString('server_name', true).trim();
            const userId = interaction.user.id;
            if (serverUrl.endsWith('/')) {
                serverUrl = serverUrl.slice(0, -1);
            }
            this.db.addServer({
                userId,
                serverName,
                serverUrl,
                apiKey
            });

            return {
                content: `Successfully registered server **${serverName}**!`,
                ephemeral: true
            };
        } catch (error) {
            return await buildError(interaction, error);
        } finally {
            this.db?.close();
        }
    }
}
