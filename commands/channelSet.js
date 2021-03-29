var channelist;
module.exports = {
    name: 'channelSet',
    description: 'channel commands handler',
    async execute(message, args, bot){

        if (args [1] != "check") {
            var channeldef;
            check = bot.channels.cache.get(args[1]);
            if (check == undefined) {
                message.channel.send("channel not found");

            } else {
                channeldef=bot.channels.cache.get(args[1]);
                await bot.commands.get('sheet').add(channeldef)
                message.channel.send('channel set to ' + channeldef.name +'!');
                bot.commands.get('timerun').setList(bot).then(console.log('channels updated'));
            }
        } else {
            
            var found = false;
            for (var i = 0; i < channelist.length; i++ ) {
                channeldef = bot.channels.cache.get(channelist[i]);
                if (channeldef == null || channeldef == "channel not found") {
                    //pass
                } else if (message.guild.id == channeldef.guild.id) {
                    message.channel.send('current channel is ' + channeldef.name + '!');
                    found = true;
                }
            }
            if (found == false) {
                message.channel.send('Channel is undefined!');
            }
        }
    },
    async setList(bot){
        channelist = await bot.commands.get('sheet').access().then((value) => {return value});
    }
}