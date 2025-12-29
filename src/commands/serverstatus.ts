import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ChatInputCommandInteraction, 
  InteractionReplyOptions,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  ComponentType
} from 'discord.js';

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

async function sendServerCommand(identifier: string, signal: 'start' | 'stop' | 'restart'): Promise<boolean> {
  try {
    const response = await fetch(
      `${PTERODACTYL_URL}/api/client/servers/${identifier}/power`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ signal })
      }
    );

    return response.ok;
  } catch {
    return false;
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

function createControlButtons(servers: PterodactylServer[], resources: (ServerResources | null)[]): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  
  for (let i = 0; i < servers.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    const chunk = servers.slice(i, i + 5);
    
    chunk.forEach((server, index) => {
      const globalIndex = i + index;
      const state = resources[globalIndex]?.attributes.current_state || 'unknown';
      const serverName = server.attributes.name.length > 20 
        ? server.attributes.name.substring(0, 17) + '...'
        : server.attributes.name;
      
      // Different button based on state
      if (state === 'running') {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`server_control:${server.attributes.identifier}:restart`)
            .setLabel(`🔄 ${serverName}`)
            .setStyle(ButtonStyle.Primary)
        );
      } else if (state === 'offline') {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`server_control:${server.attributes.identifier}:start`)
            .setLabel(`▶️ ${serverName}`)
            .setStyle(ButtonStyle.Success)
        );
      } else {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`server_control:${server.attributes.identifier}:${state}`)
            .setLabel(`⏸️ ${serverName}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
      }
    });
    
    rows.push(row);
  }
  
  // Add stop all button if any servers are running
  const anyRunning = resources.some(r => r?.attributes.current_state === 'running');
  if (anyRunning) {
    const stopRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('server_control:all:stop')
        .setLabel('⏹️ Stop All Servers')
        .setStyle(ButtonStyle.Danger)
    );
    rows.push(stopRow);
  }
  
  return rows;
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
          inline: false 
        });
      });

      // Create control buttons
      const buttons = createControlButtons(servers, resources);

      return { 
        embeds: [embed],
        components: buttons
      };

    } catch (error) {
      console.error('Error fetching server status:', error);
      return { content: '❌ Failed to fetch server status. Please check the bot logs.' };
    }
  },

  // Handle button interactions
  async handleButton(interaction: ButtonInteraction): Promise<void> {
    const [, identifier, action] = interaction.customId.split(':');
    
    await interaction.deferUpdate();

    if (identifier === 'all' && action === 'stop') {
      // Stop all servers
      const servers = await fetchServers();
      const stopPromises = servers.map(server => 
        sendServerCommand(server.attributes.identifier, 'stop')
      );
      await Promise.all(stopPromises);
      
      await interaction.followUp({ 
        content: '⏹️ Stopping all servers...', 
        ephemeral: true 
      });
    } else {
      // Single server control
      const success = await sendServerCommand(identifier, action as 'start' | 'stop' | 'restart');
      
      if (success) {
        const actionText = action === 'start' ? '▶️ Starting' : 
                          action === 'stop' ? '⏹️ Stopping' : 
                          '🔄 Restarting';
        await interaction.followUp({ 
          content: `${actionText} server...`, 
          ephemeral: true 
        });
      } else {
        await interaction.followUp({ 
          content: '❌ Failed to control server.', 
          ephemeral: true 
        });
      }
    }

    // Refresh the status after a short delay
    setTimeout(async () => {
      try {
        const servers = await fetchServers();
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
            inline: false 
          });
        });

        const buttons = createControlButtons(servers, resources);

        await interaction.editReply({ 
          embeds: [embed],
          components: buttons
        });
      } catch (error) {
        console.error('Error refreshing status:', error);
      }
    }, 3000);
  }
};