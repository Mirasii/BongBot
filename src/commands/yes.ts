import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import fs from 'fs';
import { buildError } from '../helpers/errorBuilder.js';
import { getFilePath } from '../config/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('yes')
        .setDescription('mmm, yes!'),
    async execute(interaction: CommandInteraction) {
        try {
            return { files: [{ attachment: fs.readFileSync(getFilePath('files/yes.mp4')), name: "yes.mp4" }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
}
