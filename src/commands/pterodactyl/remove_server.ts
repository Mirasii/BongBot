import { ChatInputCommandInteraction, Client } from 'discord.js';
import { buildError } from '../../helpers/errorBuilder.js';
import Database from '../../helpers/database.js';

export async function execute(interaction: ChatInputCommandInteraction, client: Client) {
    try {
        const db = new Database(
            process.env.SERVER_DATABASE || 'pterodactyl.db',
        );
        const serverName = interaction.options.getString('server_name', true).trim();
        const userId = interaction.user.id;
        db.deleteServer(userId, serverName);
        db.close();

        return {
            content: `Successfully removed server **${serverName}**!`,
            ephemeral: true
        };
    } catch (error) {
        return await buildError(interaction, error);
    }
}
