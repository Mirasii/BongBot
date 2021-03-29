var urls;
const Discord = require('discord.js');

module.exports = {
    slash: true,
    testOnly: true,
    name: 'clown',
    description: 'finds image of a very funny clown.',
    callback:({}) => {
        return polka();
    },

    urlGen() {
        image();
    },

    message(Message) {
        polkaOld(Message);
    }
}

function image() {

    const cheerio = require('cheerio');
    const request = require('request');

    var options = {
        url: "http://results.dogpile.com/serp?qc=images&q=Omaru%20Polka",
        method: "GET",
        headers: {
            "Accept": "text/html",
            "User-Agent": "Chrome"
        }
    };

    request(options, function (error, response, responseBody) {
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

function polkaOld(Message) {
    const exampleEmbed = new Discord.MessageEmbed().setImage(urls[Math.floor(Math.random() * urls.length)]);

    Message.channel.send(exampleEmbed);
    Message.delete();
}

function polka() {
    const exampleEmbed = new Discord.MessageEmbed().setImage(urls[Math.floor(Math.random() * urls.length)]);
    return exampleEmbed;
}