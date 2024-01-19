const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const file = fs.readFileSync('./src/files/cringe.png');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cringe')
        .setDescription('cringe!'),
    async execute(interaction, client) {
        try {
            return {
                files: [
                    {
                        attachment: file,
                        name: "cringe.mp4"
                    }
                ]
            }
        } catch (error) {
            console.error('cringe command failed', error);
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
        description: "Posts a cringe!"
    }
}
