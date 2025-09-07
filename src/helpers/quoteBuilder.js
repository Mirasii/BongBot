const { EmbedBuilder, Colors } = require('discord.js');

class QuoteBuilder {
    embed;
    constructor() {
        this.embed = new EmbedBuilder();
        return this;
    }

    setTitle(title) {
        this.embed.setTitle(`📜 ${title}`);
        return this;
    }

    addQuotes(quotes) {
        this.embed.addFields(quotes.map((quote) => ({
            name: `*"${quote.quote}"*`,
            value: `🪶 - ${quote.author}`,
            inline: false
        })));
        return this;
    }

    build(client) {
        this.embed.setFooter({ text: `BongBot • Quotes from quotes.elmu.dev`, iconURL: client.user.displayAvatarURL() });
        this.embed.setTimestamp();
        this.embed.setColor(Colors.Purple);
        return { embeds: [this.embed] };
    }
}

module.exports = { QuoteBuilder };