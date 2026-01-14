import { ChatInputCommandInteraction, EmbedBuilder, Client } from 'discord.js';
import { buildError } from '../../helpers/errorBuilder.js';
import Database from '../../helpers/database.js';


export default class ListServers {
    private db : Database;
    constructor(db: Database) {
        this.db = db;
    }

    public async execute(interaction: ChatInputCommandInteraction) {
        try {
            const servers = this.db.getServersByUserId(interaction.user.id);
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
            return { embeds: [embed], ephemeral: true };

        } catch (error) {
            return await buildError(interaction, error);
        } finally {
            this.db?.close();
        }
    }
}
