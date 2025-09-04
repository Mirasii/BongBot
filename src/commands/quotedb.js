const { SlashCommandBuilder } = require('@discordjs/builders');
const apiConfig = require('../config/api_config.json');
const CALLER = require(`../helpers/caller.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Quote Someone!')
        .addStringOption(option => option.setName('quote').setDescription('What did he say!?!').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('Who said it?').setRequired(true)),
    async execute(interaction, client) {
        try {
            const quote = interaction.options.getString('quote');
            const user = interaction.options.getUser('user');
            const author = interaction.user.username;

            const response = await CALLER.post(
                apiConfig.quotedb.url,
                null, 
                {'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.quotedb.apikey}`}, 
                { quote: quote, author: author }
            );
            return 'Quote added successfully!';
        } catch (error) {
            return {
                type: 4,
                data: {
                    content: 'There was an error while executing this command.',
                    flags: 1 << 6 // set the EPHEMERAL flag
                }
            };
        }
    },
    fullDesc: {
        options: [],
        description: "Praise unto you, my friend"
    }
}
