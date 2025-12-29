import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, InteractionReplyOptions } from 'discord.js';

// Configuration
const PTERODACTYL_URL = process.env.PTERODACTYL_URL || 'http://localhost';
const PTERODACTYL_API_KEY = process.env.PTERODACTYL_API_KEY;

interface PterodactylServer {
  attributes: {
    identifier: string;
    name: string;
    description: string;
  };
}

interface ServerResources {
  attributes: {
    current_state: string;
    resources: {
      memory_bytes: number;
      cpu_absolute: number;
      disk_bytes: number;
      uptime: number;
    };
  };
}

interface ApiResponse<T> {
  data: T[];
}

async function fetchServers(): Promise<PterodactylServer[]> {
  const response = await fetch(`${PTERODACTYL_URL}/api/client`, {
    headers: {
      'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch servers: ${response.statusText}`);
  }

  const json: ApiResponse<PterodactylServer> = await response.json();
  return json.data;
}

async function fetchServerResources(identifier: string): Promise<ServerResources | null> {
  try {
    const response = await fetch(
      `${PTERODACTYL_URL}/api/client/servers/${identifier}/resources`,
      {
        headers: {
          'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
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

export default {
  data: new SlashCommandBuilder()
    .setName('serverstatus')
    .setDescription('Check the status of all game servers'),

  async execute(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
    // Note: deferReply is called in the main bot file, so we don't call it here

    if (!PTERODACTYL_API_KEY) {
      return { content: '❌ Pterodactyl API key is not configured.' };
    }

    try {
      const servers = await fetchServers();

      if (!servers || servers.length === 0) {
        return { content: 'No servers found on the panel.' };
      }

      // Fetch resources for all servers in parallel
      const resourcePromises = servers.map(server => 
        fetchServerResources(server.attributes.identifier)
      );
      const resources = await Promise.all(resourcePromises);

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎮 Game Server Status')
        .setTimestamp();

      servers.forEach((server, index) => {
        const resource = resources[index];
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
        
        embed.addFields({ 
          name: server.attributes.name, 
          value: value, 
          inline: true 
        });
      });

      return { embeds: [embed] };

    } catch (error) {
      console.error('Error fetching server status:', error);
      return { content: '❌ Failed to fetch server status. Please check the bot logs.' };
    }
  }
};