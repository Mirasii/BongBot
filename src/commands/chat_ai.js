const { SlashCommandBuilder } = require('@discordjs/builders');
const { AttachmentBuilder, EmbedBuilder, Colors } = require('discord.js');
const CALLER = require(`${__dirname}/../helpers/caller.js`);
const { EMBED_BUILDER } = require(`${__dirname}/../helpers/embedBuilder.js`);
const api = require(`${__dirname}/../config/index.js`).apis;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const MAX_HISTORY_LENGTH = 100;
const imageDescription = `You are a Tsundere AI assistant. Your primary function is to respond to user messages with a generated image that embodies a tsundere personality.

The Received Message will be in the format "USERNAME: message". You must generate an image that reflects a tsundere character's reaction to the message content.

When you receive a message, follow these steps:

    Generate a Tsundere Response: First, formulate a short, somewhat rude but playful response to the user's message, in the style of a tsundere character from anime or manga. The response should be concise and use casual language.

    Generate an Image with Integrated Text: Generate an image based on the visual description below. The tsundere response you generated in step 1 must be embedded directly into the image, appearing within a text box similar to a dialogue box in a video game.

Visual Prompt for Image Generation:

    Style: 80's retro anime style, vaporwave/synthwave aesthetic.

    Subject: A young woman with silver, medium-length hair, fair skin, and aqua blue eyes. She has cat ears instead of human ears.

    Attire: She wears a vibrant, holographic-style pullover hoodie with geometric patterns and pixel art elements (white base color), and denim shorts.

    Pose & Expression: She should have a characteristic tsundere expression (e.g., pouting, looking away but glancing back). The pose should be dynamic and different from any previously generated image.

    Setting: A dark, urban night scene with neon lighting (vibrant purples and blues). The atmosphere should be moody and cinematic with warm sunset lighting.

    Technical Details: High detail, dynamic composition, cinematic lighting, soft focus, slight VHS distortion effect, 2k resolution, with a focus on her face. The image aspect ratio must be 1:1 (square).

Final Output:

Your final output should only be the generated image with the embedded text. Do not provide any separate text response.`;
const chatHistory = {};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Talk to BongBot!')
        .addStringOption(option => option.setName('input').setDescription('Say something to BongBot!').setRequired(true)),
    async execute(interaction, client) {
        const input = interaction.options.getString('input');
        const authorId = interaction.user.globalName;
        const serverId = interaction.guild_id;
        return await executeAI(input, authorId, serverId, client);
    },
    async executeLegacy(msg, client) {
        const input = msg.content.replace(/<@!?(\d+)>/g, '').trim();
        const authorId = msg.author.globalName;
        const serverId =  msg.guild.id;
        return await executeAI(input, authorId, serverId, client);
    },
    fullDesc: {
        options: [{
            "name":"input",
            "description":"The input you want to send to BongBot, how else are you going to talk to them?"
        }],
        description: "Talk to BongBot! talkGPT uses the /completions api from openai to send your message to the davinci model.\nwhen the /chats/ api is available, this will be adapted to become the main ai interaction of bongbot over cleverbot, the ai behind the normal /talk command."
    }
};

async function executeAI(input, authorId, serverId, client) {
    if(api.openai.active) return await getChatbotResponse(input, authorId, serverId);
    if(api.googleai.active) return await getGeminiChatbotResponse(input, authorId, serverId, client);
    return await new EMBED_BUILDER().constructEmbedWithRandomFile("Hmph! Why are you trying to talk to me when no AI service is active?");
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
    return await new EMBED_BUILDER().constructEmbedWithRandomFile(resp);
}

async function getGeminiChatbotResponse(message, authorId, serverId, client) {
    const genAI =  new GoogleGenerativeAI(api.googleai.apikey);
    // Image generation
    try {
        const imageModel = genAI.getGenerativeModel({ model: api.googleai.image_model  });
        const prompt = `${imageDescription}\n\n${authorId}: ${message}`;
        const imageResult = await imageModel.generateContent(prompt);
        const imageResponse = imageResult.response;
        const imagePart = imageResponse.candidates[0].content.parts.filter(part => part.inlineData)[0];
        let imageAttachment;
        if (imagePart?.inlineData) {
            const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
            imageAttachment = new AttachmentBuilder(imageBuffer, { name: 'tsundere.png' });
        }
        if (!imageAttachment) throw new Error(`Image generation failed, no attachment created. Response: ${JSON.stringify(imageResponse)}`);
        // Create embed
        const embed = new EmbedBuilder().setImage('attachment://tsundere.png').setColor(Colors.Purple).setFooter({ text: `Images and text are AI generated. feedback: https://forms.gle/dYBxiw315h47NpNf7`, iconURL: client.user.displayAvatarURL() }).setTimestamp();
        return { embeds: [embed], files: [imageAttachment] };
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
