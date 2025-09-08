const { SlashCommandBuilder } = require('@discordjs/builders');
const { EMBED_BUILDER } = require(`${__dirname}/../helpers/embedBuilder.js`);
const { buildError } = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('you')
        .setDescription('you!'),
    async execute(interaction, client) {
        try {
            return await new EMBED_BUILDER().constructEmbedWithImage('clown.jpg').addDefaultFooter(client).build();
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a you!"
    }
}
