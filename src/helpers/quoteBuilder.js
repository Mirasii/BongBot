const { EmbedBuilder, Colors } = require('discord.js');
const API = require(`${__dirname}/../config/index.js`).apis.quotedb;
const CALLER = require(`${__dirname}/caller.js`);
const { buildError } = require(`${__dirname}/errorBuilder.js`);

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

async function getQuote(title, interaction, base, client) {
    const number = interaction.options.getInteger('number') || 1;
    if (number > 5) return await buildError(interaction, new Error("You can only request up to 5 quotes at a time."));
    const server = interaction.options.getBoolean('server');
    const response = await CALLER.get(
        API.url,
        (server === null || server === true) ? 
        `${base}/server/${interaction.guild.id}` : 
        `${base}/user/${API.user_id}`,
        `max_quotes=${number}`,
        { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API.apikey}` }
    );
    if (response?.quotes?.length === 0) return await buildError(interaction, new Error("No quotes found."));
    if (response?.quotes?.length === 1 && title.endsWith('Quotes')) title = title.replace('Quotes', 'Quote');
    return new QuoteBuilder()
            .setTitle(title)
            .addQuotes(response.quotes)
            .build(client);
}

module.exports = { QuoteBuilder, getQuote };