import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../helpers/interfaces.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Returns an list of commands or options for a user')
        .addStringOption(option => option.setName('command').setDescription('Enter a command name').setRequired(false)),
    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
        let command = interaction.options.getString('command') ? interaction.options.getString('command') : null;
        const embed = new EmbedBuilder().setTitle('Mogu Mogu!');
        if (!command) {
            let list: string[] = [];
            client.commands!.forEach(com => list.push(com.data.name));
            embed.addFields({ name: "commands", value: list.join('\n'), inline: true });
            const response = { embeds: [embed.toJSON()] };
            return response;
        } 
        let com = client.commands!.get(command);
        if (!com.fullDesc) {
            embed.setDescription('descriptive help not yet implemented for ' + command);
            return { embeds: [embed.toJSON()] };
        }
        embed.setTitle(command);
        embed.setDescription(com.fullDesc.description);
        let optionList: string[] = [];
        com.fullDesc.options.forEach((option: { name: string, description: string }) => optionList.push(`${option.name}: ${option.description}`));
        if (optionList.length > 0) {
            embed.addFields({ name: "options", value: optionList.join('\n'), inline: true });
        }
        return { embeds: [embed.toJSON()] }
        
    },
};