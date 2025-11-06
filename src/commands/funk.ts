import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import fs from 'fs';
import { buildError } from '../helpers/errorBuilder.js';
import { getFilePath } from '../config/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('funk')
        .setDescription('funk!'),
    async execute(interaction: CommandInteraction) {
        try {
            return { files: [{ attachment: fs.readFileSync(getFilePath('files/funk.mp4')), name: "funk.mp4" }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a funk!"
    }
}
