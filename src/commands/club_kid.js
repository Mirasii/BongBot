const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { buildError } = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('club_kid')
        .setDescription('groovy kid in a groovy club!'),
    async execute(interaction, client) {
        try {
            let dirLength = fs.readdirSync('./src/clubkid').length;
            let num = Math.floor(Math.random() * dirLength) + 1;
            return { files: [{ attachment: fs.readFileSync(`./src/clubkid/kid${num}.mp4`), name: `kid${num}.mp4` }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a video of the club kid dancing. Music may vary :)"
    }
}
