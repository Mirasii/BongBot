import { ChatInputCommandInteraction } from 'discord.js';
import { buildError } from '../../helpers/errorBuilder.js';
import Database from '../../helpers/database.js';
import { Caller } from '../../helpers/caller.js';

export default class UpdateServer {
    private db : Database;
    private caller : Caller;
    constructor(db: Database, caller: Caller) {
        this.db = db;
        this.caller = caller;
    }
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const serverName = interaction.options.getString('server_name', true).trim();
            const serverUrl = interaction.options.getString('server_url');
            const apiKey = interaction.options.getString('api_key');
            const userId = interaction.user.id;

            // Build updates object with only provided fields
            const updates: { serverUrl?: string; apiKey?: string } = {};
            if (serverUrl) updates.serverUrl = serverUrl.trim();
            if (apiKey) updates.apiKey = apiKey.trim();

            this.db.updateServer(userId, serverName, updates);

            // Build response message
            const updatedFields: string[] = [];
            if (updates.serverUrl) updatedFields.push('URL');
            if (updates.apiKey) updatedFields.push('API key');

            return {
                content: `Successfully updated **${serverName}**!\nUpdated: ${updatedFields.join(', ')}`,
                ephemeral: true
            };
        } catch (error) {
            return await buildError(interaction, error);
        } finally {
            this.db?.close();
        }
    }
}
