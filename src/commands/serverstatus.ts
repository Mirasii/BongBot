import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  ComponentType,
  Message
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

const command = {
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

  // This is called AFTER the message is sent
  async setupCollector(interaction: ChatInputCommandInteraction, message: Message): Promise<void> {
    // Create collector on the specific message that was sent
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 600000 // 10 minutes
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
      // Check if the user clicking is the same as who ran the command
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({ 
          content: '❌ You cannot control servers for another user.', 
          ephemeral: true 
        });
        return;
      }

      // Defer the button update
      await buttonInteraction.deferUpdate();

      const [, identifier, action] = buttonInteraction.customId.split(':');

      try {
        if (identifier === 'all' && action === 'stop') {
          // Stop all servers
          const servers = await fetchServers();
          const stopPromises = servers.map(server =>
            sendServerCommand(server.attributes.identifier, 'stop')
          );
          await Promise.all(stopPromises);

          await buttonInteraction.followUp({
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
            await buttonInteraction.followUp({
              content: `${actionText} server...`,
              ephemeral: true
            });
          } else {
            await buttonInteraction.followUp({
              content: '❌ Failed to control server.',
              ephemeral: true
            });
          }
        }

        // Refresh the status after a delay to allow Pterodactyl to update
        // Use longer delay for stop/start actions as they take time to propagate
        const delay = (action === 'stop' || action === 'start') ? 8000 : 5000;
        
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
              .setDescription('*Last updated: ' + new Date().toLocaleTimeString() + '*')
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

            await buttonInteraction.editReply({
              embeds: [embed],
              components: buttons
            });
          } catch (error) {
            console.error('Error refreshing status:', error);
          }
        }, delay);
      } catch (error) {
        console.error('Button interaction error:', error);
        await buttonInteraction.followUp({
          content: '❌ An error occurred processing your request.',
          ephemeral: true
        }).catch(() => { });
      }
    });

    collector.on('end', () => {
      console.log('Server status button collector ended after 10 minutes');
    });
  }
};

export default command;