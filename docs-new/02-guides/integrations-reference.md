---
id: chaemera-guide-integrations-reference
title: Integrations Reference and Native vs MCP Comparison
type: guide
status: active
tags: [integrations, mcp, reference]
related:
  [
    [../00-navigation/INDEX.md],
    [
      ../04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md,
    ],
    [
      ../05-discussion-templates/discussions/2026-03-01-help-bot-oss-equivalent-issue.md,
    ],
  ]
depends_on: []
generated: false
source_of_truth: code-audit
outline: []
---

# Integrations Reference

## Scope

This document covers user-facing integrations that expose dedicated contracts, persistent state, or dedicated UI in Chaemera.

Covered:

1. GitHub
2. Supabase
3. Neon
4. Vercel
5. Language model providers
6. MCP servers

Out of scope:

1. branded support services such as help bot and release-note fetch paths
2. generic external links that do not create integration state inside the app

## Comparison Method

The native integration descriptions below are evidence-backed from the current codebase.

The MCP comparisons are architectural inferences, not audited evaluations of any specific third-party MCP server implementation.

Interpretation rule:

1. "Native is better" means "better for Chaemera's app-owned workflow".
2. It does not mean "better in all situations".
3. MCP remains the better choice for generic, replaceable, tool-style capabilities.

## Integration Model Used By Chaemera

Chaemera currently has three distinct integration classes.

| Class                         | Examples                                                       | What it owns                                                              | Best fit                                                    |
| ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Native app-linked integration | GitHub, Supabase, Neon, Vercel                                 | App-level linkage, dedicated UI, persistent app metadata, workflow events | Product workflows that must be part of the app itself       |
| Model provider integration    | OpenAI, Anthropic, Gemini, Ollama, LM Studio, custom providers | Provider credentials, model catalog, model picker, provider settings      | Choosing and configuring the model runtime                  |
| MCP extension layer           | MCP stdio/http servers and their tools                         | Generic external tool access plus per-tool consent                        | Extensible tool execution without product-specific coupling |

## High-Level Summary

| Integration              | Native capabilities in Chaemera                                                                | App-linked state                           | Better than an MCP analog when...                                 | MCP still wins when...                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------- |
| GitHub                   | Auth flow, repo linkage, branch sync, push/pull/rebase, conflicts, collaborators, clone/import | Yes                                        | The app must own git state and publish workflow                   | The goal is generic repo inspection or ad hoc automation |
| Supabase                 | Organization/project/branch selection, edge logs, app-project linking, test fake-connect       | Yes                                        | The app must remember which Supabase project belongs to which app | The goal is generic SQL/schema/tool access               |
| Neon                     | Project creation, branch creation, project inspection, app DB linkage                          | Yes                                        | The app must own preview/development DB branch state              | The goal is generic Postgres querying or admin tooling   |
| Vercel                   | Token storage, project creation/connection, deployment listing, disconnect                     | Yes                                        | Deployment must be part of the app's publish workflow             | The goal is generic deploy-related commands              |
| Language model providers | Provider settings, model catalogs, local model discovery, custom providers/models              | Mostly settings-level, not app row linkage | The app must own model selection and provider UX                  | MCP is not a real substitute here                        |
| MCP                      | External tool registry, tool listing, per-tool consent, runtime tool invocation                | No app-owned repo/project linkage          | The capability is generic and replaceable                         | The workflow must be first-class product behavior        |

## GitHub

### What The Native Integration Does

The native GitHub integration is not just "GitHub API access". It is a full app-owned git and publish surface.

Confirmed capabilities:

1. Start GitHub auth/device flow and react to `github:flow-update`, `github:flow-success`, and `github:flow-error`.
2. List repositories, list repo branches, and check repo availability.
3. Create a new GitHub repo for an app or connect an existing repo.
4. Run workspace-linked sync actions: `fetch`, `pull`, `push`, `rebase`, `rebase-abort`, `rebase-continue`, `merge-abort`.
5. Inspect local and remote branches plus git conflict and git state views.
6. Create, switch, delete, rename, and merge branches.
7. Inspect uncommitted files and commit changes.
8. List, invite, and remove collaborators.
9. Clone a repo from URL as an import path.
10. Persist app linkage in the app row through `githubOrg`, `githubRepo`, and `githubBranch`.
11. Surface the integration directly in the publish flow UI.

### Why It Is Stronger Than A Generic GitHub MCP Server

