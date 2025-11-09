import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { buildError } from '../helpers/errorBuilder.js';

export default {
    data: new SlashCommandBuilder()
        .setName('usercard')
        .setDescription('Returns an info card for a user')
        .addUserOption(option => option.setName('target').setDescription('Select a user')),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            if (!interaction.inGuild()) {
                return 'This command can only be used in a server.';
            }

            const user = interaction.options.getUser('target') ?? interaction.user;
            const member = await interaction.guild!.members.fetch(user.id);

            const embed = new EmbedBuilder()
                .setTitle(`Info card for ${user.username}`)
                .setColor('#0099ff')
                .setThumbnail(user.displayAvatarURL())
                .addFields(
                    { name: 'User Tag', value: user.tag, inline: true },
                    { name: 'User ID', value: user.id, inline: true },
                    { name: 'Bot?', value: user.bot ? 'Yes' : 'No', inline: true },
                    { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
                    { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:D>`, inline: true },
                    { name: 'Roles', value: member.roles.cache.map(r => r).join(' ') || 'None', inline: false },
                );

            return { embeds: [embed] };
        } catch (error) {
            return await buildError(interaction, error);
        }
    },
};
