const { SlashCommandBuilder } = require('@discordjs/builders');
const { AttachmentBuilder } = require('discord.js');
const CALLER = require(`${__dirname}/../helpers/caller.js`);
const { EMBED_BUILDER } = require(`${__dirname}/../helpers/embedBuilder.js`);
const api = require(`${__dirname}/../config/index.js`).apis;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const MAX_HISTORY_LENGTH = 100;
const botContext = "You are a Discord chatbot AI meant to mimic a Tsundere personality. Messages from different users have the Discord username appended as NAME: before each message in the chat history. You do not need to prefix your messages.";
const imageDescription = "Anime style, 1980s aesthetic, young woman, blonde hair, medium length hair, large red bow in hair, fair skin, wearing a navy blue blazer with a crest, white collared shirt, red plaid pleated skirt, Tsundere personality. Retro futuristic cityscape background, warm sunset lighting. Vibrant colors, high detail, dynamic composition, cinematic lighting, 4k resolution. Clear face, face focus. If you previously generated an image, generate a new one with a different pose. Return only the image with no text. Make it suitable for a Discord bot embed thumbnail.";
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
        return await executeAI(input, authorId, serverId);
    },
    async executeLegacy(msg) {
        const input = msg.content.replace(/<@!?(\d+)>/g, '').trim();
        const authorId = msg.author.username;
        const serverId =  msg.guild.id;
        return await executeAI(input, authorId, serverId);
    },
    fullDesc: {
        options: [{
            "name":"input",
            "description":"The input you want to send to BongBot, how else are you going to talk to them?"
        }],
        description: "Talk to BongBot! talkGPT uses the /completions api from openai to send your message to the davinci model.\nwhen the /chats/ api is available, this will be adapted to become the main ai interaction of bongbot over cleverbot, the ai behind the normal /talk command."
    }
};

async function executeAI(input, authorId, serverId) {
    if(api.openai.active) return await getChatbotResponse(input, authorId, serverId);
    if(api.googleai.active) return await getGeminiChatbotResponse(input, authorId, serverId);
    return await new EMBED_BUILDER.constructEmbedWithRandomFile("Hmph! Why are you trying to talk to me when no AI service is active?");
}

async function getChatbotResponse(message, authorId, serverId) {
    let history = getHistory(message, authorId, serverId);
    const requestData = {
        "model": api.openai.model,
        "messages": [ {"role": "system","content": botContext}, ...history ]
    }
    const headers = {'Content-Type': 'application/json','Authorization': `Bearer ${api.openai.apikey}`};
    let resp = await CALLER.post(api.openai.url,'/v1/chat/completions', headers, requestData)
                     .then(data => { return data.choices[0].message.content; })
                     .catch(error => { throw new Error(error.message) });
    history.push({"role":"assistant","content":resp});
    chatHistory[serverId] = history;
    return await new EMBED_BUILDER.constructEmbedWithRandomFile(resp);
}

async function getGeminiChatbotResponse(message, authorId, serverId) {
    // Text generation
    const genAI =  new GoogleGenerativeAI(api.googleai.apikey);
    const textModel = genAI.getGenerativeModel({ model: api.googleai.model, systemInstruction: botContext });
    let history = getHistory(message, authorId, serverId);

    const chat = textModel.startChat({
        history: history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        })),
        generationConfig: {
            maxOutputTokens: 2000,
        },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    history.push({ "role": "assistant", "content": text });
    chatHistory[serverId] = history;

    // Image generation
    try {
        const imageModel = genAI.getGenerativeModel({ model: api.googleai.image_model  });
        const imageResult = await imageModel.generateContent(imageDescription);
        const imageResponse = imageResult.response;
        const imagePart = imageResponse.candidates[0].content.parts[0];
        let imageAttachment;
        if (imagePart.inlineData) {
            const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
            imageAttachment = new AttachmentBuilder(imageBuffer, { name: 'tsundere.png' });
        }

        // Create embed
        return new EMBED_BUILDER(imageAttachment).constructEmbedWithAttachment(text, 'tsundere.png');
    } catch (error) {
        console.log("Image generation failed, falling back to random file.", error);
    }

    // Fallback to random file if image generation fails or doesn't return an image
    return await new EMBED_BUILDER().constructEmbedWithRandomFile(text);
}

function getHistory(message, authorId, serverId){
    let history = chatHistory[serverId] || [];
    if (history.length >= MAX_HISTORY_LENGTH) {
        history.splice(1, 2);
    }
    history.push({"role": "user" ,"content":`${authorId}: ${message}`})
    return history;
}
