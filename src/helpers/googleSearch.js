const CALLER = require(`${__dirname}/caller.js`)
const api = require(`${__dirname}/../config/api_config.json`).google;
const { EmbedBuilder } = require('discord.js');

async function searchImage(query) {
    // API endpoint and query parameters
    const endpoint = api.url;
    const params = new URLSearchParams({
        q: query,
        key: api.apikey,
        cx: api.cx,
        searchType: 'image',
        start: Math.floor(Math.random() * 50)
    }).toString();

    try {
        const urls = await CALLER.get(endpoint, '/customsearch/v1', params, {})
            .then(data => { return data.items.map((item) => item.link) });
        if (!urls.length) {
            throw new Error('No images found');
        }
        if (urls.length === 0) {
            await interaction.reply('No images found');
        } else {
            const embed = new EmbedBuilder().setImage(urls[Math.floor(Math.random() * urls.length)]);
            console.log(embed.toJSON());
            const response = {
                embeds: [embed.toJSON()]
            };

            return response;
        }
    } catch (error) {
        console.error(error);
        throw error;
    }

}

module.exports = { searchImage };