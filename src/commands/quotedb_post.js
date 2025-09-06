const { SlashCommandBuilder } = require('@discordjs/builders');
const API = require(`${__dirname}/../config/index.js`).apis.quotedb;
const CALLER = require(`${__dirname}/../helpers/caller.js`);
const ERROR_BUILDER = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create_quote')
        .setDescription('Quote Someone!')
        .addStringOption(option => option.setName('quote').setDescription('What did he say!?!').setRequired(true))
        .addStringOption(option => option.setName('author').setDescription('Who said it?').setRequired(true)),
    async execute(interaction, client) {
        try {
            const quote = interaction.options.getString('quote');
            const author = interaction.options.getString('author');
            console.log(interaction.guild.id);
            console.log(interaction.guild.name);
            const response = await CALLER.post(
                API.url,
                '/api/v1/add_quote',
                { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API.apikey}` },
                { 
                    quote: quote, 
                    author: author,
                    user:  {
                        id: interaction.guild.id,
                        name: interaction.guild.name,
                    },
                    owner_id: API.owner_id,
                    date: new Date().toLocaleString()
                }
            );
            return `Quote Successfully Added:\n*"${response}"*`;
        } catch (error) {
            return await ERROR_BUILDER.buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Adds a Quote to dev.elmu.db."
    }
}
