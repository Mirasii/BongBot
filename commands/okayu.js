var urls;
const Discord = require('discord.js');

module.exports = {
    slash: true,
    testOnly: true,
    name: 'cat',
    description: 'finds image of a smug cat.',
    callback:({}) => {
        return Okayu();
    },

    urlGen(){
        image();
    },
    
    message(Message){
        OkayuOld(Message);
    }
}

function image() {

    const cheerio = require('cheerio');
    const request = require('request');

    var options = {
        url: "http://results.dogpile.com/serp?qc=images&q=Nekomata%20Okayu",
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
        return urls;
    })
}

function OkayuOld(Message) {
    const exampleEmbed = new Discord.MessageEmbed().setImage(urls[Math.floor(Math.random() * urls.length)]);

        Message.channel.send(exampleEmbed);
        Message.delete();
}

function Okayu() {
    const exampleEmbed = new Discord.MessageEmbed().setImage(urls[Math.floor(Math.random() * urls.length)]);

    return exampleEmbed;
}