For Chaemera's product workflow, native GitHub is stronger because it owns the local workspace and app metadata.

Native GitHub can:

1. bind a specific app to a specific repo and branch
2. perform local git operations against that app's workspace path
3. coordinate rebase/conflict handling with app UI
4. participate in publish/import flows instead of existing as a detached tool

A generic GitHub MCP server usually excels at:

1. repo inspection
2. issues, PRs, comments, metadata
3. ad hoc API calls

That is useful, but it does not replace app-owned repo linkage and local git orchestration.

### Best Use Boundary

Use native GitHub when:

1. the app must know which repo and branch it is attached to
2. local git state matters
3. publish/import UX must be first-class

Use a GitHub MCP server when:

1. the model only needs remote GitHub tools
2. the workflow does not need persistent app linkage

### Evidence

- path: `../src/ipc/types/github.ts`
  symbol: `githubContracts and githubEvents`
  lines: 127-335
- path: `../src/ipc/handlers/github_handlers.ts`
  symbol: `registerGitHubHandlers`
  lines: 1316-1393
- path: `../src/components/GitHubConnector.tsx`
  symbol: `GitHubConnector and UnconnectedGitHubConnector`
  lines: 74-1248
- path: `../src/components/preview_panel/PublishPanel.tsx`
  symbol: `PublishPanel`
  lines: 11-171
- path: `../src/db/schema.ts`
  symbol: `apps github linkage columns`
  lines: 36-38

## Supabase

### What The Native Integration Does

The native Supabase integration is an app-linked project integration, not just a database tool hook.

Confirmed capabilities:

1. List connected Supabase organizations.
2. Delete a connected organization.
3. List projects across connected organizations.
4. List branches for a selected Supabase project.
5. Fetch edge-function logs for the selected project.
6. Bind a Supabase project or branch to an app.
7. Remove that app-to-project binding.
8. Run a fake connect flow for tests by simulating a successful OAuth return and attaching a fake project.
9. Surface this linkage through `SupabaseConnector` and `useSupabase`.
10. Persist app linkage through `supabaseProjectId`, `supabaseParentProjectId`, and `supabaseOrganizationSlug`.

The repo also contains Supabase-aware prompt assets, which shows that Supabase status is treated as part of the product workflow rather than as an external tool only.

### Why It Is Stronger Than A Generic Supabase MCP Server

For Chaemera's workflow, native Supabase is stronger when the app must remember and present one canonical Supabase project per app.

Native Supabase can:

1. attach a specific Supabase project or branch to a specific app
2. drive app UI from that binding
3. treat Supabase availability as part of prompt/context behavior
4. support deterministic test flows through fake connect

A generic Supabase MCP server is better for:

1. generic SQL execution
2. schema inspection
3. ad hoc database and function tooling

That is useful, but it is not the same as owning the app-to-project relationship in the product.

### Best Use Boundary

Use native Supabase when:

1. one app must own one selected Supabase project context
2. UI and prompts must react to that project state
3. test flows need deterministic attach/detach behavior

Use a Supabase MCP server when:

1. the goal is generic database or admin tooling
2. persistent app linkage is not required

### Evidence

- path: `../src/ipc/types/supabase.ts`
  symbol: `supabaseContracts`
  lines: 84-127
- path: `../src/ipc/handlers/supabase_handlers.ts`
  symbol: `registerSupabaseHandlers`
  lines: 25-207
- path: `../src/hooks/useSupabase.ts`
  symbol: `useSupabase`
  lines: 22-190
- path: `../src/components/SupabaseConnector.tsx`
  symbol: `SupabaseConnector`
  lines: 52-240
- path: `../src/db/schema.ts`
  symbol: `apps supabase linkage columns`
  lines: 39-47
- path: `../src-tauri/prompt_assets/supabase_available_system_prompt.txt`
  symbol: `Supabase instructions prompt`
  lines: 1-348
- path: `../src-tauri/prompt_assets/supabase_not_available_system_prompt.txt`
  symbol: `Supabase unavailable prompt`
  lines: 1-31

## Neon

### What The Native Integration Does

The native Neon integration is aimed at app-owned database project provisioning and branch awareness.

Confirmed capabilities:

1. Create a Neon project for an app.
2. Create branch structure during project setup, including a preview branch.
3. Persist Neon linkage into the app row.
4. Fetch Neon project information and branch inventory for the selected app.
5. Show Neon project and branch information in `NeonConfigure`.
6. Expose a test/deep-link path through `fakeConnect`.

