var urls;

module.exports = {
    name: 'korone',
    description: 'finds korone image',
    urlGen(){
        image();
    },
    
    execute(Message, Discord){
        korone(Message, Discord);
    }
}

function image() {

    const cheerio = require('cheerio');
    const request = require('request');

    var options = {
        url: "http://results.dogpile.com/serp?qc=images&q=Korone%20Inugami",
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

function korone(Message, Discord) {
    const exampleEmbed = new Discord.MessageEmbed().setImage(urls[Math.floor(Math.random() * urls.length)]);

        Message.channel.send(exampleEmbed);
        Message.delete();
}