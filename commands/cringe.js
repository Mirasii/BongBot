module.exports = {
    name: 'cringe',
    description: 'sends cringe image',
    
    execute(Message, Discord){
        cringe(Message, Discord);
    }
}


function cringe(Message, Discord) {
    const exampleEmbed = new Discord.MessageEmbed().setImage('https://cdn.discordapp.com/attachments/643509757474504724/783704555942051910/En1TIzSW8AUh7hG.png');

        Message.channel.send(exampleEmbed);
        Message.delete();
}