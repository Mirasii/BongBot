import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import { buildError } from '../helpers/errorBuilder.js';
import { getFilePath } from '../config/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('dance')
        .setDescription('dance!'),
    async execute(interaction: CommandInteraction) {
        try {
            return { files: [{ attachment: fs.readFileSync(getFilePath('files/dance.mp4')), name: "dance.mp4" }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a dance!"
    }
}
