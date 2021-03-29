function help(Discord) {
    const exampleEmbed = new Discord.MessageEmbed()
    .setTitle('help')
    .addFields({name:'Commands:', value:'yubi!\narab\nyes\nno\ndog\ncat\nlion\nclown\nrabbit\nvape\ndance\nclassic\nfunk\nyou\nhoe\ngypsy\ncallirap\nroll\nsea\nhentai\nmirasi\ncherry\npoggeth\ndie\ncreeper\ncringe'});
    return exampleEmbed;
}

module.exports = {
    name: 'help',
    description: 'help embed',
    help(Discord, msg){
        embed = help(Discord);
        msg.channel.send(embed);
    }
}