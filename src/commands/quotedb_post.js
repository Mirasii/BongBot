const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { Colors } = require('discord.js');
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
            const response = await CALLER.post(
                API.url,
                '/api/v1/quotes',
                { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API.apikey}` },
                { 
                    quote: quote, 
                    author: author,
                    user_id: API.user_id,
                    date: new Date().toLocaleString()
                }
            );
            const embed = new EmbedBuilder()
                    .setTitle(`📜 New Quote Created`)
                    .setColor(Colors.Purple)
                    .addFields([
                        { name:  `*"${response.quote.quote}"*`, value: `🪶 - ${response.quote.author}`, inline: false },
                    ])
                    .setFooter({ text: `BongBot • Quotes from dev.elmu.db`, iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
            return { embeds: [embed] };
        } catch (error) {
            return await ERROR_BUILDER.buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Adds a Quote to dev.elmu.db."
    }
}
