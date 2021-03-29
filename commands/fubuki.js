var urls;

module.exports = {
    name: 'fubuki',
    description: 'finds fubuki image',
    urlGen(){
        image();
    },
    
    execute(Message, Discord){
        fubuki(Message, Discord);
    }
}

function image() {

    const cheerio = require('cheerio');
    const request = require('request');

    var options = {
        url: "http://results.dogpile.com/serp?qc=images&q=Shirakami%20Fubuki",
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

function fubuki(Message, Discord) {
    const exampleEmbed = new Discord.MessageEmbed().setImage(urls[Math.floor(Math.random() * urls.length)]);

        Message.channel.send(exampleEmbed);
        Message.delete();
}