import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import EMBED_BUILDER from '../helpers/embedBuilder.js';
import { buildError } from '../helpers/errorBuilder.js';
import { ExtendedClient } from '../helpers/interfaces.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cringe')
        .setDescription('cringe!'),
    async execute(interaction: CommandInteraction, client: ExtendedClient) {
        try {
            return await new EMBED_BUILDER().constructEmbedWithImage('cringe.png').addDefaultFooter(client).build();
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a cringe!"
    }
}
