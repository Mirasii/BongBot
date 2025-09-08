const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { buildError } = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('callirap')
        .setDescription('callirap!'),
    async execute(interaction, client) {
        try {
            return { files: [{ attachment: fs.readFileSync('./src/files/callirap.mp4'), name: "callirap.mp4" }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a callirap!"
    }
}
