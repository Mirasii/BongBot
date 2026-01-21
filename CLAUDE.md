# CLAUDE.md

# Project: BongBot

## Project Description
A Discord Bot built on NodeJS in TypeScript. Contains several functions, including an ai chatbot, pterodactyl server management, a quote API and others.

## Tech Stack:
- Bot: TypeScript
- Database: SQLite
- Testing: jest, ts-jest

## Code Conventions
- 4-space indentation
- PascalCase for class declarations
- snake_case preferred for file names and bot input variables
- camelCase for code variables and functions
- Functional components with Object-Orientated design where appropriate for code re-usabilities, e.g. separating database interactions from implementation for re-usability.
- Early return statements should be used to prevent nesting, e.g. instead of `if (condition) { ...logic }`, do `if (condition) { return; } ...logic`. Create helper functions if necessary to facilitate this.
- Files should be structured according to the following design implementation:
    - import statements
    - constant declarations
    - "main" function/export
    - helper functions, in the order that they appear
    - interface declarations

## Project Structure
- /src - Main source code
    - /commands - Slash commands
    - /config - Environment Variable config converted to an importable .js file for readability
    - /files - Media files used by various commands
    - /helpers - helper functions for re-usable code declarations
    - responses - Media files used by chatbot and error responses
- tests - Test Files
- data - .db files for SQLite usage (data folder is in gitignore and shouldn't be committed)

## Important Notes
- API calls should use caller utility in /src/helpers/caller.ts
- New components should have an accompanying test file and aim for 100% coverage
- Dependency Injection should be used to reduce individual complexity

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Build for production (minified)
npm run build

# Build for dev (requires docker)
npm run dev

# Run all tests with coverage
npm test

# Run a single test file
NODE_OPTIONS=--experimental-vm-modules npx jest tests/commands/ping.test.ts

# Run tests matching a pattern
NODE_OPTIONS=--experimental-vm-modules npx jest --testNamePattern="should return"
```

### Entry Point and Bot Lifecycle

`src/index.ts` bootstraps the bot:
1. Validates required config via `validateRequiredConfig()`
2. Initializes logging with a session UUID
3. Builds commands via `buildCommands()` which populates `bot.commands` Collection
4. Registers three event handlers: `interactionCreate` (slash commands), `messageCreate` (mention replies), `clientReady` (startup)
5. Calls `bot.login(token)`

### Command Structure

Commands follow a consistent pattern with required exports:
- `data`: SlashCommandBuilder definition
- `execute(interaction, bot)`: Main handler for slash commands
- `fullDesc`: Object with `description` and `options` for the help command

Optional command methods:
- `executeReply(message, bot)`: For mention-based invocation without content (used by quote creation)
- `executeLegacy(message, bot)`: For mention-based invocation with content (used by chat)
- `setupCollector(interaction, message)`: For commands needing button/select menu collectors
- `ephemeralDefer`: Boolean to make initial reply ephemeral

Commands are registered in `src/commands/buildCommands.ts` - add new commands to the `commandsArray`.

### Subcommand Pattern (Pterodactyl)

Complex features use a master command with subcommands. See `src/commands/pterodactyl/master.ts`:
- Master file defines the SlashCommandBuilder with `.addSubcommand()`
- Each subcommand is a separate class in its own file
- Master's `execute()` routes to subcommand handlers via switch statement
This is a new structure that is expected to be the standard structure going forward for when multiple commands interact with a system.

### Configuration

`src/config/index.ts` centralizes all environment variables. The `media.file_root` automatically adjusts between `./src/` (tests) and `./dist/` (production) based on `JEST_WORKER_ID`.

### Testing Setup

Tests use Jest with ESM support and MSW for HTTP mocking:
- `tests/setup.ts`: Global MSW server lifecycle (listen/reset/close)
- `tests/mocks/server.ts`: MSW server instance
- `tests/mocks/handlers.ts`: Default HTTP handlers

For tests requiring custom handlers, import `setupServer` from `msw/node` and create a local server. Use `jest.useFakeTimers()` for time-dependent tests.

### Database

`src/helpers/database.ts` wraps better-sqlite3 for the Pterodactyl server management feature. Database files are SQLite.

### Key Helpers

- `caller.ts`: HTTP client wrapper for external APIs
- `errorBuilder.ts`: Standardized error response formatting
- `embedBuilder.ts`: Discord embed construction utilities
- `quoteBuilder.ts`: Quote-specific embed formatting
