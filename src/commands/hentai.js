const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const file = fs.readFileSync('./src/files/Hentai.webm');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hentai')
        .setDescription('hentai!'),
    async execute(interaction, client) {
        try {
            return {
                files: [
                    {
                        attachment: file,
                        name: "hentai.mp4"
                    }
                ]
            }
        } catch (error) {
            console.error('hentai command failed', error);
            return {
                type: 4,
                data: {
                    content: 'There was an error while executing this command.',
                    flags: 1 << 6 // set the EPHEMERAL flag
                }
            };
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a hentai!"
    }
}
