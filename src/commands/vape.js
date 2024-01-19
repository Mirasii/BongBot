const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const file = fs.readFileSync('./src/files/vape.mp4');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vape')
        .setDescription('Vape Nic'),
    async execute(interaction, client) {
        try {
            return {
                files: [
                    {
                        attachment: file,
                        name: "vape.mp4"
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
        description: "Vape Nic...\nSuck Dick!"
    }
}
