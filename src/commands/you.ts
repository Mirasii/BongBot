import { SlashCommandBuilder, CommandInteraction, Client } from 'discord.js';
import EMBED_BUILDER from '../helpers/embedBuilder.js';
import { buildError } from '../helpers/errorBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('you')
        .setDescription('you!'),
    async execute(interaction: CommandInteraction, client: Client) {
        try {
            return await new EMBED_BUILDER().constructEmbedWithImage('clown.jpg').addDefaultFooter(client).build();
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a you!"
    }
}
