const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

const axios = require('axios');

async function image() {
    const query = 'Omaru Polka'; // Query for the image search

    // API endpoint and query parameters
    const endpoint = 'https://api.bing.microsoft.com/v7.0/images/search';
    const params = {
        q: query,
        count: 50,
        offset: 0,
        safeSearch: 'Moderate', // Modify this parameter as needed
    };

    // Headers containing the API key
    const headers = {
        'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY,
    };

    try {
        const response = await axios.get(endpoint, {
            headers: headers,
            params: params,
        });

        // Extract image URLs from the response
        const urls = response.data.value.map((item) => item.contentUrl);

        if (!urls.length) {
            throw new Error('No images found');
        }

        return urls;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('polka')
        .setDescription('Finds a random polka image'),
    async execute(interaction, client) {
        try {
            const urls = await image();
            if (urls.length === 0) {
                await interaction.reply('No images found');
            } else {
                const exampleEmbed = new EmbedBuilder().setImage(urls[Math.floor(Math.random() * urls.length)]);
                const response = {
                    embeds: [exampleEmbed.toJSON()]
                };
                
                return response;
            }
        } catch (error) {
            console.error('Polka command failed', error);
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
        options: null,
        description: "Gets a random picture of Omaru Polka, and posts it to the chat."
    }
}
