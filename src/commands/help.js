const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Returns an info card for a user')
        .addStringOption(option => option.setName('command').setDescription('Enter a command name').setRequired(false)),
    async execute(interaction, client) {
        var command = interaction.options.getString('command') ? interaction.options.getString('command') : null;
        const embed = new EmbedBuilder().setTitle('Mogu Mogu!');
        console.log('here');
        if (!command) {
            var list = [];
            client.commands.forEach(com => {
                console.log(com.data.name);
                list.push(com.data.name);
            });
            embed.addFields({ name: "commands", value: list.join('\n'), inline: true });
            const response = {
                embeds: [embed.toJSON()]
            };
            return response;
        } else {
            var com = client.commands.get(command);
            if (com.fullDesc) {
                embed.setTitle(command);
                embed.setDescription(com.fullDesc.description);
                var optionList = [];
                for (var option of com.fullDesc.options) {
                    optionList.push(`${option.name}: ${option.description}`);
                }
                if (optionList.length > 0) {
                    embed.addFields({ name: "options", value: optionList.join('\n'), inline: true });
                }
            } else {
                embed.setDescription('descriptive help not yet implemented for ' + command);
            }
            console.log('embed',embed);
            return { embeds: [embed.toJSON()] };
        }
    },
};