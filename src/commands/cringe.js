const { SlashCommandBuilder } = require('@discordjs/builders');
const { EMBED_BUILDER } = require(`${__dirname}/../helpers/embedBuilder.js`);
const { buildError } = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cringe')
        .setDescription('cringe!'),
    async execute(interaction, client) {
        try {
            return await new EMBED_BUILDER().constructEmbedWithImage('cringe.png').build();
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a cringe!"
    }
}
