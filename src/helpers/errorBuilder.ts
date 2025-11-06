import { MessageFlags, Colors } from 'discord.js';
import type { CommandInteraction } from 'discord.js';
const errorMsg = 'There was an error while executing the "{interaction}" command.';
import LOGGER from './logging.js'
import EMBED_BUILDER from './embedBuilder.js';

async function buildError(interaction: CommandInteraction, error: any) {
    console.error(`Error executing ${interaction?.commandName ?? 'unknown'} command`);
    return await buildErrorHelper(error, errorMsg.replace('{interaction}', interaction?.commandName ?? 'unknown'));

};

async function buildUnknownError(error: any) {
    return await buildErrorHelper(error, 'Leave me alone! I\'m not talking to you! (there was an unexpected error)');
}

async function buildErrorHelper(error: any, errorMessage: string) {
    LOGGER.log(error);
    const returnEmbed = await new EMBED_BUILDER().constructEmbedWithRandomFile(error.message);
    const embed = returnEmbed.embeds[0];
    embed.setTitle(errorMessage)
        .setColor(Colors.Red);
    return { 
        embeds: [embed.toJSON()],
        files: [returnEmbed.files[0]],
        flags: MessageFlags.Ephemeral,
        isError: true
    };
}

export { buildError, buildUnknownError };