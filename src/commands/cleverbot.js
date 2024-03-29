const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');

require('dotenv').config({ path: './BongBot.env' });

const clevapiKey = process.env.CLEVERBOT_API_KEY.trim();
const csMap = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('talk')
        .setDescription('Talk to BongBot!')
        .addStringOption(option => option.setName('input').setDescription('Say something to bongbot!').setRequired(true)),
    async execute(interaction) {
        const userId = interaction.user.id;
        const input = interaction.options.getString('input');
        return await makeCallout(input, userId);
    },
    async executeLegacy(msg) {
        const send = msg.content.replace(/<@!?(\d+)>/g, '').trim();
        const userId = msg.author.id;
        return await makeCallout(send, userId);
    },
    fullDesc: {
        options: [{
            "name":"input",
            "description":"The input you want to send to BongBot, how else are you going to talk to them?"
        }],
        description: "Talk to BongBot! You can also use this command by tagging BongBot, or replying to any message posted by BongBot."
    }
};

async function makeCallout(send, userId) {
    const params = {
        key: clevapiKey,
        input: send,
        cs: csMap.get(userId) || '',
    };
    try {
        const response = await axios.get('http://www.cleverbot.com/getreply', { params });
        const { output, cs } = response.data;
        csMap.set(userId, cs);
        return decodeURIComponent(output);
    } catch (error) {
        console.error(error);
        return "Hmph! I don't feel like talking to you right now, idiot! (An Error occurred)";
    }
}
