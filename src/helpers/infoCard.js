const { EmbedBuilder, Colors } = require('discord.js');
const CALLER = require('./caller.js');
const GITHUB_REPO_OWNER = 'Mirasii';
const GITHUB_REPO_NAME = 'BongBot';
let apiResponse;
const timestamp = Math.floor(Date.now() / 1000);

const getRepoInfoFromAPI = async (owner, repo) => {
    const repoApiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const headers = { 'User-Agent': 'Node.js-Deploy-Script' };

    try {
        // 1. Fetch latest release
        const tag = (await CALLER.get(repoApiUrl, '/releases/latest', null, headers))?.tag_name;
        const defaultBranch = process.env.BRANCH ?? 'main';
        // 2. Fetch the latest commit from that default branch
        const latestCommit = (await CALLER.get(repoApiUrl, `/branches/${defaultBranch}`, null, headers))?.commit;
        const commitMessage = latestCommit?.commit?.message?.split('\n')[0];
        return {
            repoUrl: `https://github.com/${owner}/${repo}`,
            branchName: defaultBranch,
            commitUrl: latestCommit?.html_url,
            shortHash: latestCommit?.sha?.substring(0, 7),
            commitMessage,
            tag
        };
    } catch (error) {
        console.warn(`Warning: Could not retrieve info from GitHub API. ${error.message}`);
        return {
            repoUrl: `https://github.com/${owner}/${repo}`,
            branchName: 'N/A',
            commitUrl: `https://github.com/${owner}/${repo}`,
            shortHash: 'N/A',
            commitMessage: 'Could not fetch from API.',
            tag: 'N/A'
        };
    }
};

const generateCard = async (bot) => {
    if (!apiResponse) { apiResponse = await getRepoInfoFromAPI(GITHUB_REPO_OWNER, GITHUB_REPO_NAME); }
    bot['version'] = apiResponse.tag;
    return new EmbedBuilder()
        .setTitle('🤖 BongBot Info Card')
        .setColor(Colors.Purple)
        .setThumbnail(bot.user.displayAvatarURL({ dynamic: true }))
        .setDescription(`**Latest Commit on \`${apiResponse.branchName}\`:**\n>>> [${apiResponse.shortHash} - ${apiResponse.commitMessage}](${apiResponse.commitUrl})`)
        .addFields(
            { name: '📂 Repository', value: `[${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}](${apiResponse.repoUrl})`, inline: false },
            { name: '⏱️ Last Started', value: `<t:${timestamp}:f>`, inline: true },
            { name: '📦 Node.js', value: `${process.versions.node}`, inline: true },
            { name: '📚 Library', value: 'discord.js', inline: true }
        )
        .setFooter({ text: `BongBot • ${process.env.ENV === 'prod' ? apiResponse.tag : 'dev build' }`, iconURL: bot.user.displayAvatarURL() })
        .setTimestamp();
}

module.exports = { generateCard }