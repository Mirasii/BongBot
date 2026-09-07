# Contributing

For the branch-and-pull-request workflow, see [Contributing in the README](README.md#contributing). The rules below apply on top of it whenever AI is involved.

## AI Contributions

AI-assisted contributions are welcome in this repo. This section sets the rules for making them. It covers how AI may be used and what the contributor is accountable for. The code itself must still meet the repo's normal quality bar like any other contribution.

These rules apply whether AI wrote a whole file or just autocompleted a line.

### 1. You own what you submit

A contributor is fully responsible for the code in their pull request, no matter how much of it an AI wrote. "The AI did it" is not a defence for a bug, a security hole, or a design that does not fit.

Before you open the PR:

- **You understand it.** You can explain what every part does and why it is there. If a reviewer challenges a line, you answer for it in the PR. You do not go back and ask the AI what it meant.
- **You verified it by hand.** You read the diff yourself, rather than skimming the AI's summary of it.
- **You tested it.** It builds, `npm test` is green, and new code carries its own tests. Running the tests is your job, not the reviewer's.
- **It meets the repo's conventions**, even where the surrounding code does not. AI tools copy nearby patterns, including the ones we are migrating away from. Hold the new code to the standard.

### 2. Be transparent about AI use

If AI was used, say so in the PR description. State which tool, and point at where.

- If it wrote or shaped the whole contribution: **"Claude was used throughout."**
- If it was used only in parts, name them: **"Claude was used for `database.ts` and its tests; the command wiring is hand-written."**

The point is not to gate AI contributions. It is to let a reviewer judge how hard to look. Silent AI use erodes that trust for everyone.

### 3. Pull requests carry work, not proposals

A PR implements an agreed change. It is not the place to float a new feature or a new idea for the first time. Those start as an **issue**, where the idea can be discussed before anyone, human or AI, spends effort building it.

This matters more with AI, which makes it cheap to generate a large speculative PR nobody asked for. Raise the issue first, then build once there is agreement on the shape.

### 4. Scope and hygiene

- **One PR, one concern.** An AI told to "clean things up" will sprawl across the repo. Keep the diff focused on the agreed change.
- **No unrequested rewrites.** Older code moves toward the standards when it is touched for another reason, not in a drive-by AI refactor.
- **No committed secrets or generated cruft.** Review what you are staging. AI runs leave scratch files, stray directories, and pasted keys behind, and none of that belongs in the commit.

### Checklist

Before submitting an AI-assisted PR:

- [ ] I understand every change and can defend it in review
- [ ] I read the full diff and tested it locally; `npm test` is green
- [ ] The code meets the repo's conventions, not just the style of the code around it
- [ ] The PR description states that AI was used and where
- [ ] This PR implements an agreed change, not a new idea that skipped the issue stage
- [ ] One concern, no stray files, no secrets
