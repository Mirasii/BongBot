import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { buildError } from '../helpers/errorBuilder.js';
import { searchImage } from '../helpers/googleSearch.js';

const query = 'Omaru Polka'; // Query for the image search

export default {
    data: new SlashCommandBuilder()
        .setName('clown')
        .setDescription('Finds a random polka image'),
    async execute(interaction: CommandInteraction) {
        try {
            return await searchImage(query);
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Gets a random picture of Omaru Polka, and posts it to the chat."
    }
}
