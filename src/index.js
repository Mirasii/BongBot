const Discord = require('discord.js');
const bot = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages] });
const LOGGER = require('./helpers/logging')
const fs = require('fs');
const crypto = require('crypto');

const token = process.env.DISCORD_API_KEY.trim();
const errorMsg = 'Leave me alone! I\'m not talking to you! (there was an error)';

/** set up logging */
const sessionId = crypto.randomUUID();
LOGGER.init(sessionId);

/** import commands */
const commandFiles = fs.readdirSync('./src/commands/').filter(file => file.endsWith('.js'));
bot.commands = new Discord.Collection();
const commands = [];
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    bot.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

/** respond to slash commands */
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) { return; }
    const command = bot.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await interaction.deferReply();
        const response = await command.execute(interaction, bot); 
        await interaction.followUp(response);
    } catch (error) {
        LOGGER.log(error);
        await interaction.followUp({content: errorMsg, ephemeral: true});
    }
});

/** respond to messages */
bot.on('messageCreate', async message => {
    if (message.author.bot) return; // Ignore messages from other bots
    if (!message?.mentions?.users?.has(`${bot.user.id}`)) { return; }
    try {
        const response = await bot.commands.get('talkgpt').executeLegacy(message, bot);
        await message.reply(response);
    } catch (error) {
        LOGGER.log(error);
        await message.reply({content: errorMsg, ephemeral: true});
    }   
});

/** set commands on bot ready */
bot.on('ready', async () => {
    try {
        await bot.application.commands.set(commands);
        console.log('Commands Initiated!');
    } catch (error) {
        LOGGER.log(error);
    }
});

/** login to bot */
bot.login(token);
console.log('BongBot Online!');
console.log(`sessionId: ${sessionId}`)