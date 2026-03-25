# Tauri Runtime Harness

This directory contains the real `Tauri` desktop runtime gate used by:

```sh
npm run e2e:tauri-runtime
```

## Current Purpose

Use this lane for coverage that depends on real desktop/runtime side effects and is not a good fit for the browser-backed `tauri-regression` harness.

Examples:

- filesystem-backed app moves
- profile and `user-settings.json` setup
- runtime performance sampling
- version restore behavior over real app files

## Optional Prelaunch Setup Hook

The WebdriverIO harness supports an optional prelaunch setup module through:

```sh
CHAEMERA_TAURI_RUNTIME_SETUP=relative/or/absolute/path/to/module.mjs
```

The module must export one of:

- `default`
- `setup`
- `setupRuntime`

The exported function is awaited before `tauri-driver` starts and receives:

```js
{
  rootDir,
  profileRoot,
  localAppDataDir,
  appDataDir,
}
```

This is intended for preparing runtime state before the app launches, for example:

- writing `user-settings.json`
- pre-seeding app files
- creating profile-local fixtures

## Example Shape

```js
export default async function setupRuntime({ appDataDir }) {
  // prepare files under the Tauri profile before launch
}
```
