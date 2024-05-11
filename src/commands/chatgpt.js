const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, AttachmentBuilder  } = require('discord.js');
const randomFile = require('select-random-file')
const CALLER = require(`../helpers/caller.js`)
const dir = './src/responses'
const openaiApiKey = process.env.CHATGPT_API_KEY;

const MAX_HISTORY_LENGTH = 100;
const chatHistory = {};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('talkgpt')
        .setDescription('Talk to BongBot!')
        .addStringOption(option => option.setName('input').setDescription('Say something to BongBot!').setRequired(true)),
    async execute(interaction) {
        const input = interaction.options.getString('input');
        const authorId = interaction.user.username;
        const serverId = interaction.guild_id;
        return await getChatbotResponse(input, authorId, serverId);

    },
    async executeLegacy(msg) {
        const send = msg.content.replace(/<@!?(\d+)>/g, '').trim();
        const userId = msg.author.username;
        const serverId =  msg.guild.id;
        return await getChatbotResponse(send, userId, serverId);
    },
    fullDesc: {
        options: [{
            "name":"input",
            "description":"The input you want to send to BongBot, how else are you going to talk to them?"
        }],
        description: "Talk to BongBot! talkGPT uses the /completions api from openai to send your message to the davinci model.\nwhen the /chats/ api is available, this will be adapted to become the main ai interaction of bongbot over cleverbot, the ai behind the normal /talk command."
    }
};

async function getChatbotResponse(message, authorId, serverId) {
    let history = getHistory(message, authorId, serverId);
    const requestData = {
        "model": "gpt-4",
        "messages": [
            {"role": "system","content": "You are a Discord chatbot AI meant to mimic a Tsundere personality. Messages from different users have the Discord username appended as NAME: before each message in the chat history. You do not need to prefix your messages."},
            ...history
        ]
    }
    const headers = {'Content-Type': 'application/json','Authorization': `Bearer ${openaiApiKey}`};
    let resp = CALLER.post('https://api.openai.com','/v1/chat/completions', headers, requestData)
                     .then(data => { return data.choices[0].message.content; });
    history.push({"role":"assistant","content":resp});
    chatHistory[serverId] = history;
    return await constructEmbed(resp);
}

function getHistory(message, authorId, serverId){
    let history = chatHistory[serverId] || [];
    if (history.length >= MAX_HISTORY_LENGTH) {
        history.splice(1, 2);
    }
    history.push({"role": "user" ,"content":`${authorId}: ${message}`})
    return history;
}

async function constructEmbed(response) {
    const embed = new EmbedBuilder()
    .setDescription(response);
    const file = await selectRandomFile(dir);
    let attach = new AttachmentBuilder(`./src/responses/${file}`);
    embed.setThumbnail(`attachment://${file}`);
    return { embeds: [embed], files: [attach] };
}

async function selectRandomFile(dir) {
    return new Promise((resolve, reject) => {
        randomFile(dir, (err, file) => {
            if (err) {
                reject(err);
            } else {
                resolve(file);
            }
        });
    });
}

