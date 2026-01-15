# ARCHITECTURE.md

## 1. Current Architectural Overview

### 1.1 High-Level Architecture

BongBot follows a **layered architecture** with three primary layers:

```
+---------------------------+
|      Discord Gateway      |  (discord.js Client)
+---------------------------+
            |
+---------------------------+
|     Event Handlers        |  (interactionCreate, messageCreate, clientReady)
+---------------------------+
            |
+---------------------------+
|    Command Layer          |  (Slash Commands & Message Commands)
+---------------------------+
            |
+---------------------------+
|   Helper/Service Layer    |  (Database, API Caller, Builders)
+---------------------------+
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

### 1.3 Command Structure

Commands use two patterns:

#### Simple Command Pattern (Single File)
Location: `src/commands/*.ts`

```typescript
export default {
    data: SlashCommandBuilder,
    execute(interaction, bot): Promise<ResponseObject>,
    fullDesc: { description: string, options: [] },
    // Optional methods:
    executeReply?(message, bot),  // For mention-based triggers without content
    executeLegacy?(message, bot), // For mention-based triggers with content
    setupCollector?(interaction, message), // For interactive components
    ephemeralDefer?: boolean      // Makes initial response ephemeral
}
```

#### Subcommand Pattern (Master + Handlers)
Location: `src/commands/pterodactyl/`

```
pterodactyl/
├── master.ts           # SlashCommandBuilder with subcommands, routing logic
├── register_server.ts  # Class-based handler with DI
├── list_servers.ts     # Class-based handler with DI
├── server_status.ts    # Class-based handler with DI, collector support
├── update_server.ts    # Class-based handler with DI
├── remove_server.ts    # Class-based handler with DI
└── shared/             # Shared utilities for this command group
    ├── pterodactylApi.ts
    ├── serverStatusEmbed.ts
    └── serverControlComponents.ts
```

The master file instantiates handler classes with dependencies (Database, Caller) and routes subcommands via switch statement.

### 1.4 Command Registration

**File:** `src/commands/buildCommands.ts`

- Imports all command modules into `commandsArray`
- Creates a `Collection<string, any>` on `bot.commands`
- Returns JSON array for Discord API registration

### 1.5 Helper/Service Layer

| File | Purpose | Pattern |
|------|---------|---------|
| `src/helpers/database.ts` | SQLite wrapper for Pterodactyl servers | Class with encryption |
| `src/services/databasePool.ts` | Singleton connection pool | Singleton pattern |
| `src/helpers/caller.ts` | HTTP client wrapper | Class + module exports |
| `src/helpers/errorBuilder.ts` | Error response formatting | Functional |
| `src/helpers/embedBuilder.ts` | Discord embed construction | Class (Builder pattern) |
| `src/helpers/quoteBuilder.ts` | Quote-specific embeds | Class (Builder pattern) |
| `src/helpers/logging.ts` | File-based logging | Module singleton |
| `src/helpers/infoCard.ts` | Bot info card generation | Functional |

### 1.6 Configuration Management

**File:** `src/config/index.ts`

- Centralizes all environment variables
- Provides `validateRequiredConfig()` for early validation
- Auto-adjusts `media.file_root` for test vs. production

### 1.7 Extended Client Interface

**File:** `src/helpers/interfaces.ts`

```typescript
export interface ExtendedClient extends Client {
    version?: string;
    commands?: Collection<string, any>;
}
```

---

## 2. Identified Architectural Smells

### 2.1 Loose Typing in Command Collection

**Location:** `src/commands/buildCommands.ts`

```typescript
client.commands = new Collection<string, any>();
const commands: Array<any> = [];
```

**Problem:** The `any` type defeats TypeScript's type safety. Command retrieval returns `any`, requiring runtime checks or type assertions.

**Impact:** No compile-time verification of command interface compliance. Potential runtime errors if command structure is incorrect.

### 2.2 Missing Command Interface Definition

**Problem:** There is no formal `Command` interface defined in the production code. The test utility defines one in `tests/utils/interfaces.ts`, but it is not used in production.

**Impact:** Inconsistent command implementations may go undetected until runtime.

### 2.3 Event Handlers Contain Business Logic

**Location:** `src/index.ts` (lines 25-65)

The `interactionCreate` and `messageCreate` handlers contain:
- Error handling logic
- Response manipulation (`deleteReply`, `followUp`)
- Conditional routing logic

**Impact:** Difficult to unit test event handling behavior. Tight coupling between event layer and command execution.

### 2.4 Inconsistent Dependency Injection

**Pterodactyl Commands:** Use proper DI with constructor injection
```typescript
class RegisterServer {
    constructor(db: Database, caller: Caller) { ... }
}
```

**Simple Commands:** Use direct module imports (static dependencies)
```typescript
import CALLER from '../helpers/caller.js';
const API = apis.quotedb;
```

**Impact:** Simple commands are harder to test in isolation. Inconsistent patterns across the codebase.

### 2.5 In-Memory State Without Persistence Strategy

**Location:** `src/commands/chat_ai.ts`

```typescript
const chatHistory: { [key: string]: [{ role: string, content: string }] } = {};
```

**Problems:**
- State is lost on restart
- No maximum history enforcement per server (only MAX_HISTORY_LENGTH per conversation)
- Memory grows unbounded across servers

**Impact:** Potential memory issues in high-usage scenarios. Loss of conversation context on restart.

### 2.6 Logger Singleton with Late Initialization

**Location:** `src/helpers/logging.ts`

```typescript
let logFile: string | undefined;
async init(sessionId: string) { ... }
async log(error: any) {
    if (!logFile) { console.error('Log file not initialized'); return; }
}
```

**Problem:** Logger fails silently if `init()` not called first. Any code that imports and uses LOGGER before init() will fail.

**Impact:** Potential silent logging failures. Race condition possibility.

### 2.7 Circular Import Risk in Error Builder

**Location:** `src/helpers/errorBuilder.ts`

Imports `EMBED_BUILDER` which imports `config` and `randomFile`. If `errorBuilder` were imported early in the boot sequence, circular dependencies could occur.

### 2.8 Mixed Export Patterns in Caller

**Location:** `src/helpers/caller.ts`

```typescript
export class Caller { ... }
export default { get, post };
```

**Problem:** Two different ways to use the same functionality - class instance or default module. This leads to inconsistent usage patterns.

### 2.9 Hardcoded GitHub Constants

**Location:** `src/helpers/infoCard.ts`

```typescript
const GITHUB_REPO_OWNER = 'Mirasii';
const GITHUB_REPO_NAME = 'BongBot';
```

**Impact:** If repository is forked or renamed, requires code change rather than configuration.

### 2.10 SetupCollector Binding Issue

**Location:** `src/commands/pterodactyl/master.ts` (line 112)

```typescript
setupCollector: new ServerStatus(DatabasePool.getInstance().getConnection(), new Caller()).setupCollector,
```

**Problem:** Creates a new `ServerStatus` instance just to get the method reference, but this instance has no reference to the actual execution context. The method relies on `this.db` and `this.caller` which come from a different instance.

---

## 3. Proposed Improvements

### 3.1 Define Formal Command Interface

Create in `src/helpers/interfaces.ts`:

```typescript
export interface Command {
    data: SlashCommandBuilder;
    execute(interaction: ChatInputCommandInteraction, client: ExtendedClient): Promise<CommandResponse>;
    fullDesc: {
        description: string;
        options: { name: string; description: string }[];
    };
    ephemeralDefer?: boolean;
    executeReply?(message: Message, client: ExtendedClient): Promise<CommandResponse>;
    executeLegacy?(message: Message, client: ExtendedClient): Promise<CommandResponse>;
    setupCollector?(interaction: ChatInputCommandInteraction, message: Message): Promise<void>;
}

export interface CommandResponse {
    content?: string;
    embeds?: EmbedBuilder[];
    files?: AttachmentBuilder[];
    components?: ActionRowBuilder[];
    ephemeral?: boolean;
    isError?: boolean;
}
```

### 3.2 Create Event Handler Service

Extract event handling logic into a dedicated service:

```typescript
// src/services/eventHandler.ts
export class EventHandler {
    constructor(
        private commands: Collection<string, Command>,
        private errorBuilder: typeof buildUnknownError
    ) {}

    async handleInteraction(interaction: Interaction): Promise<void> { ... }
    async handleMessage(message: Message): Promise<void> { ... }
}
```

### 3.3 Introduce Service Layer for External APIs

Create domain-specific service classes:

```typescript
// src/services/quoteService.ts
export class QuoteService {
    constructor(private caller: Caller, private config: QuoteConfig) {}

    async getQuotes(userId: string, count: number): Promise<Quote[]> { ... }
    async createQuote(quote: string, author: string): Promise<Quote> { ... }
}
```

### 3.4 Implement Chat History Persistence

Options:
1. **SQLite Table**: Store conversation history in database with TTL
2. **LRU Cache**: Implement bounded cache with eviction policy
3. **Redis**: If scaling is needed, use external cache

### 3.5 Standardize Dependency Injection

For all commands that need external services:

```typescript
// Factory function approach
export function createCommand(deps: { caller: Caller; config: Config }): Command {
    return {
        data: new SlashCommandBuilder()...,
        async execute(interaction, client) {
            // Use deps.caller, deps.config
        }
    };
}
```

### 3.6 Add Command Validation at Build Time

Enhance `buildCommands.ts`:

```typescript
function validateCommand(command: any): command is Command {
    return (
        command.data?.name &&
        typeof command.execute === 'function' &&
        command.fullDesc?.description
    );
}

for (const command of commandsArray) {
    if (!validateCommand(command)) {
        throw new Error(`Invalid command: ${command.data?.name || 'unknown'}`);
    }
    client.commands.set(command.data.name, command);
}
```

### 3.7 Configuration-Driven Repository Info

Move hardcoded values to config:

```typescript
// src/config/index.ts
github: {
    owner: process.env.GITHUB_OWNER || 'Mirasii',
    repo: process.env.GITHUB_REPO || 'BongBot',
}
```

### 3.8 Fix SetupCollector Context Issue

Modify master.ts to properly bind the collector:

```typescript
// Option 1: Store instance reference
let serverStatusInstance: ServerStatus | null = null;

async execute(interaction: ChatInputCommandInteraction) {
    // ...
    case 'manage':
        serverStatusInstance = new ServerStatus(db, caller);
        return await serverStatusInstance.execute(interaction);
}

setupCollector(interaction: ChatInputCommandInteraction, message: Message) {
    if (serverStatusInstance) {
        return serverStatusInstance.setupCollector(interaction, message);
    }
}
```

### 3.9 Scalability Considerations for Sharding

Current state assessment for sharding readiness:

| Component | Sharding Ready | Notes |
|-----------|---------------|-------|
| Commands | Yes | Stateless execution |
| Chat History | No | In-memory, per-process |
| Database | Partially | SQLite not suitable for concurrent writes |
| TikTok Notifier | No | Would send duplicate notifications |
| Logger | No | File per session, not shared |

Recommendations for sharding:
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
├── discord.js (Client, Events)
├── src/config/index.ts
├── src/helpers/logging.ts
├── src/helpers/errorBuilder.ts
│   ├── src/helpers/logging.ts
│   └── src/helpers/embedBuilder.ts
│       └── src/helpers/randomFile.ts
├── src/helpers/infoCard.ts
├── src/commands/buildCommands.ts
│   └── [All command modules]
└── src/commands/naniko.ts (TikTok)

Command Dependencies:
├── Pterodactyl commands → Database, Caller, shared utilities
├── Quote commands → Caller, QuoteBuilder
├── Chat AI → Caller, EmbedBuilder, Google AI SDK
└── Media commands → EmbedBuilder, config
```

---

## 6. Critical Files for Implementation

If implementing the proposed improvements, prioritize these files:

| File | Change |
|------|--------|
| `src/helpers/interfaces.ts` | Add Command interface and CommandResponse type definitions |
| `src/commands/buildCommands.ts` | Add type safety and validation to command registration |
| `src/index.ts` | Extract event handler logic into dedicated service class |
| `src/commands/pterodactyl/master.ts` | Fix setupCollector binding; pattern for subcommand architecture |
| `src/helpers/caller.ts` | Consolidate to single export pattern (class-only) for consistency |
