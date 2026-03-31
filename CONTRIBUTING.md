# Contributing

Before opening a pull request, please open an issue or discussion and confirm that the proposed change fits the current direction of Chaemera. Keeping the product cohesive sometimes means narrowing scope, deferring work, or choosing a smaller first step.

- For a high-level overview of the app architecture, see the [Architecture Guide](./docs/architecture.md).
- For a detailed architecture on the newer agent-oriented runtime work, see the [Agent Architecture Guide](./docs/agent_architecture.md).
- For the repository-specific guidance used during active development, also review `AGENTS.md` and the relevant files under `rules/`.

## More than code contributions

Non-code contributions are welcome too: bug reports, feature requests, documentation fixes, design feedback, testing notes, and careful reproduction steps all help.

## Development

Chaemera is a desktop app in active migration to a Tauri-native architecture.

**Install dependencies:**

```sh
npm install
```

**Create the userData directory (required for database)**

```sh
# Unix/macOS/Linux:
mkdir -p userData

# Windows PowerShell (run only if folder doesn't exist):
mkdir userData

# Windows Command Prompt (run only if folder doesn't exist):
md userData
```

**Generate DB migrations:**

If you change the DB schema (i.e. `src/db/schema.ts`), you will need to generate a DB migration.

```sh
npm run db:generate
```

> If you want to discard a DB migration, you will likely need to reset your database which you can do by deleting the file in `userData/sqlite.db`.

**Run locally:**

```sh
npm start
```

Depending on what you are working on, you may also need the Tauri build and runtime flows described in `AGENTS.md`.

## Contribution Terms

By submitting a contribution to this repository, you agree that your contribution will be licensed under the repository license, Apache 2.0.

This repository uses the Developer Certificate of Origin (DCO) instead of a Contributor License Agreement.

Please sign your commits with a `Signed-off-by:` line, for example:

```sh
git commit -s -m "your message"
```

The sign-off certifies that you have the right to submit the change under the project's open-source license terms. See `DCO.md` for the full text.

## Setup

If you'd like to contribute a pull request, we highly recommend setting the pre-commit hooks which will run the formatter and linter before each git commit. This is a great way of catching issues early on without waiting to run the GitHub Actions for your pull request.

Simply run this once in your repo:

```sh
npm run init-precommit
```

## Testing

### Unit tests

```sh
npm test
```

### E2E tests

Build the app for E2E testing:

```sh
npm run build
```

> Note: you only need to re-build the app when changing the app code. You don't need to re-build the app if you're just updating the tests.

Run the whole e2e test suite:

```sh
npm run e2e
```

Run a specific test file:

```sh
npm run e2e e2e-tests/context_manage.spec.ts
```

Update snapshots for a test:

```sh
npm run e2e e2e-tests/context_manage.spec.ts -- --update-snapshots
```

## Code reviews

Code review should stay practical and product-focused. If a review comment is not applicable, leave a brief explanation and resolve it when appropriate.

You can also do local code reviews with the following tools:

- Codex CLI - `codex` -> `/review`
- Claude Code CLI - `claude` -> `/review`
