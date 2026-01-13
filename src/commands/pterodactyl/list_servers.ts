import { ChatInputCommandInteraction, EmbedBuilder, Client } from 'discord.js';
import { buildError } from '../../helpers/errorBuilder.js';
import Database from '../../helpers/database.js';

export async function execute(interaction: ChatInputCommandInteraction, client: Client) {
    try {
        const db = new Database(
            process.env.SERVER_DATABASE || 'pterodactyl.db',
        );
        const servers = db.getServersByUserId(interaction.user.id);
        db.close();
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎮 Registered Servers')
            .setTimestamp();
        if (servers.length === 0) {
            embed.setDescription('You have no registered servers.');
            return { embeds: [embed] };
        }
        servers.forEach((server) => {
            embed.addFields({
                name: server.serverName,
                value: `URL: ${server.serverUrl}`,
            });
        });
        return { embeds: [embed] };

    } catch (error) {
        return await buildError(interaction, error);
    }
}
