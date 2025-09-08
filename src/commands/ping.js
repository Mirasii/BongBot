const { SlashCommandBuilder } = require('@discordjs/builders');
const { buildError } = require(`${__dirname}/../helpers/errorBuilder.js`);
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Health Check BongBot'),
    async execute(interaction, client) {
        return 'Pong';
    },
    fullDesc: {
        options: [],
        description: "Praise unto you, my friend"
    }
}
