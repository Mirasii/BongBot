# BongBot Architecture

> A comprehensive architectural analysis of the BongBot Discord bot, covering command handling, event lifecycle, dependency patterns, and improvement recommendations.

---

## Table of Contents

1. [Current Architectural Overview](#1-current-architectural-overview)
2. [Identified Architectural Smells](#2-identified-architectural-smells)
3. [Proposed Improvements](#3-proposed-improvements)

---

## 1. Current Architectural Overview

### 1.1 High-Level Architecture

BongBot follows a **layered architecture** with three primary tiers:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Entry Point Layer                           │
│                    (src/index.ts)                               │
│              Bot initialization, event binding                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     Command Layer                               │
│                    (src/commands/*.ts)                          │
│     Slash commands, message handlers, subcommand routing        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  Service/Helper Layer                           │
│    (src/services/, src/helpers/, src/loggers/, src/config/)     │
│   Database access, HTTP calls, logging, embed building          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Entry Point and Bot Lifecycle

**File: `src/index.ts`**

The entry point orchestrates bot startup in this sequence:

1. **Config Validation** (line 13): `validateRequiredConfig()` fails fast if required environment variables are missing
2. **Session Setup** (line 20): Generates a unique `SESSION_ID` UUID for log correlation
3. **Command Registration** (line 21): `buildCommands(bot)` populates `bot.commands` Collection
4. **Event Binding** (lines 24-80): Registers three Discord event listeners
5. **Login** (line 101): `bot.login(token)` connects to Discord

**Event Handlers:**

| Event | Lines | Purpose |
|-------|-------|---------|
| `interactionCreate` | 24-44 | Handles slash command execution with deferred replies |
| `messageCreate` | 47-64 | Handles mention-based invocation (quote creation or chat) |
| `clientReady` | 67-80 | Registers commands with Discord API, sets presence, initializes TikTok notifier |

### 1.3 Command Structure

#### Standard Command Pattern

Commands export a consistent object structure with required and optional properties:

**Required exports:**
```typescript
export default {
    data: SlashCommandBuilder,        // Discord.js command definition
    execute(interaction, bot): Promise<Response>,  // Main handler
    fullDesc: { description: string, options: [] } // Help documentation
}
```

**Optional exports:**
- `executeReply(message, bot)` - For mention-based invocation without content (line 55 in index.ts)
- `executeLegacy(message, bot)` - For mention-based invocation with content (line 56 in index.ts)
- `msgFlag` - Message flags like `MessageFlags.Ephemeral`

**Example - Simple Command (`src/commands/ping.ts`):**
```typescript
export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Health Check BongBot'),
    async execute() {
        return 'Pong';
    },
    fullDesc: { options: [], description: "Praise unto you, my friend" }
}
```

### 1.4 Service Layer

#### LoggerService Singleton

**File: `src/services/logging_service.ts`**

Provides logger factory with multiple implementations:

```typescript
export default {
    get default(): Logger {
        // Returns FileLogger if DEFAULT_LOGGER=file, else DefaultLogger
    },
    async log(error: any) { /* Legacy compatibility wrapper */ },
    closeAll() { /* Cleanup for graceful shutdown */ }
}

class LoggerService {
    private connections: Map<string, Logger> = new Map();
    // Singleton pattern with lazy-loaded logger instances
}
```

**Logger Implementations:**

| Logger | File | Storage | Use Case |
|--------|------|---------|----------|
| DefaultLogger | `src/loggers/default_logger.ts` | SQLite database by date | Production |
| FileLogger | `src/loggers/file_logger.ts` | Flat file by session ID | Local development |

Both implement the `Logger` interface:
```typescript
interface Logger {
    info(message: string, stack?: string): void;
    debug(message: string, stack?: string): void;
    error(error: Error): void;
    close?(): void;
}
```

### 1.5 Helper/Data Layer

#### Caller Module

**File: `src/helpers/caller.ts`**

HTTP client wrapper providing `get` and `post` functions for external API calls:

```typescript
export default { get, post };
```

### 1.6 Configuration Management

**File: `src/config/index.ts`**

Centralized configuration object with:
- Grouped settings by feature (discord, apis)
- Environment variable validation (`validateRequiredConfig()`)
- Test environment detection via `JEST_WORKER_ID`

```typescript
const config = {
    discord: { apikey },
    apis: { quotedb, google, openai, googleai },
    media: { file_root: process.env.JEST_WORKER_ID ? './src/' : './dist/' }
};
```

### 1.7 Typing Strategy

**File: `src/helpers/interfaces.ts`**

Central interface definitions:

```typescript
export interface ExtendedClient extends Client {
    version?: string;
    commands?: Collection<string, any>;  // Note: 'any' type for commands
}

export interface Logger {
    info(message: string, stack?: string): void;
    debug(message: string, stack?: string): void;
    error(error: Error): void;
    close?(): void;
}

export interface GithubBranchResponse { ... }
export interface GithubTagResponse { ... }
export interface GithubInfo { ... }
```

---

## 2. Identified Architectural Smells

### 2.1 Type Safety Issues

#### 2.1.1 Extensive Use of `any` Type

**Severity: Medium**

Multiple locations use `any` type, defeating TypeScript's benefits:

| Location | Issue |
|----------|-------|
| `src/helpers/interfaces.ts:5` | `Collection<string, any>` for commands |
| `src/commands/buildCommands.ts:39-40` | `Array<any>` and `Collection<string, any>` |

**Impact:** Runtime type errors, reduced IDE support, harder refactoring.

#### 2.1.2 Missing Command Interface

**Severity: Medium**

No formal `Command` interface exists. Commands are loosely typed objects. This is evident in:
- `buildCommands.ts` line 40: Commands stored as `Collection<string, any>`
- `index.ts` line 29: `bot.commands!.get(interaction.commandName)` returns `any`

### 2.2 Inconsistent Patterns

#### 2.2.1 Mixed Export Styles

**Severity: Low**

| Pattern | Example |
|---------|---------|
| Default object literal | `src/commands/ping.ts` |
| Default function exports | `src/helpers/caller.ts` |
| Default class with static methods | `src/helpers/utilities.ts` |

#### 2.2.2 Direct Singleton Access

**Severity: Medium**

Commands access singletons directly rather than receiving dependencies via injection:

```typescript
// chat_ai.ts line 58
let resp = await CALLER.post(api.openai.url, ...);
```

### 2.3 State Management Concerns

#### 2.3.1 Global In-Memory State

**Severity: Medium**

**File: `src/commands/chat_ai.ts` line 12:**
```typescript
const chatHistory: { [key: string]: [{ "role": string, "content": string }] } = {};
```

This module-level state:
- Lost on bot restart
- Not shared across bot instances (scaling issue)
- Memory leak potential (only splices when exceeding 100 messages)

#### 2.3.2 TikTok Client Global Variable

**Severity: Low**

**File: `src/index.ts` line 15:**
```typescript
let tiktok_client;
```

Declared at module scope but assigned in event handler (line 76). The variable is never used after assignment.

### 2.4 Error Handling Gaps

#### 2.4.1 Inconsistent Error Response Format

**Severity: Low**

Error responses use different formats:
- `buildError()` returns structured error with embeds
- Some commands return plain strings on error
- Some throw and let index.ts handle with `buildUnknownError()`

---

## 3. Proposed Improvements

### 3.1 Type Safety Improvements

#### 3.1.1 Create Formal Command Interface

Add to `src/helpers/interfaces.ts`:

```typescript
export interface Command {
    data: SlashCommandBuilder;
    execute(interaction: ChatInputCommandInteraction, bot: ExtendedClient): Promise<CommandResponse>;
    fullDesc: {
        description: string;
        options: CommandOption[];
    };
    msgFlag?: MessageFlags;
    executeReply?(message: Message, bot: ExtendedClient): Promise<CommandResponse>;
    executeLegacy?(message: Message, bot: ExtendedClient): Promise<CommandResponse>;
}

export interface CommandOption {
    name: string;
    description: string;
}

export type CommandResponse =
    | string
    | { embeds: EmbedBuilder[]; files?: AttachmentBuilder[]; ephemeral?: boolean; isError?: boolean };
```

**Impact:**
- Enables type-safe command registration
- IDE autocomplete for command properties
- Compile-time validation of command structure

#### 3.1.2 Update ExtendedClient

```typescript
export interface ExtendedClient extends Client {
    version?: string;
    commands?: Collection<string, Command>;  // Changed from 'any'
}
```

### 3.2 Architectural Improvements

#### 3.2.1 Standardize Dependency Injection

Convert commands to accept dependencies via factory function or constructor for improved testability.

### 3.3 State Management Improvements

#### 3.3.1 Extract Chat History Service

Move chat history to a dedicated service with optional persistence:

```typescript
// src/services/chatHistoryService.ts
export class ChatHistoryService {
    private history: Map<string, ChatMessage[]> = new Map();

    addMessage(serverId: string, message: ChatMessage): void { /* ... */ }
    getHistory(serverId: string): ChatMessage[] { /* ... */ }
    clear(serverId: string): void { /* ... */ }
}
```

### 3.4 Error Handling Improvements

#### 3.4.1 Create Typed Errors

```typescript
// src/helpers/errors.ts
export class BongBotError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly userFacing: boolean = true
    ) {
        super(message);
    }
}

