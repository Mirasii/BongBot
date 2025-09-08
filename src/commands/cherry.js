const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { buildError } = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cherry')
        .setDescription('cherry!'),
    async execute(interaction, client) {
        try {
            return { files: [{ attachment: fs.readFileSync('./src/files/cherry.mp4'), name: "cherry.mp4" }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a cherry!"
    }
}
