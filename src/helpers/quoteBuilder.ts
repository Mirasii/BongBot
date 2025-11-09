import { EmbedBuilder, Colors } from 'discord.js';
import type { ExtendedClient } from '../helpers/interfaces.ts';

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
}