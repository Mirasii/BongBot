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
  APIButtonComponent,
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

      const idType = {
        'running': 'restart',
        'offline': 'start'
      }[state] || state;
      
      const bStyle = {
        'running': ButtonStyle.Primary,
        'offline': ButtonStyle.Success,
      }[state] || ButtonStyle.Secondary;
      const buttonSymbol = {
        'running': '🔄',
        'offline': '▶️'
      }[state] || '⏸️';

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`server_control:${server.attributes.identifier}:${idType}`)
          .setLabel(`${buttonSymbol} ${serverName}`)
          .setStyle(bStyle)
          .setDisabled(state !== 'running' && state !== 'offline')
      );
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

// Poll server status until expected state is reached
async function pollUntilStateChange(
  buttonInteraction: ButtonInteraction,
  identifiers: string[],
  expectedState: string,
  maxAttempts: number = 120, // 120 attempts = up to 60 seconds
  interval: number = 500 // check every 0.5 seconds
): Promise<void> {
  let attempts = 0;

  const checkStatus = async (): Promise<boolean> => {
    attempts++;
    
    const resourcePromises = identifiers.map(id => fetchServerResources(id));
    const resources = await Promise.all(resourcePromises);

    // Check if all servers have reached expected state
    const allReached = resources.every(r => {
      if (!r) return false;
      const state = r.attributes.current_state;
      
      // For restart, we consider it complete when it's running
      // For stop, we want offline
      // For start, we want running
      return state === expectedState;
    });

    if (allReached || attempts >= maxAttempts) {
      // Refresh the full status display
      await refreshStatus(buttonInteraction);
      return true;
    }

    return false;
  };

  // Poll at intervals
  const pollInterval = setInterval(async () => {
    const done = await checkStatus();
    if (done) {
      clearInterval(pollInterval);
    }
  }, interval);

  // Also check immediately
  const done = await checkStatus();
  if (done) {
    clearInterval(pollInterval);
  }
}

// Refresh the entire status display
async function refreshStatus(buttonInteraction: ButtonInteraction): Promise<void> {
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
        // Disable all buttons while processing
        const disabledButtons = message.components.map(row => {
          const newRow = new ActionRowBuilder<ButtonBuilder>();
          (row as any).components.forEach((component: APIButtonComponent) => {
            if (component.type === ComponentType.Button) {
              newRow.addComponents(
                ButtonBuilder.from(component).setDisabled(true)
              );
            }
          });
          return newRow;
        });

        await buttonInteraction.editReply({
          components: disabledButtons
        });

        if (identifier === 'all' && action === 'stop') {
          // Stop all servers
          const servers = await fetchServers();
          const stopPromises = servers.map(server =>
            sendServerCommand(server.attributes.identifier, 'stop')
          );
          await Promise.all(stopPromises);

          await buttonInteraction.followUp({
            content: '⏹️ Stopping all servers... Status will update automatically.',
            ephemeral: true
          });

          // Poll until all servers are offline
          await pollUntilStateChange(buttonInteraction, servers.map(s => s.attributes.identifier), 'offline');
        } else {
          // Single server control
          const success = await sendServerCommand(identifier, action as 'start' | 'stop' | 'restart');

          if (!success) {
            await buttonInteraction.followUp({
              content: '❌ Failed to control server.',
              ephemeral: true
            });
            // Re-enable buttons
            await refreshStatus(buttonInteraction);
            return;
          }

          const actionText = action === 'start' ? '▶️ Starting' :
            action === 'stop' ? '⏹️ Stopping' :
              '🔄 Restarting';
          
          const expectedState = action === 'start' ? 'running' :
            action === 'stop' ? 'offline' :
              'running'; // restart ends in running

          await buttonInteraction.followUp({
            content: `${actionText} server... Status will update automatically.`,
            ephemeral: true
          });

          // Poll until the expected state is reached
          await pollUntilStateChange(buttonInteraction, [identifier], expectedState);
        }
      } catch (error) {
        console.error('Button interaction error:', error);
        await buttonInteraction.followUp({
          content: '❌ An error occurred processing your request.',
          ephemeral: true
        }).catch(() => { });
        // Try to re-enable buttons
        await refreshStatus(buttonInteraction);
      }
    });

    collector.on('end', () => {
      console.log('Server status button collector ended after 10 minutes');
    });
  }
};

export default command;