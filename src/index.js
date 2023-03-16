const Discord = require('discord.js');
const bot = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages] });

const fs = require('fs');
const token = process.env.DISCORD_API_KEY.trim();
const PREFIX = ']';

const commandFiles = fs.readdirSync('./src/commands/').filter(file => file.endsWith('.js'));

bot.commands = new Discord.Collection(); // Add this line

const commands = [];
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    bot.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

bot.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const command = bot.commands.get(interaction.commandName);
        if (!command) return;

        try {
            const response = await command.execute(interaction, bot); // updated here
            await interaction.reply(response);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

bot.on('messageCreate', async message => {
    if (message.author.bot) return; // Ignore messages from other bots
    if (message?.mentions?.users?.has(`${bot.user.id}`)) {
        // The bot was mentioned, send a response
        try {
            const response = await bot.commands.get('talk').executeLegacy(message, bot);
            await message.reply(response);
        } catch (error) {
            console.error(error);
            await message.reply('Leave me alone! I\'m not talking to you! (there was an error)');
        }
        
    }
});

bot.on('ready', async () => {
    try {
        await bot.application.commands.set(commands);
        console.log('Commands Initiated!');
    } catch (error) {
        console.error(error);
    }
});

bot.login(token);
console.log('BongBot Online!');