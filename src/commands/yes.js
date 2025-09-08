const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { buildError } = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yes')
        .setDescription('mmm, yes!'),
    async execute(interaction, client) {
        try {
            return { files: [{ attachment: fs.readFileSync('./src/files/yes.mp4'), name: "yes.mp4" }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "mmm, yes!"
    }
}
