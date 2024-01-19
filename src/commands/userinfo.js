const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('usercard')
        .setDescription('Returns an info card for a user')
        .addUserOption(option => option.setName('target').setDescription('Select a user')),

    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
                const embed = new EmbedBuilder()
            .setTitle(`Info card for ${user.username}`)
            .setColor('#0099ff')
            .setThumbnail(user.avatarURL({ dynamic: true }))
            .addFields(
                { name: 'Username', value: user.username, inline: true },
                { name: 'Discriminator', value: `#${user.discriminator}`, inline: true },
                { name: 'User ID', value: user.id, inline: true },
                { name: 'Account created', value: user.createdAt.toLocaleDateString('en-US'), inline: false },
                {name: 'Join Date', value: new Date(member.joinedAt).toString(), inline: true },
                
            );

        const response = {
            embeds: [embed.toJSON()]
        };
        return response;
    },
};
    // userinfo.bot = userMention.bot;
    // userinfo.createdat = userMention.createdAt;
    // userinfo.discrim = userMention.discriminator;
    // userinfo.id = userMention.id;
    // userinfo.mfa = userMention.mfaEnabled;
    // userinfo.pre = userMention.premium;
    // userinfo.presen = userMention.presence;
    // userinfo.tag = userMention.tag;
    // userinfo.uname = userMention.username;
    // userinfo.verified = userMention.verified;


