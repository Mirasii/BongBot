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
import Database from '../helpers/database.js';
import { buildError } from '../helpers/errorBuilder.js';

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

const command = {
  data: new SlashCommandBuilder()
    .setName('server_status')
    .setDescription('Check the status of all game servers'),

  async execute(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
    const db = new Database(process.env.SERVER_DATABASE || 'pterodactyl.db');

    try {
      const userServers = db.getServersByUserId(interaction.user.id);

      if (!userServers || userServers.length === 0) {
        db.close();
        return {
          content: '❌ You have no registered servers. Use `/register_server` to add one.',
          ephemeral: true
        };
      }

      // Fetch resources for all registered servers in parallel
      const serverDataPromises = userServers.map(async (dbServer) => {
        const servers = await fetchServers(dbServer.serverUrl, dbServer.apiKey);
        const resourcePromises = servers.map(server =>
          fetchServerResources(server.attributes.identifier, dbServer.serverUrl, dbServer.apiKey)
        );
        const resources = await Promise.all(resourcePromises);
        return { servers, resources, dbServer };
      });

      const allServerData = await Promise.all(serverDataPromises);
      db.close();

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎮 Game Server Status')
        .setTimestamp();

      allServerData.forEach(({ servers, resources, dbServer }) => {
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
            name: `${dbServer.serverName} - ${server.attributes.name}`,
            value: value,
            inline: false
          });
        });
      });

      // Create control buttons
      const buttons = createControlButtons(allServerData);

      return {
        embeds: [embed],
        components: buttons
      };

    } catch (error) {
      db.close();
      console.error('Error fetching server status:', error);
      return { content: '❌ Failed to fetch server status. Please check your registered servers.' };
    }
  },

  async setupCollector(interaction: ChatInputCommandInteraction, message: Message): Promise<void> {
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 600000
    });

    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({
          content: '❌ You cannot control servers for another user.',
          ephemeral: true
        });
        return;
      }

      await buttonInteraction.deferUpdate();
      const [, dbServerId, identifier, action] = buttonInteraction.customId.split(':');
      const actionText = action === 'start' ? '▶️ Starting' : '🔄 Restarting';
      const replyMessage = {
        'stop': '⏹️ Stopping all servers... Status will update automatically.',
        'start': `${actionText} server... Status will update automatically.`,
        'restart': `${actionText} server... Status will update automatically.`
      }[action] || 'Processing your request...';

      await buttonInteraction.followUp({
        content: replyMessage,
        ephemeral: true
      });

      try {
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

        const db = new Database(process.env.SERVER_DATABASE || 'pterodactyl.db');
        const dbServer = db.getServerById(parseInt(dbServerId));
        db.close();

        if (!dbServer) {
          await buttonInteraction.followUp({
            content: '❌ Server configuration not found.',
            ephemeral: true
          });
          return;
        }

        if (identifier === 'all' && action === 'stop') {
          const servers = await fetchServers(dbServer.serverUrl, dbServer.apiKey);
          const stopPromises = servers.map(server =>
            sendServerCommand(server.attributes.identifier, 'stop', dbServer.serverUrl, dbServer.apiKey)
          );
          await Promise.all(stopPromises);

          await pollUntilStateChange(
            buttonInteraction,
            servers.map(s => s.attributes.identifier),
            'offline',
            dbServer.serverUrl,
            dbServer.apiKey
          );
        } else {
          const success = await sendServerCommand(
            identifier,
            action as 'start' | 'stop' | 'restart',
            dbServer.serverUrl,
            dbServer.apiKey
          );

          if (!success) {
            await buttonInteraction.followUp({
              content: '❌ Failed to control server.',
              ephemeral: true
            });
            await refreshStatus(buttonInteraction, interaction.user.id);
            return;
          }

          const expectedState = action === 'start' ? 'running' :
            action === 'stop' ? 'offline' : 'running';

          await pollUntilStateChange(
            buttonInteraction,
            [identifier],
            expectedState,
            dbServer.serverUrl,
            dbServer.apiKey
          );
        }
      } catch (error) {
        console.error('Button interaction error:', error);
        await buttonInteraction.followUp({
          content: '❌ An error occurred processing your request.',
          ephemeral: true
        }).catch(() => { });
        await refreshStatus(buttonInteraction, interaction.user.id);
      }
    });

    collector.on('end', () => {
      console.log('Server status button collector ended after 10 minutes');
    });
  }
};

