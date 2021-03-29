const ms = require('ms');
module.exports = {
    name: 'mute',
    description: 'mute/unmute functions',
    mute(message, args) {
        mute(message, args);
    },

    unmute(message) {
        unmute(message);
    }
}

function mute(message, args) {
    if (message.member.hasPermission('BAN_MEMBERS')) {
        try {
            let user = message.mentions.users.first();
            if (!user) {
                message.channel.send(`There's no person to mute tho`);
            }

            try {
                member = message.guild.member(user);
            } catch (err) {
                member = null;
            }

            if (!member) {
                message.channel.send(`There's no person to mute tho`);
            }
            if (member.hasPermission('BAN_MEMBERS')) {
                return message.channel.send(`I can't mute ${user} because they are staff`);
            }


            message.guild.channels.cache.forEach(f => {
                f.updateOverwrite(
                    user.id,
                    {
                        'SEND_MESSAGES': false
                    });

            });
            message.channel.send(`I muted ${user}`);

            if (args.includes('-t')) {
                var timeout = 0;
                for (var i = args.indexOf('-t'); i < args.length; i++) {
                    if (/[ydhsm]$/.test(args[i])) {
                        timeout += ms(args[i]);
                    }
                }
                setTimeout(function () {
                    message.guild.channels.cache.forEach(f => {
                        f.permissionOverwrites.get(user.id);
                        if (f.permissionOverwrites.get(user.id) != undefined ){
                            f.permissionOverwrites.get(user.id).delete();
                        }
                    });
                    console.log('timeout complete');
                }, timeout);
            } else {
                return;
            }
        } catch (error) {
            console.log(error);
            message.channel.send(error);
        }
    }
}

function unmute(message) {
    if (message.member.hasPermission('BAN_MEMBERS')) {
        try {
            let user = message.mentions.users.first();
            if (!user) {
                message.channel.send(`There's no person to mute tho`);
            }

            try {
                member = message.guild.member(user);
            } catch (err) {
                member = null;
            }
            if (!member) {
                message.channel.send(`There's no person to unmute tho`);
            }
            if (member.hasPermission('BAN_MEMBERS')) {
                return message.channel.send(`I can't unmute ${user} because they are staff`);
            }
            message.guild.channels.cache.forEach(f => {
                f.permissionOverwrites.get(user.id).delete();
            });

            message.channel.send(`Unmuted ${user}`);
        } catch (error) {
            console.log(error);
            message.channel.send(error);
        }

    }
}