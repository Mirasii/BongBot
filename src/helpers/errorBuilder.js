const LOGGER = require(`${__dirname}/logging.js`);
const { MessageFlags, EmbedBuilder, Colors } = require('discord.js');
const errorMsg = 'There was an error while executing the "{interaction}" command.';

function buildError(interaction, error) {
    console.error(`Error executing ${interaction?.commandName ?? 'unknown'} command`);
    LOGGER.log(error);
    const embed = new EmbedBuilder()
            .setTitle(errorMsg.replace('{interaction}', interaction?.commandName ?? 'unknown'))
            .setColor(Colors.Red)
            .setDescription(error.message ?? 'No additional information provided.');
    return { 
        embeds: [embed.toJSON()],
        flags: MessageFlags.Ephemeral,
        isError: true
    };
};
module.exports = { buildError };