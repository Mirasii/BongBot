import type { Message, MessageReplyOptions } from 'discord.js';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import { validateRequiredConfig } from './config/index.js';
import { buildUnknownError } from './helpers/errorBuilder.js';
import buildCommands from './commands/buildCommands.js';
import TikTok from './commands/naniko.js';
import { startWithFunctions } from '@pookiesoft/bongbot-core';

let tiktok_client: TikTok;
/** initialise shared bot code */
const bot: ExtendedClient = await startWithFunctions('PookieSoft', 'BongBot', buildCommands, ['setupCollector']);

/** needed as additional config not in -core */
validateRequiredConfig();
bot.on('clientReady', () => {
    tiktok_client = new TikTok(bot, bot.logger as any);
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