export class ApiError extends BongBotError { /* ... */ }
export class DatabaseError extends BongBotError { /* ... */ }
```

#### 3.4.2 Add Logging to Silent Catch Blocks

Replace silent catches with logged failures:

```typescript
// Before
} catch {
    return null;
}

// After
} catch (error) {
    this.logger.debug(`Failed to fetch resources: ${error.message}`);
    return null;
}
```

### 3.5 Testing Improvements

#### 3.5.1 Create Test Utilities Module

Consolidate test helpers into `tests/utils/mockFactories.ts` and remove `globalThis` usage.

---

## Summary

### Strengths to Preserve

1. **Clean Separation of Concerns** - Event listeners separate from command logic
2. **Centralized Configuration** - Fail-fast validation
3. **Modular Command Structure** - Easy to add new commands
4. **Comprehensive Test Coverage** - 99%+ coverage with proper mocking
5. **Logging Service with Multiple Backends** - SQLite for production, file for development

### Priority Improvements

| Priority | Improvement | Effort | Impact |
|----------|-------------|--------|--------|
| **High** | Add formal Command interface | Low | High |
| **Medium** | Standardize DI across all commands | Medium | High |
| **Low** | Extract chat history to dedicated service | Medium | Medium |

---

*Last updated: January 2026*
