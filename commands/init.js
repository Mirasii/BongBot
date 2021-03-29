module.exports = {
    name: 'init',
    description: 'initialisation and refresh commands for tidyness',

    refresh(bot) {
        bot.commands.get('korone').urlGen();
        bot.commands.get('okayu').urlGen();
        bot.commands.get('botan').urlGen();
        bot.commands.get('polka').urlGen();
        bot.commands.get('pekora').urlGen();
        bot.commands.get('fubuki').urlGen();
    },
    
    init(bot) {
        bot.on("ready", () => {
            bot.commands.get('timerun').setList(bot).then(console.log('channels set for time based nodes'));
            bot.commands.get('channelSet').setList(bot).then(console.log('channels set for channel checker'));
            bot.commands.get('korone').urlGen();
            bot.commands.get('okayu').urlGen();
            bot.commands.get('botan').urlGen();
            bot.commands.get('polka').urlGen();
            bot.commands.get('pekora').urlGen();
            bot.commands.get('fubuki').urlGen();
            console.log('images set');

            console.log(`Logged in as ${bot.user.tag}!`);
            bot.user.setPresence({
                game: {
                    name: 'Use ]help',
                    type: "Playing",
                    url: "https://discordapp.com/"
                }
            });
        });
    }
}
