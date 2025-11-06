import { SlashCommandBuilder } from '@discordjs/builders';
import fs from 'fs';
import { buildError } from '../helpers/errorBuilder.js';
import { CommandInteraction } from 'discord.js';
import { getFilePath } from '../config/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('callirap')
        .setDescription('callirap!'),
    async execute(interaction: CommandInteraction) {
        try {
            return { files: [{ attachment: fs.readFileSync(getFilePath('files/callirap.mp4')), name: "callirap.mp4" }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Posts a callirap!"
    }
}
