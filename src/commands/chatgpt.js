const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, AttachmentBuilder  } = require('discord.js');
const { Configuration, OpenAIApi } = require("openai");
const randomFile = require('select-random-file')
const fs = require('fs');
const path = require('path');
const dir = './src/responses'
const openaiApiKey = process.env.CHATGPT_API_KEY;

const configuration = new Configuration({
    organization: "org-b86iylxzXxKqqDmgjPdC7Tx5",
    apiKey: openaiApiKey,
});
const openai = new OpenAIApi(configuration);

const MAX_HISTORY_LENGTH = 100;
const chatHistory = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('talkgpt')
        .setDescription('Talk to BongBot!')
        .addStringOption(option => option.setName('input').setDescription('Say something to BongBot!').setRequired(true)),
    async execute(interaction) {
        const input = interaction.options.getString('input');
        const authorId = interaction.user.id;

        let history = chatHistory.get(authorId) || [];
        if (history.length >= MAX_HISTORY_LENGTH) {
            // Remove the oldest message if the history is too long
            history.shift();
            history.shift();
        }
        const prompt = history.join('\n');
        const response = await getChatbotResponse(input, prompt);
        console.log(response);
        // Store the conversation history
        history.push(`User: ${input}`, `BongBot: ${response}`);
    
        chatHistory.set(authorId, history);
    
        const embed = new EmbedBuilder()
            .setDescription(response);

        const file = await selectRandomFile(dir);
        if (file) {
            console.log(file);
            var attach = new AttachmentBuilder(`./src/responses/${file}`);
            embed.setThumbnail(`attachment://${file}`);
        }
        
        return { embeds: [embed], files: [attach] };
    },
    fullDesc: {
        options: [{
            "name":"input",
            "description":"The input you want to send to BongBot, how else are you going to talk to them?"
        }],
        description: "Talk to BongBot! talkGPT uses the /completions api from openai to send your message to the davinci model.\nwhen the /chats/ api is available, this will be adapted to become the main ai interaction of bongbot over cleverbot, the ai behind the normal /talk command."
    }
};

async function getChatbotResponse(message, history) {
    const prompt = `Conversation history:\n${history}\nUser message: Pretend you are a young girl with the personality archetype of Tsundere. Reply to the following: "${message}".`;
    const completion = await openai.createCompletion({
        prompt: prompt,
        model: "gpt-3.5-turbo",
        max_tokens: 2000,
        temperature: 0.5,
    });
    var resp = completion.data.choices[0].text.includes(':') ? completion.data.choices[0].text.split(':')[1].trim() : completion.data.choices[0].text;
    return resp;
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
