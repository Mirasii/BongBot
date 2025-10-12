const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { buildError } = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('creeper')
        .setDescription('creeper!'),
    async execute(interaction, client) {
        try {
            return { files: [{ attachment: fs.readFileSync('./src/files/Creeper.webm'), name: "creeper.webm" }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a creeper!"
    }
}
