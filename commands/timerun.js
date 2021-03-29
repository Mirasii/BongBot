var channel;

module.exports = {
    name: 'timerun',
    description: 'runs time based commands',
    async execute(bot){
        //console.log(channels);
        channels.forEach(channel => { clock(bot, channel); })
    },

    async setList(bot){
        channels = await bot.commands.get('sheet').access().then((value) => {return value});
    }
}

function moon(hour, now, channeldef) {
    if (hour == 7) {
        var lastmoon = new Date('August 16, 2020 19:00:00');
        var Difference_In_Time = now.getTime() - lastmoon.getTime();
        var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
        var nextMoon = 29 - (parseInt(Difference_In_Days) % 29);

        if ( nextMoon == 29) {
            channeldef.send('*As the moon begins to rise east of the clocktower, it is seen to be full and bright.*');

        } else {
            channeldef.send('*As the moon begins to rise east of the clocktower, you reason that the next full moon will be in ' + nextMoon + ' days.*');
        }
    }
}

function bells(minute, hour, now, channeldef) {

                var hourstring = "";
                if(minute === 0) {
                    if (hour > 12) {
                        hour = hour - 12;
    
                        for(i = 0; i < hour; i++) {
                            hourstring = hourstring + "Bong ";
                        }
                        channeldef.send(hourstring);
                        moon(hour, now, channeldef);

    
                    } else {
                        if (hour == 0) { hour = 12;}
                        for(i = 0; i < hour; i++) {
                            hourstring = hourstring + "Bong ";
                        }
                        channeldef.send(hourstring);
                    }
                }
}

function clock(bot, channel) {

    channeldef = bot.channels.cache.get(channel);
    if (channeldef == null) {
        console.log('channel ' + channel + 'not found.');

    } else {
        //console.log(channeldef.name);
        var date = new Date();
        var now =  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
            date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()));

        var minute = now.getMinutes();
        var hour = now.getHours();

        if (now.getMonth() >= 3 && now.getMonth() <= 9) hour = hour +1;

        bells(minute, hour, now, channeldef)
    }
}