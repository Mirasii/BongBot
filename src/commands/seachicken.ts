import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import fs from 'fs';
import { buildError } from '../helpers/errorBuilder.js';
import { getFilePath } from '../config/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('sea')
        .setDescription('Sea Chicken!'),
    async execute(interaction: CommandInteraction) {
        try {
            return { files: [{ attachment: fs.readFileSync(getFilePath('files/SeaChicken.mp4')), name: "SeaChicken.mp4" }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a Sea Chicken!"
    }
}
