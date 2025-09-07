const Discord = require('discord.js');
const bot = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.MessageContent] });
const LOGGER = require('./helpers/logging')
const fs = require('fs');
const crypto = require('crypto');
const token = require(`${__dirname}/config/index.js`).discord?.apikey;
const ERROR_BUILDER = require(`${__dirname}/helpers/errorBuilder.js`);
const { generateCard } = require(`${__dirname}/helpers/infoCard.js`);

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
        await interaction.deleteReply();
        await interaction.followUp(await ERROR_BUILDER.buildUnknownError(error));
    }
});

/** respond to messages */
bot.on('messageCreate', async message => {
    if (message?.author?.bot || !message?.mentions?.users?.has(bot.user.id)) return;
    let reply;
    try {
        reply = await message.reply({ content: 'BongBot is thinking...', allowedMentions: { repliedUser: false }});
        const mentionRegex = new RegExp(`<@!?${bot.user.id}>`, 'g');
        const content = message.content.replace(mentionRegex, '').trim();
        let response;
        if (!content) response = await bot.commands.get('create_quote').executeReply(message, bot);
        else response = await bot.commands.get('chat').executeLegacy(message, bot);
        await reply.delete();
        await message.reply(response);
    } catch (error) {
        const errorResp = await ERROR_BUILDER.buildUnknownError(error);
        if (reply) { await reply.delete(); }
        await message.reply(errorResp);
    }   
});

/** set commands on bot ready */
bot.on('clientReady', async () => {
    try {
        await bot.application.commands.set(commands);
        console.log('Commands Initiated!');
        postDeploymentMessage();
        bot.user.setPresence({ activities: [{ 
            name: `with your heart`, 
            type: Discord.ActivityType.Playing
        }], status: 'online' });
    } catch (error) {
        LOGGER.log(error);
    }
});

const postDeploymentMessage = async () => {
    const channel = await bot.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const botMessages = messages.filter(msg => msg.author.id === bot.user.id);
        botMessages?.forEach(message => message.delete());
    } catch (err) {
        console.warn(`Warning: Could not delete messages. The bot might be missing 'Manage Messages' permissions. Error: ${err.message}`);
    }

    // Send the composed embed to the channel.
    const card = await generateCard(bot);
    await channel.send({ embeds: [card] });
};

/** login to bot */
bot.login(token);
console.log('BongBot Online!');
console.log(`sessionId: ${sessionId}`)