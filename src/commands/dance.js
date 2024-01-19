const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const file = fs.readFileSync('./src/files/dog_dance.mp4');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dance')
        .setDescription('dance!'),
    async execute(interaction, client) {
        try {
            return {
                files: [
                    {
                        attachment: file,
                        name: "dance.mp4"
                    }
                ]
            }
        } catch (error) {
            console.error('dance command failed', error);
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
        description: "Posts a dance!"
    }
}
