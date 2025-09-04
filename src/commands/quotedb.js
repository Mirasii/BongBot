const { SlashCommandBuilder } = require('@discordjs/builders');
const API = require(`${__dirname}/../config/api_config.json`).quotedb;
const CALLER = require(`${__dirname}/../helpers/caller.js`);
const ERROR_BUILDER = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Quote Someone!')
        .addStringOption(option => option.setName('quote').setDescription('What did he say!?!').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('Who said it?').setRequired(true)),
    async execute(interaction, client) {
        try {
            const quote = interaction.options.getString('quote');
            const author = interaction.options.getUser('user').username;

            const response = await CALLER.post(
                API.url,
                '/api/quotes',
                { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API.apikey}` },
                { quote: quote, author: author }
            );
            return `Quote Successfully Added:\n*"${response}"*`;
        } catch (error) {
            return ERROR_BUILDER.buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Praise unto you, my friend"
    }
}
