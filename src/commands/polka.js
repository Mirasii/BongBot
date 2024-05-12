const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const CALLER = require(`../helpers/caller.js`)

async function image() {
    const query = 'Omaru Polka'; // Query for the image search

    // API endpoint and query parameters
    const endpoint = 'https://www.googleapis.com/customsearch/v1';
    const params = new URLSearchParams({
        q: query,
        key: process.env.GOOGLE_API_KEY,
        cx: '70c596884ffe34920',
        searchType: 'image',
        start: Math.floor(Math.random() * 50)
    }).toString();

    try {
        const urls = await CALLER.get(endpoint, null, params, {})
                                .then(data => {return data.items.map((item) => item.link)});
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
        .setName('clown')
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
        options: [],
        description: "Gets a random picture of Omaru Polka, and posts it to the chat."
    }
}
