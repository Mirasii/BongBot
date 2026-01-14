import { Client, GatewayIntentBits, Collection, ActivityType } from 'discord.js';
import type { Message, MessageReplyOptions, InteractionReplyOptions, CommandInteraction, Interaction, ApplicationCommandDataResolvable } from 'discord.js';
import type { ExtendedClient } from './helpers/interfaces.ts';
import LOGGER from './helpers/logging.js';
import crypto from 'crypto';
import config, { validateRequiredConfig } from './config/index.js';
import { buildUnknownError } from './helpers/errorBuilder.js';
import { generateCard } from './helpers/infoCard.js';
import buildCommands from './commands/buildCommands.js';
import TikTok from './commands/naniko.js';

// Validate required environment variables early to fail fast
validateRequiredConfig();

let tiktok_client;
const token: string = config.discord.apikey!;
const bot: ExtendedClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

/** set up logging */
const sessionId = crypto.randomUUID();
LOGGER.init(sessionId);
const commands: Array<ApplicationCommandDataResolvable> = buildCommands(bot);

/** respond to slash commands */
bot.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isCommand()) { return; }
    interaction as CommandInteraction;

    try {
        const command = bot.commands!.get(interaction.commandName);
        if (!command) return;
        await interaction.deferReply({ ephemeral: command.ephemeralDefer || false });
        const response = await command.execute(interaction, bot); 
        if (response?.isError === true && interaction.replied) { 
            await interaction.deleteReply(); 
        }
        const message = await interaction.followUp(response);
        if (command && 'setupCollector' in command) {
            await (command as any).setupCollector(interaction, message);
        }
    } catch (error) {
        if (interaction.replied) { await interaction.deleteReply(); }
        await interaction.followUp(await buildUnknownError(error) as InteractionReplyOptions);
    }
});

/** respond to messages */
bot.on('messageCreate', async (message: Message) => {
    if (message!.author!.bot || !message!.mentions?.users!.has(bot.user!.id)) return;
    let reply;
    try {
        reply = await message.reply({ content: 'BongBot is thinking...', allowedMentions: { repliedUser: false }});
        const mentionRegex = new RegExp(`<@!?${bot.user!.id}>`, 'g');
        const content = message.content.replace(mentionRegex, '').trim();
        let response;
        if (!content) response = await bot.commands!.get('create_quote')!.executeReply(message, bot);
        else response = await bot.commands!.get('chat')!.executeLegacy(message, bot);
        await reply.delete();
        await message.reply(response);
    } catch (error) {
        const errorResp = await buildUnknownError(error);
        if (reply) { await reply.delete(); }
        await message.reply(errorResp as MessageReplyOptions);
    }   
});

/** set commands on bot ready */
bot.on('clientReady', async () => {
    try {
        await bot.application!.commands.set(commands);
        bot.user!.setPresence({ activities: [{ 
            name: `with your heart`, 
            type: ActivityType.Playing
        }], status: 'online' });
        console.log('Commands Initiated!');
        await postDeploymentMessage();
        tiktok_client = new TikTok(bot, LOGGER);
    } catch (error) {
        LOGGER.log(error);
    }
});

const postDeploymentMessage = async () => {
    if (!process.env.DISCORD_CHANNEL_ID) { LOGGER.log('DISCORD_CHANNEL_ID not set'); return; }
    const channel = await bot.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;
    if (!('send' in channel && typeof channel.send === 'function')) return;
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const botMessages = messages.filter((msg: Message) => msg.author.id === bot.user!.id);
        botMessages?.forEach((message: Message) => message.delete());
    } catch (err: any) {
        console.warn(`Warning: Could not delete messages. The bot might be missing 'Manage Messages' permissions. Error: ${err.message}`);
    }
    // Send the composed embed to the channel.
    const card = await generateCard(bot);
    await channel.send({ embeds: [card] });
    
};

/** login to bot */
bot.login(token);
console.log('BongBot Online!');
console.log(`sessionId: ${sessionId}`);