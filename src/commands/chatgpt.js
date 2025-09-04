const { SlashCommandBuilder } = require('@discordjs/builders');
const CALLER = require(`../helpers/caller.js`);
const EMBED_BUILDER = require(`${__dirname}/../helpers/embedBuilder.js`);
const api = require(`${__dirname}/../config/api_config.json}`).openai;

const MAX_HISTORY_LENGTH = 100;
const botContext = "You are a Discord chatbot AI meant to mimic a Tsundere personality. Messages from different users have the Discord username appended as NAME: before each message in the chat history. You do not need to prefix your messages.";
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
        "model": "gpt-4o",
        "messages": [ {"role": "system","content": botContext}, ...history ]
    }
    const headers = {'Content-Type': 'application/json','Authorization': `Bearer ${api.apikey}`};
    let resp = await CALLER.post(api.url,'/v1/chat/completions', headers, requestData)
                     .then(data => { return data.choices[0].message.content; })
                     .catch(error => { throw new Error(error.message) });
    history.push({"role":"assistant","content":resp});
    chatHistory[serverId] = history;
    return await EMBED_BUILDER.constructEmbedWithRandomFile(resp);
}

function getHistory(message, authorId, serverId){
    let history = chatHistory[serverId] || [];
    if (history.length >= MAX_HISTORY_LENGTH) {
        history.splice(1, 2);
    }
    history.push({"role": "user" ,"content":`${authorId}: ${message}`})
    return history;
}

