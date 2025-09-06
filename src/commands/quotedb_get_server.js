const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const API = require(`${__dirname}/../config/index.js`).apis.quotedb;
const CALLER = require(`${__dirname}/../helpers/caller.js`);
const ERROR_BUILDER = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('get_server_quotes')
        .setDescription('Get Quotes for this server!')
        .addIntegerOption(option => option.setName('number').setDescription('How many quotes do you want?').setRequired(false)),
    async execute(interaction, client) {
        try {
            const number = interaction.options.getInteger('number') || 1;
            if (number > 5) return await ERROR_BUILDER.buildError(interaction, new Error("You can only request up to 5 quotes at a time."));

            const response = await CALLER.get(
                API.url,
                '/api/v1/get_quote',
                `user_id=${interaction.guild.id}&max_quotes=${number}`,
                { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API.apikey}` }
            );
            if (response.length === 0) return await ERROR_BUILDER.buildError(interaction, new Error("No quotes found."));
            const embed = new Discord.EmbedBuilder()
                    .setTitle(`📜 Quotes from ${interaction.guild.name}`)
                    .setColor(Discord.Colors.Purple)
                    .addFields(response.map((quote) => ({
                        name: `*"${quote.quote}"*`,
                        value: `🪶 - ${quote.author}`,
                        inline: false
                    })))
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
