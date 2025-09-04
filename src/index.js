const Discord = require('discord.js');
const bot = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages] });
const LOGGER = require('./helpers/logging')
const fs = require('fs');
const crypto = require('crypto');
const token = require('./config/discord_config.json').api_key;
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
    try {
        if (!interaction.isCommand()) { return; }
        const command = bot.commands.get(interaction.commandName);
        if (!command) return;
        await interaction.deferReply();
        const response = await command.execute(interaction, bot); 
        if (response?.isError === true) { await interaction.deleteReply(); }
        await interaction.followUp(response);
    } catch (error) {
        LOGGER.log(error);
        await interaction.followUp({content: errorMsg, flags: Discord.MessageFlags.Ephemeral});
    }
});

/** respond to messages */
bot.on('messageCreate', async message => {
    try {
        if (message.author.bot) return; // Ignore messages from other bots
        if (!message?.mentions?.users?.has(`${bot.user.id}`)) { return; }
        const response = await bot.commands.get('talkgpt').executeLegacy(message, bot);
        await message.reply(response);
    } catch (error) {
        LOGGER.log(error);
        await message.reply({content: errorMsg, flags: Discord.MessageFlags.Ephemeral});
    }   
});

/** set commands on bot ready */
bot.on('clientReady', async () => {
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