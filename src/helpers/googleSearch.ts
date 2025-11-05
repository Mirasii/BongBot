import { EmbedBuilder } from 'discord.js';
import { get } from './caller';
import { config } from '../config/index';
const api = config.apis.google;

export async function searchImage(query: string) {
    // API endpoint and query parameters
    const endpoint = api.url;
    const params = new URLSearchParams({
        q: query,
        key: api.apikey!,
        cx: api.cx!,
        searchType: 'image',
        start: Math.floor(Math.random() * 50).toString()
    }).toString();

    try {
        const urls = await get(endpoint, '/customsearch/v1', params, {})
            .then(data => { return data.items.map((item: { link: string }) => item.link) });
        if (!urls.length) {
            throw new Error('No images found');
        }
        const url = urls[Math.floor(Math.random() * urls.length)]
        const embed = new EmbedBuilder().setImage(url).setDescription(url);
        const response = {
            embeds: [embed.toJSON()]
        };
        return response;
    } catch (error) {
        console.error(error);
        throw error;
    }

}