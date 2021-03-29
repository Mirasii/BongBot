module.exports = {
    name: 'commands',
    description: 'command runner',
    execute(command, args, bot, msg, Discord, randomFile){
        commands(command, args, bot, msg, Discord, randomFile);
    }
}

function commands(command, args, bot, msg, Discord, randomFile) {
    switch(command){
        
        case 'help':
            msg.channel.send("Mogu Mogu");
            bot.commands.get('help').help(Discord, msg, bot);
            return;

        case 'yubi!':
            msg.channel.send('HACHOO!');
            return;
            
        case 'channel':
            channeldef = bot.commands.get('channelSet').execute(msg, args, bot);
            return;

        case 'arab':
            msg.channel.send({files: ['./files/arab.mp4']}).catch(console.error);
            msg.delete();
            return;

        case 'yes':
            msg.channel.send({files: ['./files/yes.mp4']}).catch(console.error);
            msg.delete();
            return;

        case 'no':
            msg.channel.send({files: ['./files/no.mp4']}).catch(console.error);
            msg.delete();
            return;
        
        case 'dog':
            bot.commands.get('korone').execute(msg, Discord);
            return;

        case 'cat':
            bot.commands.get('okayu').execute(msg, Discord);
            return;

        case 'lion':
            bot.commands.get('botan').execute(msg, Discord);
            return;

        case 'fox':
            bot.commands.get('fubuki').execute(msg, Discord);
            return;

        case 'clown':
            bot.commands.get('polka').execute(msg, Discord);
            return;

        case 'purge':
            bot.commands.get('purge').execute(msg, Discord);
            return;

        case 'rabbit':
            bot.commands.get('pekora').execute(msg, Discord);
            return;

        case 'vape':
            msg.channel.send({files: ['./files/vape.mp4']}).catch(console.error);
            msg.delete();
            return;
        
        case 'poggeth':
            msg.channel.send({files: ['./files/mine_pogethchampion1.mp4']}).catch(console.error);
            msg.delete();
            return;

        case 'dance':
            msg.channel.send({files: ['./files/dog_dance.mp4']}).catch(console.error);
            msg.delete();
            return;

        case 'classic':
            msg.channel.send({files: ['./files/classic.mp4']}).catch(console.error);
            msg.delete();
            return;
        
        case 'funk':
            msg.channel.send({files: ['./files/funk.mp4']}).catch(console.error);
            msg.delete();
            return;

        case 'callirap':
            msg.channel.send({files: ['./files/callirap.mp4']}).catch(console.error);
            msg.delete();
            return;

        case 'roll':
            msg.channel.send({files: ['./files/koroneroll.mp4']}).catch(console.error);
            msg.delete();
            return;        
        
        case 'you':
            bot.commands.get('polka').clown(msg, Discord);
            return;
        
        case 'cringe':
            bot.commands.get('cringe').execute(msg, Discord);
            return;
    
        case 'hoe':
            msg.channel.send({files: ['./files/hoe.mp4']}).catch(console.error);
            msg.delete();
            return;

        case 'gypsy':
            bot.commands.get('gypsy').gypsy(randomFile, msg);
            return;

        case 'hentai':
            msg.channel.send({files: ['./files/Hentai.webm']}).catch(console.error);
            msg.delete();
            return;
        
        case 'mirasi':
            msg.channel.send({files: ['./files/Mirasi.mp4']}).catch(console.error);
            msg.delete();
            return;

        case 'sea':
            msg.channel.send({files: ['./files/SeaChicken.mp4']}).catch(console.error);
            msg.delete();
            return;

        case 'cherry':
            msg.channel.send({files: ['./files/cherry.mp4']}).catch(console.error);
            msg.delete();
            return;

        case 'die':
            msg.channel.send({files: ['./files/die.mp4']}).catch(console.error);
            msg.delete();
            return;

        case 'creeper':
            msg.channel.send({files: ['./files/Creeper.webm']}).catch(console.error);
            msg.delete();
            return;
            
        case 'about':
            bot.commands.get('aboutuser').run(msg, Discord);
            return;

        case 'mute':
            bot.commands.get('mute').mute(msg, args);
            return;

        case 'unmute':
            bot.commands.get('mute').unmute(msg);
            return;

    }
}