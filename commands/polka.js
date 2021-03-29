var urls;

module.exports = {
    name: 'polka',
    description: 'finds polka image',
    urlGen(){
        image();
    },

    execute(Message, Discord){
        polka(Message, Discord);
    },

    clown(Message, Discord) {
        const exampleEmbed = new Discord.MessageEmbed().attachFiles(['./files/clown.jpg']).setImage('attachment://clown.jpg');
        Message.channel.send(exampleEmbed);
        Message.delete();
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

function polka(Message, Discord) {
    const exampleEmbed = new Discord.MessageEmbed().setImage(urls[Math.floor(Math.random() * urls.length)]);

        Message.channel.send(exampleEmbed);
        Message.delete();
}