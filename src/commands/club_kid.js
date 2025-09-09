const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { buildError } = require(`${__dirname}/../helpers/errorBuilder.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('club_kid')
        .setDescription('groovy kid in a groovy club!'),
    async execute(interaction, client) {
        try {
            const dir =`${__dirname}/../clubkid`;
            const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.mp4'));
            if (files.length === 0) return await buildError(interaction, new Error('No clubkid videos found.'));
            const choice = files[Math.floor(Math.random() * files.length)];
            return { files: [{ attachment: fs.readFileSync(`${dir}/${choice}`), name: choice }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a video of the club kid dancing. Music may vary :)"
    }
}
