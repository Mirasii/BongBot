const { SlashCommandBuilder } = require('@discordjs/builders');
export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Health Check BongBot'),
    async execute() {
        return 'Pong';
    },
    fullDesc: {
        options: [],
        description: "Praise unto you, my friend"
    }
}
