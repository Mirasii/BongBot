const LOGGER = require(`${__dirname}/logging.js`);

function buildError(interaction, error) {
    console.error(`Error executing ${interaction?.commandName ?? 'unknown'} command`);
    LOGGER.log(error);
    return {
        type: 4,
        data: {
            content: 'There was an error while executing this command.',
            flags: 1 << 6 // set the EPHEMERAL flag
        }
    };
}
module.exports = { buildError };