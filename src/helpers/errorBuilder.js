const LOGGER = require(`${__dirname}/logging.js`);
const { MessageFlags } = require('discord.js');
const errorMsg = 'There was an error while executing the command ';

function buildError(interaction, error) {
    console.error(`Error executing ${interaction?.commandName ?? 'unknown'} command`);
    LOGGER.log(error);
    return { 
        content: `${errorMsg}${interaction?.commandName ?? 'unknown'}.`,
        flags: MessageFlags.Ephemeral,
        isError: true
    };
};
module.exports = { buildError };