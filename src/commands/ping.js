const { SlashCommandBuilder } = require('@discordjs/builders');
const ERROR_BUILDER = require(`${__dirname}/../helpers/errorBuilder.js`);
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Health Check BongBot'),
    async execute(interaction, client) {
        try {
            return 'Pong';
        } catch (error) {
            return await ERROR_BUILDER.buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Praise unto you, my friend"
    }
}
