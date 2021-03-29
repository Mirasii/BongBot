const Discord = require('discord.js');
module.exports = {
    slash: true,
    testOnly: true,
    name: 'you',
    description: 'displays what you are to everyone.',
    callback:({}) => {
        return clown();
    },

    urlGen(){
        image();
    },
    
    message(Message){
        clownOld(Message);
    }
}

function clownOld(Message) {
    const exampleEmbed = new Discord.MessageEmbed()
        .attachFiles(['./files/clown.jpg'])
        .setImage('attachment://clown.jpg');
    Message.channel.send(exampleEmbed);
    console.log(exampleEmbed);
    Message.delete();
}

function clown() {
    const exampleEmbed = new Discord.MessageEmbed()
        .attachFiles(['./files/clown.jpg'])
        .setImage('attachment://clown.jpg');
    return exampleEmbed;
}