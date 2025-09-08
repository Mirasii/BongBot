const { SlashCommandBuilder } = require('@discordjs/builders');
const { QuoteBuilder } = require(`${__dirname}/../helpers/quoteBuilder.js`);
const API = require(`${__dirname}/../config/index.js`).apis.quotedb;
const CALLER = require(`${__dirname}/../helpers/caller.js`);
const { buildError } = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('random_quotes')
        .setDescription('Get up to 5 random quotes!')
        .addIntegerOption(option => option.setName('number').setDescription('How many quotes do you want?').setRequired(false)),
    async execute(interaction, client) {
        try {
            const number = interaction.options.getInteger('number') || 1;
            if (number > 5) return await buildError(interaction, new Error("You can only request up to 5 quotes at a time."));

            const response = await CALLER.get(
                API.url,
                `/api/v1/quotes/random/user/${API.user_id}`,
                `max_quotes=${number}`,
                { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API.apikey}` }
            );
            if (response?.quotes?.length === 0) return await buildError(interaction, new Error("No quotes found."));
            return new QuoteBuilder()
                    .setTitle('Random Quotes')
                    .addQuotes(response.quotes)
                    .build(client);
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Adds a Quote to quotes.elmu.dev."
    }
}
