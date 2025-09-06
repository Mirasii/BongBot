const { SlashCommandBuilder } = require('@discordjs/builders');
const { generateCard } = require(`${__dirname}/../helpers/infoCard.js`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Get BongBot Info Card'),
    async execute(interaction, client) {
        try {
            const embed = await generateCard(client);
            return { embeds: [embed] };
        } catch (error) {
            return await ERROR_BUILDER.buildError(interaction, error);
        }
    },
    fullDesc: {
        options: [],
        description: "Get Infocard for BongBot"
    }
}