const { SlashCommandBuilder } = require('@discordjs/builders');
const { getQuote } = require(`${__dirname}/../helpers/quoteBuilder.js`);
const { buildError } = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('get_quotes')
        .setDescription('Get up to 5 recent quotes!')
        .addIntegerOption(option => option.setName('number').setDescription('How many quotes do you want?').setRequired(false))
        .addBooleanOption(option => option.setName('server').setDescription('Get quotes from this server only? Default: true').setRequired(false)),
    async execute(interaction, client) {
        try {
            return await getQuote('Recent Quotes',interaction, '/api/v1/quotes/search', client);
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Adds a Quote to quotes.elmu.dev."
    }
}
