const { SlashCommandBuilder } = require('@discordjs/builders');
const ErrorBuilder = require(`${__dirname}/../helpers/errorBuilder.js`);
const google = require(`${__dirname}/../helpers/googleSearch.js`);
const query = 'Shirakami Fubuki'; // Query for the image search

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fox')
        .setDescription('Finds a random fubuki image'),
    async execute(interaction, client) {
        try {
            return await google.searchImage(query);
        } catch (error) {
            return ErrorBuilder.buildError(interaction, error);
        }
    }
}
