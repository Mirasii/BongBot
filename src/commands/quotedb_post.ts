import { SlashCommandBuilder, Client, ChatInputCommandInteraction, Message } from 'discord.js';
import QuoteBuilder from '../helpers/quoteBuilder.js';
import { apis } from '../config/index.js';
import CALLER from '../helpers/caller.js';
import { buildError, buildUnknownError } from '../helpers/errorBuilder.js';

const API = apis.quotedb;

async function createQuote(quote: string, author: string, client: Client) {
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
        .addQuotes([response.quote])
        .build(client);
}

export default {
    data: new SlashCommandBuilder()
        .setName('create_quote')
        .setDescription('Quote Someone!')
        .addStringOption(option => option.setName('quote').setDescription('What did he say!?!').setRequired(true))
        .addStringOption(option => option.setName('author').setDescription('Who said it?').setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction, client: Client) {
        try {
            const quote = interaction.options.getString('quote', true);
            const author = interaction.options.getString('author', true);
            return await createQuote(quote, author, client);
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    async executeReply(message: Message, client: Client) {
        try {
            if (!message.reference) return "You need to reply to a message to create a quote from it.";
            const repliedToMessage = await message.fetchReference();
            if (!repliedToMessage || !repliedToMessage.content) return "The message you replied to is empty or I can't access it.";

            const quoteText = repliedToMessage.content;
            const authorDisplayName = repliedToMessage.member?.displayName ?? repliedToMessage.author.username;
            return await createQuote(quoteText, authorDisplayName, client);
        } catch (error) {
            return await buildUnknownError(error);
        }
    },
    fullDesc: {
        options: [],
        description: "Adds a Quote to quotes.elmu.dev."
    }
}