async function fetchServers(serverUrl: string, apiKey: string): Promise<PterodactylServer[]> {
  const response = await fetch(`${serverUrl}/api/client`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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

async function fetchServerResources(identifier: string, serverUrl: string, apiKey: string): Promise<ServerResources | null> {
  try {
    const response = await fetch(
      `${serverUrl}/api/client/servers/${identifier}/resources`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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

async function sendServerCommand(
  identifier: string,
  signal: 'start' | 'stop' | 'restart',
  serverUrl: string,
  apiKey: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${serverUrl}/api/client/servers/${identifier}/power`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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

async function pollUntilStateChange(
  buttonInteraction: ButtonInteraction,
  identifiers: string[],
  expectedState: string,
  serverUrl: string,
  apiKey: string,
  maxAttempts: number = 120,
  interval: number = 500
): Promise<void> {
  let attempts = 0;

  const checkStatus = async (): Promise<boolean> => {
    attempts++;

    const resourcePromises = identifiers.map(id => fetchServerResources(id, serverUrl, apiKey));
    const resources = await Promise.all(resourcePromises);

    const allReached = resources.every(r => {
      if (!r) return false;
      const state = r.attributes.current_state;
      return state === expectedState;
    });

    if (allReached || attempts >= maxAttempts) {
      await refreshStatus(buttonInteraction, buttonInteraction.user.id);
      return true;
    }

    return false;
  };

  const pollInterval = setInterval(async () => {
    const done = await checkStatus();
    if (done) {
      clearInterval(pollInterval);
    }
  }, interval);

  const done = await checkStatus();
  if (done) {
    clearInterval(pollInterval);
  }
}

async function refreshStatus(buttonInteraction: ButtonInteraction, userId: string): Promise<void> {
  try {
    const db = new Database(process.env.SERVER_DATABASE || 'pterodactyl.db');
    const userServers = db.getServersByUserId(userId);
    db.close();

    if (!userServers || userServers.length === 0) {
      return;
    }

    const serverDataPromises = userServers.map(async (dbServer) => {
      const servers = await fetchServers(dbServer.serverUrl, dbServer.apiKey);
      const resourcePromises = servers.map(server =>
        fetchServerResources(server.attributes.identifier, dbServer.serverUrl, dbServer.apiKey)
      );
      const resources = await Promise.all(resourcePromises);
      return { servers, resources, dbServer };
    });

    const allServerData = await Promise.all(serverDataPromises);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎮 Game Server Status')
      .setDescription('*Last updated: ' + new Date().toLocaleTimeString() + '*')
      .setTimestamp();

    allServerData.forEach(({ servers, resources, dbServer }) => {
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
          name: `${dbServer.serverName} - ${server.attributes.name}`,
          value: value,
          inline: false
        });
      });
    });

    const buttons = createControlButtons(allServerData);

    await buttonInteraction.editReply({
      embeds: [embed],
      components: buttons
    });
  } catch (error) {
    console.error('Error refreshing status:', error);
  }
}

function createControlButtons(
  allServerData: Array<{
    servers: PterodactylServer[];
    resources: (ServerResources | null)[];
    dbServer: any;
  }>
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  allServerData.forEach(({ servers, resources, dbServer }) => {
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
            .setCustomId(`server_control:${dbServer.id}:${server.attributes.identifier}:${idType}`)
            .setLabel(`${buttonSymbol} ${serverName}`)
            .setStyle(bStyle)
            .setDisabled(state !== 'running' && state !== 'offline')
        );
      });

      rows.push(row);
    }

    const anyRunning = resources.some(r => r?.attributes.current_state === 'running');
    if (anyRunning) {
      const stopRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`server_control:${dbServer.id}:all:stop`)
          .setLabel('⏹️ Stop All Servers')
          .setStyle(ButtonStyle.Danger)
      );
      rows.push(stopRow);
    }
  });

  return rows;
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

export default command;
