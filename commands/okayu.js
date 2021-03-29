var urls;

module.exports = {
    name: 'okayu',
    description: 'finds okayu image',
    urlGen(){
        image();
    },
    
    execute(Message, Discord){
        Okayu(Message, Discord);
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

function Okayu(Message, Discord) {
    const exampleEmbed = new Discord.MessageEmbed().setImage(urls[Math.floor(Math.random() * urls.length)]);

        Message.channel.send(exampleEmbed);
        Message.delete();
}