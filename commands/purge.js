module.exports = {
    name: 'purge',
    description: 'This entire city must be purged.',
    urlGen(){
        image();
    },

    execute(Message, Discord) {
        const exampleEmbed = new Discord.MessageEmbed().attachFiles(['./files/e89.png']).setImage('attachment://e89.png');
        Message.channel.send(exampleEmbed);
        Message.delete();
    }
}

