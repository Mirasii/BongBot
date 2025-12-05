import { SlashCommandBuilder, Client, ChatInputCommandInteraction } from 'discord.js';
import QuoteBuilder from '../helpers/quoteBuilder.js';
import { buildError } from '../helpers/errorBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('random_quotes')
        .setDescription('Get up to 5 random quotes!')
        .addIntegerOption(option => option.setName('number').setDescription('How many quotes do you want?').setRequired(false)),
    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        try {
            return new QuoteBuilder().getQuote('/api/v1/quotes/random', 'Random Quotes', client, interaction);
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Adds a Quote to quotes.elmu.dev."
    }
}
