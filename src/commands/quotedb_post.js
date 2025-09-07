const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { QuoteBuilder } = require(`${__dirname}/../helpers/quoteBuilder.js`);
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
            return await createQuote(quote, author, client);
        } catch (error) {
            return await ERROR_BUILDER.buildError(interaction, error);
        }
    },
    async executeReply(message, client) {
        try {
            if (!message.reference) return "You need to reply to a message to create a quote from it.";
            const repliedToMessage = await message.fetchReference();
            if (!repliedToMessage || !repliedToMessage.content) return "The message you replied to is empty or I can't access it.";
           
            const quoteText = repliedToMessage.content;
            const quoteAuthor = repliedToMessage.member;
            const authorDisplayName = quoteAuthor.displayName;
            return await createQuote(quoteText, authorDisplayName, client);
        } catch (error) {
            return await ERROR_BUILDER.buildUnknownError(error);
        }
    },
    fullDesc: {
        options: [],
        description: "Adds a Quote to quotes.elmu.dev."
    }
}

async function createQuote(quote, author, client) {
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
    return new QuoteBuilder()
        .setTitle(`New Quote Created`)
        .addQuotes([response])
        .build(client);
}