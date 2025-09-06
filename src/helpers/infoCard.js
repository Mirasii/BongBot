const { EmbedBuilder, Colors } = require('discord.js');
const GITHUB_REPO_OWNER = 'Mirasii';
const GITHUB_REPO_NAME = 'BongBot';
let apiResponse;
const timestamp = Math.floor(Date.now() / 1000);

const getRepoInfoFromAPI = async (owner, repo) => {
    const repoApiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const headers = { 'User-Agent': 'Node.js-Deploy-Script' };

    try {
        // 1. Fetch latest release
        const releaseResponse = await fetch(`${repoApiUrl}/releases/latest`, { headers });
        if (!releaseResponse.ok) throw new Error (`Release fetch failed: ${releaseResponse.statusText}`);
        const tagsData = await releaseResponse.json();
        const tag = tagsData.tag_name;
        const defaultBranch = process.env.BRANCH ?? 'main';
        // 2. Fetch the latest commit from that default branch
        const branchesResponse = await fetch(`${repoApiUrl}/branches/${defaultBranch}`, { headers });
        if (!branchesResponse.ok) throw new Error(`Branches fetch failed: ${branchesResponse.statusText}`);
        const branchesData = await branchesResponse.json();
        const latestCommit = branchesData.commit;
        const commitMessage = latestCommit.commit.message.split('\n')[0]; // Get first line only
        const shortHash = latestCommit.sha.substring(0, 7);

        return {
            repoUrl: `https://github.com/${owner}/${repo}`,
            branchName: defaultBranch,
            commitUrl: latestCommit.html_url,
            shortHash: shortHash,
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