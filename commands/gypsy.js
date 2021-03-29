
const dir = './gypsy kid'
module.exports = {
    name: 'gypsy',
    description: 'random gypsy kid video',
    gypsy(randomFile, msg){
        randomFile(dir, (err, file) => {
            msg.channel.send({files: ['./gypsy kid/' + file]}).catch(console.error);
            msg.delete();
        })
    }
}