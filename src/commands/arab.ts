import { SlashCommandBuilder } from '@discordjs/builders';
import fs from 'fs';
import { buildError } from '../helpers/errorBuilder.js';
import { CommandInteraction } from 'discord.js';
import config from '../config/index.js';
const file_root = config.media.file_root;

export default {
    data: new SlashCommandBuilder()
        .setName('arab')
        .setDescription('Mash\'allah'),
    async execute(interaction: CommandInteraction) {
        try {
            return { files: [{ attachment: fs.readFileSync(`${file_root}/files/arab.mp4`), name: "arab.mp4" }] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Praise unto you, my friend"
    }
}
