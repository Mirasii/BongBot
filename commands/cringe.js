const Discord = require('discord.js');
module.exports = {
    slash: true,
    testOnly: true,
    name: 'cringe',
    description: 'sends cringe image',
    callback: () => {
        return cringe();
    },
    message(Message){
        cringeOld(Message);
    }
}

function cringeOld(Message) {
    const exampleEmbed = new Discord.MessageEmbed().setImage('https://cdn.discordapp.com/attachments/643509757474504724/783704555942051910/En1TIzSW8AUh7hG.png');

    Message.channel.send(exampleEmbed);
    Message.delete();
}

function cringe() {
    const cringeEmbed = new Discord.MessageEmbed().setImage('https://cdn.discordapp.com/attachments/643509757474504724/783704555942051910/En1TIzSW8AUh7hG.png');

    return cringeEmbed;
}