### Why It Is Stronger Than A Generic Neon Or Postgres MCP Server

For Chaemera's workflow, native Neon is stronger when the app must own database project lifecycle and branch topology.

Native Neon can:

1. provision a project specifically for an app
2. create development or preview branches as part of product setup
3. persist branch IDs and reuse them later
4. surface this state directly in the app's configure UI

A generic Neon/Postgres MCP server is better for:

1. running queries
2. inspecting schemas
3. generic database troubleshooting

That is valuable, but it does not replace app-owned DB provisioning and branch mapping.

### Best Use Boundary

Use native Neon when:

1. database branch topology belongs to the app lifecycle
2. the app must remember which Neon project and branches it owns

Use a Neon/Postgres MCP server when:

1. the need is generic DB access or inspection
2. the app does not need to own project provisioning

### Evidence

- path: `../src/ipc/types/neon.ts`
  symbol: `neonContracts`
  lines: 59-77
- path: `../src/ipc/handlers/neon_handlers.ts`
  symbol: `registerNeonHandlers`
  lines: 24-191
- path: `../src/components/NeonConnector.tsx`
  symbol: `NeonConnector`
  lines: 13-74
- path: `../src/components/preview_panel/NeonConfigure.tsx`
  symbol: `NeonConfigure`
  lines: 34-168
- path: `../src/db/schema.ts`
  symbol: `apps neon linkage columns`
  lines: 48-50

## Vercel

### What The Native Integration Does

The native Vercel integration is the deploy/publish side of the product.

Confirmed capabilities:

1. Save and validate a Vercel access token.
2. List Vercel projects.
3. Check whether a project name is available.
4. Create a new Vercel project.
5. Connect an app to an existing Vercel project.
6. Fetch deployments for the linked app.
7. Disconnect an app from its Vercel project.
8. Persist Vercel linkage in the app row through project id, project name, team id, and deployment URL.
9. Surface the integration directly in the publish flow UI.

### Why It Is Stronger Than A Generic Vercel MCP Server

For Chaemera's workflow, native Vercel is stronger when deployment is part of the app's publish lifecycle.

Native Vercel can:

1. bind one app to one deployment project
2. show deployment state in product UI
3. remember deployment identifiers for later publish work
4. live directly inside the publish panel next to GitHub

A generic Vercel or deployment MCP server is better for:

1. isolated deployment commands
2. generic project inspection
3. one-off remote automation

It does not automatically replace persistent app-to-deployment linkage.

### Best Use Boundary

Use native Vercel when:

1. deployment belongs to the product's publish workflow
2. the app must remember its remote deployment identity

Use a deploy-style MCP server when:

1. deployment is just another tool action
2. persistent app linkage is unnecessary

### Evidence

- path: `../src/ipc/types/vercel.ts`
  symbol: `vercelContracts`
  lines: 91-129
- path: `../src/ipc/handlers/vercel_handlers.ts`
  symbol: `registerVercelHandlers`
  lines: 541-567
- path: `../src/components/VercelConnector.tsx`
  symbol: `VercelConnector`
  lines: 44-658
- path: `../src/hooks/useVercelDeployments.ts`
  symbol: `useVercelDeployments`
  lines: 5-48
- path: `../src/components/preview_panel/PublishPanel.tsx`
  symbol: `PublishPanel`
  lines: 11-171
- path: `../src/db/schema.ts`
  symbol: `apps vercel linkage columns`
  lines: 51-54

## Language Model Providers

### What The Native Integration Does

This integration class handles the model runtime itself, not a tool extension.

Confirmed capabilities:

1. Enumerate cloud, local, and custom providers.
2. Enumerate models for a specific provider or across all providers.
3. Create, edit, and delete custom providers.
4. Create and delete custom models.
5. Discover local models from Ollama and LM Studio.
6. Expose provider metadata such as free-tier flags, website URLs, environment variable names, gateway prefixes, and secondary-provider grouping.
7. Drive the `ModelPicker` and the provider settings pages from that catalog.

Confirmed built-in provider families in the current code:

1. OpenAI
2. Anthropic
3. Google Gemini
4. Google Vertex AI
5. OpenRouter
6. Azure OpenAI
7. xAI
8. AWS Bedrock
9. `auto` legacy provider family
10. local providers: Ollama and LM Studio

### Why This Is Not Really An MCP Replacement Problem

Model providers and MCP solve different problems.

