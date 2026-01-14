import { ChatInputCommandInteraction, Client } from 'discord.js';
import { buildError } from '../../helpers/errorBuilder.js';
import Database from '../../helpers/database.js';

export async function execute(interaction: ChatInputCommandInteraction, client: Client) {
    let db: Database | undefined; 
    try {
        db = new Database(process.env.SERVER_DATABASE || 'pterodactyl.db');
        let serverUrl = interaction.options.getString('server_url', true).trim();
        const apiKey = interaction.options.getString('api_key', true).trim();
        const serverName = interaction.options.getString('server_name', true).trim();
        const userId = interaction.user.id;
        if (serverUrl.endsWith('/')) {
            serverUrl = serverUrl.slice(0, -1);
        }
        db.addServer({
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
        db?.close();
    }
}
