const { MessageFlags, Colors } = require('discord.js');
const errorMsg = 'There was an error while executing the "{interaction}" command.';
const LOGGER = require(`${__dirname}/logging.js`);
const EMBED_BUILDER = require(`${__dirname}/embedBuilder.js`);

async function buildError(interaction, error) {
    console.error(`Error executing ${interaction?.commandName ?? 'unknown'} command`);
    return await buildErrorHelper(error, errorMsg.replace('{interaction}', interaction?.commandName ?? 'unknown'));

};

async function buildUnknownError(error) {
    return await buildErrorHelper(error, 'Leave me alone! I\'m not talking to you! (there was an unexpected error)');
}

async function buildErrorHelper(error, errorMessage) {
    LOGGER.log(error);
    const returnEmbed = await EMBED_BUILDER.constructEmbedWithRandomFile(error.message);
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

module.exports = { buildError, buildUnknownError };