Native model-provider integration controls:

1. which model is selected
2. how the model is authenticated
3. what the model catalog looks like
4. local model discovery
5. model metadata such as context window and temperature defaults

MCP does not replace that. MCP gives tools to the chosen model after the model runtime already exists.

So the correct framing is:

1. model-provider integrations are foundational runtime configuration
2. MCP is an extension layer on top of that runtime

### Best Use Boundary

Use native model-provider integration when:

1. the app must select and configure the underlying model runtime
2. the UI needs first-class provider and model settings

Use MCP when:

1. the chosen model needs extra tools
2. the problem is tool execution, not model selection

### Evidence

- path: `../src/ipc/types/language-model.ts`
  symbol: `languageModelContracts`
  lines: 69-143
- path: `../src/ipc/handlers/language_model_handlers.ts`
  symbol: `registerLanguageModelHandlers`
  lines: 31-369
- path: `../src/ipc/shared/language_model_constants.ts`
  symbol: `MODEL_OPTIONS, CLOUD_PROVIDERS, LOCAL_PROVIDERS, PROVIDER_TO_ENV_VAR`
  lines: 1-576
- path: `../src/components/ModelPicker.tsx`
  symbol: `ModelPicker`
  lines: 27-576
- path: `../src/components/settings/ProviderSettingsPage.tsx`
  symbol: `ProviderSettingsPage`
  lines: 31-315
- path: `../src/hooks/useLocalModels.ts`
  symbol: `useLocalModels`
  lines: 16-27
- path: `../src/hooks/useLMStudioModels.ts`
  symbol: `useLMStudioModels`
  lines: 16-24

## MCP Servers

### What The MCP Layer Does

The MCP layer is the generic tool-extension system.

Confirmed capabilities:

1. Register external MCP servers.
2. Update and delete MCP server definitions.
3. Support `stdio` and `http` runtime transports.
4. Store command, args, env, headers, URL, and enabled state for a server.
5. List tools exposed by a server.
6. Maintain per-tool consent records.
7. Request runtime consent via `mcp:tool-consent-request`.
8. Resolve that request through `accept-once`, `accept-always`, or `decline`.
9. Manage MCP settings through `ToolsMcpSettings`.
10. Let the user adjust consent from the tool picker UI.

Important current nuance:

1. the schema enum includes `sse`
2. the current runtime manager only constructs `stdio` and `http`
3. unsupported transport values throw at runtime

### Why MCP Is Different From Native Integrations

MCP is intentionally generic.

It does not model:

1. app-owned repo linkage
2. app-owned deployment linkage
3. app-owned cloud project linkage
4. dedicated publish/configure product flows

That is why MCP should be treated as the extension layer, not as the default replacement for every native integration.

### When MCP Is Better

MCP is better when:

1. the capability should stay replaceable
2. the app does not need to own persistent workflow state
3. the model only needs tool access at execution time

### Evidence

- path: `../src/ipc/types/mcp.ts`
  symbol: `mcpContracts and mcpEvents`
  lines: 10-194
- path: `../src/ipc/handlers/mcp_handlers.ts`
  symbol: `registerMcpHandlers`
  lines: 23-199
- path: `../src/ipc/utils/mcp_manager.ts`
  symbol: `MCPManager transport construction`
  lines: 16-49
- path: `../src/components/settings/ToolsMcpSettings.tsx`
  symbol: `ToolsMcpSettings`
  lines: 301-542
- path: `../src/components/McpToolsPicker.tsx`
  symbol: `McpToolsPicker`
  lines: 19-94

## Native vs MCP Decision Rules

Use a native integration when the feature needs:

1. persistent app-owned linkage
2. dedicated product UI
3. branch/project/repo/deployment identity stored in app state
4. deep-link or auth lifecycle tied to the app
5. publish/configure behavior that must feel first-class

Use MCP when the feature needs:

1. generic external tools
2. replaceable or optional capability
3. runtime consent control
4. minimal product-specific state

## Current Open Questions

1. `help bot` is intentionally not treated as a normal native integration yet.
2. The legacy `auto` / branded cloud-provider path is still parity debt and should not be treated as a long-term OSS baseline.
3. Exact parity against any specific third-party MCP server is `UNKNOWN` unless that server is audited separately.

## Links

- [[../00-navigation/INDEX.md]]
- [[../04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[../05-discussion-templates/discussions/2026-03-01-help-bot-oss-equivalent-issue.md]]
