import { EmbedBuilder, Colors, ChatInputCommandInteraction, Client } from 'discord.js';
import type { ExtendedClient } from '../helpers/interfaces.ts';
import { buildError } from '../helpers/errorBuilder.js';
import { apis } from '../config/index.js';
import CALLER from '../helpers/caller.js';

const API = apis.quotedb;

export default class QuoteBuilder {
    private embed: EmbedBuilder;
    constructor() {
        this.embed = new EmbedBuilder();
        return this;
    }

    setTitle(title: string): QuoteBuilder {
        this.embed.setTitle(`📜 ${title}`);
        return this;
    }

    addQuotes(quotes: { quote: string, author: string }[]): QuoteBuilder {
        this.embed.addFields(quotes.map((quote) => ({
            name: `*"${quote.quote}"*`,
            value: `🪶 - ${quote.author}`,
            inline: false
        })));
        return this;
    }

    build(client: ExtendedClient): { embeds: [EmbedBuilder] } {
        this.embed.setFooter({ text: `BongBot • Quotes from quotes.elmu.dev`, iconURL: client.user?.displayAvatarURL() });
        this.embed.setTimestamp();
        this.embed.setColor(Colors.Purple);
        return { embeds: [this.embed] };
    }

    async getQuote(basePath: string, title: string, client: Client, interaction: ChatInputCommandInteraction) {
        const number = interaction.options.getInteger('number') ?? 1;
        const server = interaction.options.getBoolean('server');
        if (number > 5) return await buildError(interaction, new Error("You can only request up to 5 quotes at a time."));
        const extension = server === null || server === true ? `server/${interaction?.guild?.id}` : `user/${API.user_id}`
        const response = await CALLER.get(
            API.url,
            `${basePath}/${extension}`,
            `max_quotes=${number}`,
            { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API.apikey}` },
        );
        if (response?.quotes?.length === 0) return await buildError(interaction, new Error("No quotes found."));
        return this.setTitle(title).addQuotes(response.quotes).build(client);
    }
}