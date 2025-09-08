const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yes')
        .setDescription('mmm, yes!'),
    async execute(interaction, client) {
        try {
            return {
                files: [
                    {
                        attachment: fs.readFileSync('./src/files/yes.mp4'),
                        name: "yes.mp4"
                    }
                ]
            }
        } catch (error) {
            console.error('Sea command failed', error);
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
        description: "mmm, yes!"
    }
}
