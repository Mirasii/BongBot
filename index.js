const randomFile = require('select-random-file')
const Discord = require('discord.js');
const bot = new Discord.Client();
const fs = require('fs');
const token = 'NzUyOTAyMDc1MTkyNDQyOTEx.X1eYsg.zbFKJaPteRjI1KDQTdof_VddbrE';
const PREFIX = ']';

var hornyCD = new Map();
var aiCD = new Map();
bot.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    bot.commands.set(command.name, command);
}


const sheetFiles = fs.readdirSync('./google-sheets-node').filter(file => file.endsWith('.js'));
for (const file of sheetFiles) {
    const command = require(`./google-sheets-node/${file}`);
    bot.commands.set(command.name, command);
}

bot.commands.get('init').init(bot);

bot.on('message', msg => {

    if (msg.content === "HELLO") {
        msg.reply("Yubi yubi!")
    }

    // if (msg.content === "a") {
    //     msg.channel.send({files: ['./files/a.mp4']}).catch(console.error);
    // }
    const lower = msg.content.toLowerCase();


    if (lower.includes('752902075192442911>')){

        if(aiCD.has(msg.guild.id)){
            if (aiCD.get(msg.guild.id) == 'false'){
                aiCD.set(msg.guild.id, 'true');
                bot.commands.get('cleverbot').send(msg);
                setTimeout(function() {
                    aiCD.set(msg.guild.id, 'false');
                }, 30000);
            }
        } else {
            bot.commands.get('cleverbot').send(msg);
            setTimeout(function() {
                aiCD.set(msg.guild.id, 'false');
            }, 30000);
        }
            //AI api code.
    }
    
    if ((lower.includes('cum') && !(lower.includes('scummy')) && !(lower.includes('circum')))
    || lower.includes('milkies') || lower.includes('mummy')|| lower.includes('mommy') || lower.includes('daddy')
    || lower.includes('cock') || lower.includes('boob')) {
        if (!msg.channel.nsfw){

            if(hornyCD.has(msg.guild.id)){

                if (hornyCD.get(msg.guild.id) == 'false'){
                    hornyCD.set(msg.guild.id, 'true');
                    msg.reply('BONK! Go to horny jail!', {files: ['./files/tkeejg7aepm51.jpg']});
                    setTimeout(function() {
                        hornyCD.set(msg.guild.id, 'false');
                    }, 120000);
                }
            } else {
                hornyCD.set(msg.guild.id, 'true');
                msg.reply('BONK! Go to horny jail!', {files: ['./files/tkeejg7aepm51.jpg']});

                setTimeout(function() {
                    hornyCD.set(msg.guild.id, 'false');
                }, 120000);
            }
        }
    }

    if (msg.author.bot || !msg.content.startsWith(PREFIX)) return;
    const command = msg.content.slice(PREFIX.length).split(/ +/).shift().toLowerCase();
    let args = msg.content.substring(PREFIX.length).split(' ');

    bot.commands.get('commands').execute(command, args, bot, msg, Discord, randomFile);
    
})

var schedule = require('node-schedule');
const { TIMEOUT } = require('dns');
var rule = new schedule.RecurrenceRule();
rule.minute = 00;
var j = schedule.scheduleJob(rule, function(){
    bot.commands.get('init').refresh(bot);
});

bot.login(token);