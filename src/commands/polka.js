const { SlashCommandBuilder } = require('@discordjs/builders');
const ErrorBuilder = require(`${__dirname}/../helpers/errorBuilder.js`);
const google = require(`${__dirname}/../helpers/googleSearch.js`);
const query = 'Omaru Polka'; // Query for the image search

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clown')
        .setDescription('Finds a random polka image'),
    async execute(interaction, client) {
        try {
            return await google.searchImage(query);
        } catch (error) {
            return ErrorBuilder.buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Gets a random picture of Omaru Polka, and posts it to the chat."
    }
}
