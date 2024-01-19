const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const file = fs.readFileSync('./src/files/SeaChicken.mp4');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sea')
        .setDescription('Sea Chicken!'),
    async execute(interaction, client) {
        try {
            return {
                files: [
                    {
                        attachment: file,
                        name: "SeaChicken.mp4"
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
        description: "Posts a Sea Chicken!"
    }
}
