const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { buildError } = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('die')
        .setDescription('die!'),
    async execute(interaction, client) {
        try {
            return { files: [{ attachment: fs.readFileSync('./src/files/die.mp4'), name: "die.mp4" }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a die!"
    }
}
