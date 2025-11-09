import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { buildError } from '../helpers/errorBuilder.js';
import { searchImage } from '../helpers/googleSearch.js';
const query = 'Shirakami Fubuki'; // Query for the image search

export default {
    data: new SlashCommandBuilder()
        .setName('fox')
        .setDescription('Finds a random fubuki image'),
    async execute(interaction: CommandInteraction) {
        try {
            return await searchImage(query);
        } catch (error) {
            return await buildError(interaction, error);
        }
    }
}
