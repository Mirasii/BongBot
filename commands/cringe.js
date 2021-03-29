const Discord = require('discord.js');
module.exports = {
    slash: 'both',
    testOnly: true,
    name: 'cringe',
    description: 'sends cringe image',
    callback: ({message}) => {
        if (message) {
            return cringe(message);
        }
        return cringe();
    }
    // execute(Message, Discord){
    //     cringe(Message, Discord);
    // }
}

function cringe(Message) {
    const exampleEmbed = new Discord.MessageEmbed().setImage('https://cdn.discordapp.com/attachments/643509757474504724/783704555942051910/En1TIzSW8AUh7hG.png');

    Message.channel.send(exampleEmbed);
    Message.delete();
}

function cringe() {
    const cringeEmbed = new Discord.MessageEmbed().setImage('https://cdn.discordapp.com/attachments/643509757474504724/783704555942051910/En1TIzSW8AUh7hG.png');

    return cringeEmbed;
}