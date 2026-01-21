import { ChatInputCommandInteraction } from 'discord.js';
import { buildError } from '../../helpers/errorBuilder.js';
import Database from '../../helpers/database.js';

export default class RemoveServer {
    private db : Database;
    constructor(db: Database) {
        this.db = db;
    }
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const serverName = interaction.options.getString('server_name', true).trim();
            const userId = interaction.user.id;
            this.db.deleteServer(userId, serverName);

            return {
                content: `Successfully removed server **${serverName}**!`,
                ephemeral: true
            };
        } catch (error) {
            return await buildError(interaction, error);
        }
    }
}
