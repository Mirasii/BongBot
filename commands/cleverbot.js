const Cleverbot = require('cleverbot');
let clev = new Cleverbot({
    key: 'CC97dWy4S58gMOwDlMHXg-qvgSQ' // Can be obtained at http://cleverbot.com/api
});
var csMap = new Map();

module.exports = {
    name: 'cleverbot',
    description: 'channel commands handler',
    async send(msg){
        botMessage(msg);
    }
}

function botMessage(msg) {
    var cs = '';
    if (csMap.has(msg.author.id)){
        cs = csMap.get(msg.author.id);
    }
    var send = msg.content.replace('752902075192442911> ', '');
    send = send.replace('752902075192442911> ', '');
    send = send.replace('<@!', '');
    send = send.replace ('<@','');
    clev.query(send, cs)
    .then(function (response){
        msg.reply(response.output);
        csMap.set(msg.author.id, response.cs);
        return;
    });
    return;
}