module.exports = {
    name: 'aboutuser',
    description: 'finds botan image',
    run(message, discord){
        const {guild, channel} = message;

        const userMention = message.mentions.users.first() || message.author;
        const member = guild.members.cache.get(userMention.id);

        let userinfo = {};
        userinfo.bot = userMention.bot;
        userinfo.createdat = userMention.createdAt;
        userinfo.discrim = userMention.discriminator;
        userinfo.id = userMention.id;
        userinfo.mfa = userMention.mfaEnabled;
        userinfo.pre = userMention.premium;
        userinfo.presen = userMention.presence;
        userinfo.tag = userMention.tag;
        userinfo.uname = userMention.username;
        userinfo.verified = userMention.verified;

        userinfo.avatar = userMention.avatarURL;
        console.log(userMention);

        // const rolesOfTheMember = memberMention.roles.filter(r => r.name !== '@everyone').map(role => role.name).join(', ')

        var myInfo = new discord.MessageEmbed()
            // .setAuthor(userinfo.uname, userMention.displayAvatarURL())
            .addField("Created At",userinfo.createdat, true)
            .addField("Discriminator",userinfo.discrim, true)
            .addField("Client ID",userinfo.id, true)
            .addField("2FA/MFA Enabled?",userinfo.mfa, true)
            .addField("Paid Account?",userinfo.pre, true)
            .addField("Presence",userinfo.presen, true)
            .addField("Client Tag",userinfo.tag, true)
            .addField("Username",userinfo.uname, true)
            .addField("Joined Server",new Date(member.joinedTimestamp), true)
            .setColor(0xf0e5da)
            .setTitle(userinfo.uname)
            .setThumbnail(userMention.displayAvatarURL());


        message.channel.send(myInfo);

    }
}