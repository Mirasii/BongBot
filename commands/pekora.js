var urls;
const Discord = require('discord.js');

module.exports = {
    slash: true,
    testOnly: true,
    name: 'rabbit',
    description: 'finds image of a bouncy rabbit.',
    callback:({}) => {
        return pekora();
    },

    urlGen(){
        image();
    },
    
    message(Message){
        pekoraOld(Message);
    }
}

function image() {

    const cheerio = require('cheerio');
    const request = require('request');

    var options = {
        url: "http://results.dogpile.com/serp?qc=images&q=Usada%20Pekora",
        method: "GET",
        headers: {
            "Accept": "text/html",
            "User-Agent":"Chrome"
        }
    };

    request(options, function(error, response, responseBody) {
        if (error) {
            console.log(error);
            return;
        }

        $ = cheerio.load(responseBody);
        var links = $(".image a.link");
        urls = new Array(links.length).fill(0).map((v, i) => links.eq(i).attr("href"));

        if (!urls.length) {
            return;
        }
        return;
    })
}

function pekoraOld(Message) {
    const exampleEmbed = new Discord.MessageEmbed().setImage(urls[Math.floor(Math.random() * urls.length)]);

    Message.channel.send(exampleEmbed);
    Message.delete();
}

function pekora() {
    const exampleEmbed = new Discord.MessageEmbed().setImage(urls[Math.floor(Math.random() * urls.length)]);
    return exampleEmbed;
}