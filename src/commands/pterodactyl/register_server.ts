import { ChatInputCommandInteraction } from 'discord.js';
import { buildError } from '../../helpers/errorBuilder.js';
import Database from '../../helpers/database.js';
import { Caller } from '../../helpers/caller.js';

export default class RegisterServer {
    private db : Database;
    private caller : Caller;
    constructor(db: Database, caller: Caller) {
        this.db = db;
        this.caller = caller;
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

async function checkServerExists(serverUrl: string, apiKey: string): Promise<boolean> {

    return false;
}