# BongBot Architecture

> A comprehensive architectural analysis of the BongBot Discord bot, covering command handling, event lifecycle, dependency patterns, and improvement recommendations.

---

## Table of Contents

1. [Current Architectural Overview](#1-current-architectural-overview)
2. [Identified Architectural Smells](#2-identified-architectural-smells)
3. [Proposed Improvements](#3-proposed-improvements)
4. [Testing Architecture](#4-testing-architecture)
5. [Dependency Graph](#5-dependency-graph)
6. [Critical Files Reference](#6-critical-files-reference)

---

## 1. Current Architectural Overview

### 1.1 Layer Structure

```
+----------------------------------------------------------+
|           Discord.js Client (Bot Entry Point)             |
|                    (src/index.ts)                         |
+----------------------------------------------------------+
                           |
+----------------------------------------------------------+
|              Event Handlers Layer                         |
|  - interactionCreate (slash commands)                     |
|  - messageCreate (mention-based replies)                  |
|  - clientReady (initialization)                           |
+----------------------------------------------------------+
                           |
+----------------------------------------------------------+
|              Command Layer                                |
|  - Simple Commands (object literals: ping, die, etc)      |
|  - Complex Commands (classes: pterodactyl)                |
|  - Hybrid Commands (chat_ai, create_quote)                |
+----------------------------------------------------------+
                           |
+----------------------------------------------------------+
|              Service/Helper Layer                         |
|  - Database (DatabasePool singleton)                      |
|  - Caller (HTTP wrapper with SSRF protection)             |
|  - Embed builders, error handlers, logging                |
+----------------------------------------------------------+
                           |
+----------------------------------------------------------+
|              Configuration Layer                          |
|  - Centralized env config (src/config/index.ts)           |
|  - Feature flags (API toggles)                            |
+----------------------------------------------------------+
```

### 1.2 Bot Initialization and Event Lifecycle

**Entry Point:** `src/index.ts`

The bot lifecycle follows this sequence:

1. **Configuration Validation**: `validateRequiredConfig()` checks for required environment variables and fails fast if missing
2. **Logging Initialization**: Creates a session UUID and initializes the file-based logger
3. **Command Registration**: `buildCommands(bot)` populates `bot.commands` Collection and returns command data for Discord API
4. **Event Handler Registration**: Three handlers are registered:
   - `interactionCreate` - Handles slash command interactions
   - `messageCreate` - Handles mention-based replies (quote creation, chat AI)
   - `clientReady` - Registers commands with Discord API, sets bot presence, posts deployment message, initializes TikTok notifier
5. **Login**: `bot.login(token)` connects to Discord Gateway

#### Slash Command Flow

```
User Input --> Discord Gateway --> interactionCreate
    |
    v
deferReply({ ephemeral: command.ephemeralDefer })
    |
    v
command.execute(interaction, bot)
    |
    v
interaction.followUp(response)
    |
    v
[optional] command.setupCollector(interaction, message)
```

#### Mention-Based Flow

```
User @mentions bot --> messageCreate
    |
    v
Create temporary "thinking" reply
    |
    v
Parse message content
    |
    v
Route to handler:
  - No content --> create_quote.executeReply()
  - Has content --> chat.executeLegacy()
    |
    v
Delete temp reply --> message.reply(response)
```

### 1.3 Command Patterns

BongBot uses **four distinct command patterns**:

#### Pattern 1: Simple Object Literals
Used for stateless, single-file commands.

```typescript
// src/commands/ping.ts
export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Health check'),
    async execute(interaction, client) {
        return 'Pong';
    },
    fullDesc: { options: [], description: 'Verify bot is responsive' }
}
```

**Used in:** `ping`, `dance`, `hoe`, `die`, and most media commands.

#### Pattern 2: Class-Based with Dependency Injection
Used for complex features requiring testability.

```typescript
// src/commands/pterodactyl/register_server.ts
export default class RegisterServer {
    constructor(db: Database, caller: Caller) {
        this.db = db;
        this.caller = caller;
    }
    async execute(interaction: ChatInputCommandInteraction) { ... }
}
```

**Used in:** All pterodactyl subcommands (`register_server`, `list_servers`, `update_server`, `remove_server`, `server_status`).

#### Pattern 3: Hybrid Commands with State
Commands supporting both slash and mention-based invocation with in-memory state.

```typescript
// src/commands/chat_ai.ts
const chatHistory: { [key: string]: [...] } = {};

export default {
    data: SlashCommandBuilder,
    async execute(interaction, client) { ... },      // Slash command
    async executeLegacy(message, client) { ... },   // @mention with content
    fullDesc: { ... }
}
```

**Used in:** `chat_ai`, `create_quote`.

#### Pattern 4: Master/Subcommand Pattern
Used for grouping related functionality under a single command namespace.

```typescript
// src/commands/pterodactyl/master.ts
export default {
    data: new SlashCommandBuilder()
        .setName('pterodactyl')
        .addSubcommand(subcommand => subcommand.setName('register')...)
        .addSubcommand(subcommand => subcommand.setName('list')...),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const db = DatabasePool.getInstance().getConnection();
        const caller = new Caller();

        switch(subcommand) {
            case 'register': return new RegisterServer(db, caller).execute(interaction);
            case 'list': return new ListServers(db, caller).execute(interaction);
            // ...
        }
    },
    setupCollector: ServerStatus.setupCollector
}
```

### 1.4 Command Registration

**File:** `src/commands/buildCommands.ts`

- Imports all command modules into `commandsArray`
- Creates a `Collection<string, any>` on `bot.commands`
- Returns JSON array for Discord API registration

### 1.5 Helper/Service Layer

| File | Purpose | Pattern |
|------|---------|---------|
| `src/helpers/database.ts` | SQLite wrapper for Pterodactyl servers | Class with AES-256-GCM encryption |
| `src/services/databasePool.ts` | Singleton connection pool | Singleton pattern |
| `src/helpers/caller.ts` | HTTP client wrapper | Class + module exports |
| `src/helpers/errorBuilder.ts` | Error response formatting | Functional |
| `src/helpers/embedBuilder.ts` | Discord embed construction | Class (Builder pattern) |
| `src/helpers/quoteBuilder.ts` | Quote-specific embeds | Class (Builder pattern) |
| `src/helpers/logging.ts` | File-based logging | Module singleton |
| `src/helpers/infoCard.ts` | Bot info card generation | Functional |

### 1.6 Dependency Injection Patterns

| Approach | Used In | Testability | Coupling |
|----------|---------|-------------|----------|
| **Constructor DI** | Pterodactyl subcommands | High | Low |
| **Global imports** | Most simple commands | Low | High |
| **Singleton** | DatabasePool | Medium | Medium |

**Example of Constructor DI:**
```typescript
// Instantiation in master.ts
const db = DatabasePool.getInstance().getConnection();
const caller = new Caller();
return new RegisterServer(db, caller).execute(interaction);
```

### 1.7 State Management

| State Type | Implementation | Location | Persistence |
|------------|----------------|----------|-------------|
| Chat history | In-memory object | `chat_ai.ts` | None (lost on restart) |
| Server data | SQLite + encryption | `database.ts` | Disk |
| Command registry | Discord.js Collection | `bot.commands` | Memory |
| Configuration | Environment variables | `config/index.ts` | Process env |

### 1.8 Typing Overview

**Current interfaces defined in `src/helpers/interfaces.ts`:**
- `ServerDetails` - Pterodactyl server model
- `PterodactylResponse` - API response wrapper
- `ExtendedClient` - Discord client with commands Collection

**Missing interfaces:**
- `Command` - No formal command structure interface
- `CommandResponse` - No unified response type
- `ChatMessage` - No type for chat history entries

### 1.9 Configuration Management

**File:** `src/config/index.ts`

- Centralizes all environment variables
- Provides `validateRequiredConfig()` for early validation
- Auto-adjusts `media.file_root` for test vs. production environments

---

## 2. Identified Architectural Smells

### 2.1 Weak Type Safety

**Severity:** High | **Impact:** Maintainability, IDE support, refactoring safety

**Problem:** Pervasive use of `any` types defeats TypeScript benefits.

**Locations:**
```typescript
// src/commands/buildCommands.ts:40
client.commands = new Collection<string, any>();

// src/commands/buildCommands.ts:39
const commands: Array<any> = [];

// src/index.ts:39
(command as any).setupCollector  // Type casting without interface
```

**Impact:**
- Loss of IDE autocomplete
- Runtime errors not caught at compile time
- Refactoring becomes risky

---

### 2.2 Global State in Commands

**Severity:** High | **Impact:** Testability, concurrency, data loss

**Problem:** Chat history stored as module-level object.

```typescript
// src/commands/chat_ai.ts:12
const chatHistory: { [key: string]: [{ "role": string, "content": string }] } = {};
```

**Issues:**
- State lost on bot restart
- Unbounded memory growth (MAX_HISTORY_LENGTH is per-server, no global limit)
- Potential race conditions in concurrent execution
- Not mockable for testing
- No type safety on message structure

---

### 2.3 Inconsistent Dependency Injection

**Severity:** Medium | **Impact:** Testability variance across codebase

**Problem:** Pterodactyl uses DI, other commands use global imports.

```typescript
// Pterodactyl (testable)
constructor(db: Database, caller: Caller) { ... }

// Other commands (hard to test)
import CALLER from '../helpers/caller.js';
```

---

### 2.4 SetupCollector Binding Issue

**Severity:** Medium | **Impact:** Potential runtime errors, context mismatch

**Location:** `src/commands/pterodactyl/master.ts:112`

```typescript
setupCollector: new ServerStatus(
    DatabasePool.getInstance().getConnection(),
    new Caller()
).setupCollector,
```

**Problem:** Creates an orphan instance just for method binding. The `this` context won't match the execution instance, leading to potential state inconsistencies.

---

### 2.5 Event Handler Tight Coupling

**Severity:** Medium | **Impact:** Extensibility, testing

**Problem:** `src/index.ts` contains inline event handling logic.

```typescript
bot.on('interactionCreate', async (interaction) => {
    // 1. Validate interaction type
    // 2. Get command from collection
    // 3. Defer reply with ephemeral logic
    // 4. Execute command
    // 5. Handle errors
    // 6. Setup collector if present
})
```

**Issues:**
- Cannot add middleware (rate limiting, permissions, logging)
- No pre/post execution hooks
- Error handling mixed with dispatch logic
- setupCollector check is ad-hoc (`'setupCollector' in command`)

---

### 2.6 Response Format Inconsistency

**Severity:** Low | **Impact:** Consistency, debugging

**Problem:** Commands return varying response formats.

```typescript
// Pattern 1: String
return 'Pong';

// Pattern 2: Object with content
return { content: '...', ephemeral: true };

// Pattern 3: Embed
return { embeds: [embed.toJSON()] };

// Pattern 4: Complex with files
return { embeds: [embed], files: [attachment] };

// Pattern 5: Error
return { embeds: [...], files: [...], flags: MessageFlags.Ephemeral, isError: true };
```

No unified contract for command responses.

---

### 2.7 Message Handler Hardcoding

**Severity:** Medium | **Impact:** Maintainability, extensibility

**Problem:** Hardcoded routing for mention-based messages.

```typescript
// src/index.ts
bot.on('messageCreate', async (message) => {
    if (!content)
        response = await bot.commands!.get('create_quote')!.executeReply(message, bot);
    else
        response = await bot.commands!.get('chat')!.executeLegacy(message, bot);
})
```

**Issues:**
- Tightly couples handler to specific commands
- No registry for message-handling commands
- Fails silently if command lacks the method

---

### 2.8 Mixed Export Patterns in Caller

**Severity:** Low | **Impact:** Consistency, confusion

**Problem:** Dual export patterns.

```typescript
// src/helpers/caller.ts
export class Caller { ... }
export default { get, post };  // Module-level functions
```

Two ways to use the same functionality leads to inconsistent usage across the codebase.

---

### 2.9 Logger Late Initialization Risk

**Severity:** Low | **Impact:** Silent failures, lost error information

**Location:** `src/helpers/logging.ts`

```typescript
let logFile: string | undefined;
async init(sessionId: string) { ... }
async log(error: any) {
    if (!logFile) { console.error('Log file not initialized'); return; }
}
```

Logger fails silently if `init()` not called before `log()`.

---

### 2.10 Hardcoded Repository Constants

**Severity:** Low | **Impact:** Portability

**Location:** `src/helpers/infoCard.ts`

```typescript
const GITHUB_REPO_OWNER = 'Mirasii';
const GITHUB_REPO_NAME = 'BongBot';
```

Should be configuration-driven for portability.

---

### 2.11 Summary Table

| Smell | Severity | Files Affected | Priority |
|-------|----------|----------------|----------|
| Weak type safety (`any`) | High | `buildCommands.ts`, `index.ts` | P0 |
| Global state (chatHistory) | High | `chat_ai.ts` | P1 |
| Inconsistent DI | Medium | All simple commands | P1 |
| setupCollector binding | Medium | `pterodactyl/master.ts` | P2 |
| Event handler coupling | Medium | `index.ts` | P2 |
| Message handler hardcoding | Medium | `index.ts` | P2 |
| Response inconsistency | Low | All commands | P3 |
| Mixed export patterns | Low | `caller.ts` | P3 |
| Logger initialization | Low | `logging.ts` | P3 |
| Hardcoded constants | Low | `infoCard.ts` | P3 |

---

## 3. Proposed Improvements

### 3.1 Define Formal Command Interface (P0)

**File:** `src/helpers/interfaces.ts`

```typescript
import {
    ChatInputCommandInteraction,
    Message,
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder
} from 'discord.js';

export interface CommandResponse {
    content?: string;
    embeds?: EmbedBuilder[];
    files?: AttachmentBuilder[];
    components?: ActionRowBuilder[];
    ephemeral?: boolean;
    isError?: boolean;
}

export interface CommandFullDesc {
    description: string;
    options: Array<{ name: string; description: string }>;
}

export interface Command {
    data: SlashCommandBuilder;
    execute(
        interaction: ChatInputCommandInteraction,
        client: ExtendedClient
    ): Promise<CommandResponse>;

    // Optional methods
    executeReply?: (message: Message, client: ExtendedClient) => Promise<CommandResponse>;
    executeLegacy?: (message: Message, client: ExtendedClient) => Promise<CommandResponse>;
    setupCollector?: (
        interaction: ChatInputCommandInteraction,
        message: Message
    ) => Promise<void>;

    // Optional properties
    ephemeralDefer?: boolean;
    fullDesc?: CommandFullDesc;
}
```

**Update `buildCommands.ts`:**
```typescript
import { Command } from '../helpers/interfaces.js';

client.commands = new Collection<string, Command>();
const commands: Command[] = [];
```

---

### 3.2 Extract Chat History Service (P1)

**New file:** `src/services/chatHistoryService.ts`

```typescript
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export class ChatHistoryService {
    private history: Map<string, ChatMessage[]> = new Map();
    private readonly MAX_HISTORY_PER_SERVER = 100;
    private readonly MAX_SERVERS = 1000;

    getHistory(serverId: string): ChatMessage[] {
        return this.history.get(serverId) ?? [];
    }

    addMessage(serverId: string, message: ChatMessage): void {
        // Enforce global limit
        if (this.history.size >= this.MAX_SERVERS && !this.history.has(serverId)) {
            const oldestKey = this.history.keys().next().value;
            this.history.delete(oldestKey);
        }

        const history = this.getHistory(serverId);
        history.push(message);

        // Enforce per-server limit
        if (history.length > this.MAX_HISTORY_PER_SERVER) {
            history.splice(0, 2); // Remove oldest pair
        }

        this.history.set(serverId, history);
    }

    clearServer(serverId: string): void {
        this.history.delete(serverId);
    }

    clearAll(): void {
        this.history.clear();
    }
}

// Singleton export
export const chatHistoryService = new ChatHistoryService();
```

**Update `chat_ai.ts`:**
```typescript
import { chatHistoryService } from '../services/chatHistoryService.js';

// Replace global chatHistory object usage with:
const history = chatHistoryService.getHistory(serverId);
chatHistoryService.addMessage(serverId, { role: 'user', content: userMessage });
```

---

### 3.3 Fix setupCollector Binding (P2)

**File:** `src/commands/pterodactyl/master.ts`

**Before:**
```typescript
setupCollector: new ServerStatus(
    DatabasePool.getInstance().getConnection(),
    new Caller()
).setupCollector,
```

**After:**
```typescript
// Create factory function
const getServerStatus = () => new ServerStatus(
    DatabasePool.getInstance().getConnection(),
    new Caller()
);

export default {
    // ... existing code ...

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch(subcommand) {
            case 'manage':
                return await getServerStatus().execute(interaction);
            // ... other cases
        }
    },

    setupCollector: async (
        interaction: ChatInputCommandInteraction,
        message: Message
    ) => {
        return getServerStatus().setupCollector(interaction, message);
    }
}
```

---

### 3.4 Create Event Dispatcher Service (P2)

**New file:** `src/services/commandDispatcher.ts`

```typescript
import { ChatInputCommandInteraction } from 'discord.js';
import { Command, CommandResponse, ExtendedClient } from '../helpers/interfaces.js';
import { buildError } from '../helpers/errorBuilder.js';

type HookFunction = (command: Command, interaction: ChatInputCommandInteraction) => Promise<void>;

export class CommandDispatcher {
    private preExecuteHooks: HookFunction[] = [];
    private postExecuteHooks: HookFunction[] = [];

    onPreExecute(hook: HookFunction): void {
        this.preExecuteHooks.push(hook);
    }

    onPostExecute(hook: HookFunction): void {
        this.postExecuteHooks.push(hook);
    }

    async dispatch(
        command: Command,
        interaction: ChatInputCommandInteraction,
        bot: ExtendedClient
    ): Promise<CommandResponse> {
        // Run pre-execute hooks
        for (const hook of this.preExecuteHooks) {
            await hook(command, interaction);
        }

        // Defer reply
        const ephemeral = command.ephemeralDefer ?? false;
        await interaction.deferReply({ ephemeral });

        let response: CommandResponse;

        try {
            response = await command.execute(interaction, bot);
        } catch (error) {
            response = await buildError(interaction, error);
        }

        // Run post-execute hooks
        for (const hook of this.postExecuteHooks) {
            await hook(command, interaction);
        }

        return response;
    }
}

export const commandDispatcher = new CommandDispatcher();
```

---

### 3.5 Create Message Handler Registry (P2)

**New file:** `src/services/messageHandlerRegistry.ts`

```typescript
import { Message } from 'discord.js';
import { ExtendedClient } from '../helpers/interfaces.js';

interface MessageHandler {
    commandName: string;
    method: 'executeReply' | 'executeLegacy';
    condition: (message: Message) => boolean;
}

export class MessageHandlerRegistry {
    private handlers: MessageHandler[] = [];

    register(handler: MessageHandler): void {
        this.handlers.push(handler);
    }

    async handle(message: Message, bot: ExtendedClient): Promise<any> {
        for (const handler of this.handlers) {
            if (handler.condition(message)) {
                const command = bot.commands?.get(handler.commandName);
                if (command && handler.method in command) {
                    return (command as any)[handler.method](message, bot);
                }
            }
        }
        return null;
    }
}

// Default configuration
export const messageHandlerRegistry = new MessageHandlerRegistry();

// Register default handlers
messageHandlerRegistry.register({
    commandName: 'create_quote',
    method: 'executeReply',
    condition: (message) => !message.content.replace(/<@!?\d+>/g, '').trim()
});

messageHandlerRegistry.register({
    commandName: 'chat',
    method: 'executeLegacy',
    condition: (message) => !!message.content.replace(/<@!?\d+>/g, '').trim()
});
```

---

### 3.6 Consolidate Caller Export Pattern (P3)

**File:** `src/helpers/caller.ts`

Remove the default export and use class-only:

```typescript
export class Caller {
    async get<T>(url: string, headers?: Record<string, string>): Promise<T> { ... }
    async post<T>(url: string, body: any, headers?: Record<string, string>): Promise<T> { ... }

    // Static methods for convenience
    static async get<T>(url: string, headers?: Record<string, string>): Promise<T> {
        return new Caller().get(url, headers);
    }

    static async post<T>(url: string, body: any, headers?: Record<string, string>): Promise<T> {
        return new Caller().post(url, body, headers);
    }
}

// Remove: export default { get, post };
```

---

### 3.7 Add Command Validation at Build Time

**File:** `src/commands/buildCommands.ts`

```typescript
import { Command } from '../helpers/interfaces.js';

function validateCommand(command: any): command is Command {
    return (
        command.data?.name &&
        typeof command.execute === 'function' &&
        command.fullDesc?.description !== undefined
    );
}

for (const command of commandsArray) {
    if (!validateCommand(command)) {
        throw new Error(`Invalid command structure: ${command.data?.name || 'unknown'}`);
    }
    client.commands.set(command.data.name, command);
}
```

---

### 3.8 Configuration-Driven Repository Info

**File:** `src/config/index.ts`

```typescript
github: {
    owner: process.env.GITHUB_OWNER || 'Mirasii',
    repo: process.env.GITHUB_REPO || 'BongBot',
}
```

---

### 3.9 Implementation Priority Matrix

| Priority | Improvement | Effort | Impact | Risk |
|----------|-------------|--------|--------|------|
| P0 | Define Command interface | Low | High | Low |
| P1 | Extract ChatHistoryService | Medium | High | Low |
| P1 | Apply Command interface to buildCommands | Low | High | Low |
| P2 | Fix setupCollector binding | Low | Medium | Low |
| P2 | Create CommandDispatcher | Medium | Medium | Medium |
| P2 | Create MessageHandlerRegistry | Medium | Medium | Low |
| P3 | Consolidate Caller exports | Low | Low | Low |
| P3 | Add command validation | Low | Medium | Low |
| P3 | Config-driven constants | Low | Low | Low |

---

### 3.10 Scalability Considerations for Sharding

Current state assessment for sharding readiness:

| Component | Sharding Ready | Notes |
|-----------|----------------|-------|
| Commands | Yes | Stateless execution |
| Chat History | No | In-memory, per-process |
| Database | Partially | SQLite not suitable for concurrent writes |
| TikTok Notifier | No | Would send duplicate notifications |
| Logger | No | File per session, not shared |

**Recommendations for sharding:**
1. Move chat history to Redis or shared database
2. Replace SQLite with PostgreSQL or use SQLite in WAL mode with single writer
3. Implement distributed lock for TikTok notifications
4. Use centralized logging service (e.g., Winston with transport)

---

## 4. Testing Architecture

### 4.1 Current Test Infrastructure

- **Framework**: Jest with ESM support (`NODE_OPTIONS=--experimental-vm-modules`)
- **HTTP Mocking**: MSW (Mock Service Worker)
- **Test Structure**: Mirrors source structure in `tests/`

### 4.2 Test Utilities

| Utility | Purpose |
|---------|---------|
| `tests/setup.ts` | Global MSW lifecycle |
| `tests/utils/testSetup.ts` | Reusable MSW setup functions |
| `tests/utils/commandTestUtils.ts` | Mock factories for interactions/clients |
| `tests/mocks/handlers.ts` | Default HTTP handlers |

### 4.3 Testing Pattern for DI Commands

The Pterodactyl tests demonstrate the preferred pattern:

```typescript
const mockDb = { addServer: jest.fn(), ... };
const caller = new Caller();
const instance = new RegisterServer(mockDb as any, caller);
```

---

## 5. Dependency Graph

```
src/index.ts
|-- discord.js (Client, Events)
|-- src/config/index.ts
|-- src/helpers/logging.ts
|-- src/helpers/errorBuilder.ts
|   |-- src/helpers/logging.ts
|   +-- src/helpers/embedBuilder.ts
|       +-- src/helpers/randomFile.ts
|-- src/helpers/infoCard.ts
|-- src/commands/buildCommands.ts
|   +-- [All command modules]
+-- src/commands/naniko.ts (TikTok)

Command Dependencies:
|-- Pterodactyl commands --> Database, Caller, shared utilities
|-- Quote commands --> Caller, QuoteBuilder
|-- Chat AI --> Caller, EmbedBuilder, Google AI SDK
+-- Media commands --> EmbedBuilder, config
```

---

## 6. Critical Files Reference

If implementing the proposed improvements, prioritize these files:

| File | Priority | Change |
|------|----------|--------|
| `src/helpers/interfaces.ts` | P0 | Add Command interface and CommandResponse type definitions |
| `src/commands/buildCommands.ts` | P0 | Add type safety and validation to command registration |
| `src/commands/chat_ai.ts` | P1 | Extract state to ChatHistoryService |
| `src/commands/pterodactyl/master.ts` | P2 | Fix setupCollector binding |
| `src/index.ts` | P2 | Extract event handler logic into dedicated service class |
| `src/helpers/caller.ts` | P3 | Consolidate to single export pattern (class-only) |

---

## Architectural Strengths to Preserve

While addressing the smells above, maintain these existing strengths:

1. **Clean Separation of Concerns** - Event listeners separate from command logic
2. **Dependency Injection in Pterodactyl** - Excellent testability pattern to expand
3. **Database Encryption** - AES-256-GCM for API keys at rest
4. **SSRF Protection** - Private IP blocking in Caller
5. **Centralized Configuration** - Fail-fast validation
6. **Modular Command Structure** - Easy to add new commands
7. **Shared Pterodactyl Utilities** - Good example of horizontal code organization

---

*Generated by Code Architect Agent*
