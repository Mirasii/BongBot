import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { generateCard } from '../helpers/infoCard.js';
import { buildError } from '../helpers/errorBuilder.js';
import { ExtendedClient } from '../helpers/interfaces.js';

export default {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Get BongBot Info Card'),
    async execute(interaction: CommandInteraction, client: ExtendedClient) {
        try {
            const embed = await generateCard(client);
            return { embeds: [embed] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Get Infocard for BongBot"
    }
}