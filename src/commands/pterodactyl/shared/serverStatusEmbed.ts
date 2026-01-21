import { EmbedBuilder } from 'discord.js';
import { PterodactylServer, ServerResources } from './pterodactylApi.js';

export function buildServerStatusEmbed(servers: PterodactylServer[], resources: (ServerResources | null)[], description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎮 Game Server Status')
        .setTimestamp();

    if (description) {
        embed.setDescription(description);
    }

    servers.forEach((server, index) => {
        embed.addFields({
            name: server.attributes.name,
            value: formatServerField(resources[index]),
            inline: false,
        });
    });

    return embed;
}

function formatServerField(resource: ServerResources | null): string {
    const state = resource?.attributes.current_state || 'unknown';
    const statusEmoji = getStatusEmoji(state);

    let value = `${statusEmoji} **Status:** ${state}`;

    if (resource && state === 'running') {
        const res = resource.attributes.resources;
        const memoryMB = formatBytes(res.memory_bytes);
        const cpuPercent = res.cpu_absolute.toFixed(1);
        const uptime = formatUptime(res.uptime);

        value += `\n💾 **Memory:** ${memoryMB} MB`;
        value += `\n⚡ **CPU:** ${cpuPercent}%`;
        value += `\n⏱️ **Uptime:** ${uptime}`;
    }

    return value;
}

function getStatusEmoji(state: string): string {
    switch (state) {
        case 'running':
            return '🟢';
        case 'starting':
            return '🟡';
        case 'stopping':
            return '🟠';
        case 'offline':
            return '🔴';
        default:
            return '⚪';
    }
}

function formatBytes(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(0);
}

function formatUptime(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
}
