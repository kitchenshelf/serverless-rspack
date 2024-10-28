# ⚡ serverless-rspack

[Serverless Framework](https://www.serverless.com) plugin for zero-config JavaScript and TypeScript code bundling using the high performance Rust-based JavaScript bundler [`rspack`](https://rspack.dev/guide/start/introduction)

[![Serverless][ico-serverless]][link-serverless]
[![Build Status][ico-build]][link-build]
[![NPM][ico-npm]][link-npm]

Look for the plugin under the [/libs](/libs/serverless-rspack//) directory.

Example serverless projects are under the [/examples](/examples) directory.

For Developers - [DEVELOPER.MD](./docs/DEVELOPER.md)


## Features

- From zero to hero: configuration possibilities range from zero-config to fully customizable
- Supports `sls package`, `sls deploy`
- Build and runtime performance at its core


## Table of Contents

- [Install](#install)
- [Plugin Options](#plugin-options)
  - [Examples](#examples)
  - [Options](#options)
    - [Read-only default Rspack Options](#read-only-default-rspack-options)
- [Supported Runtimes](#supported-runtimes)
- [Advanced Configuration](#advanced-configuration)
  - [External Dependencies](#external-dependencies)
- [Known Issues](#known-issues)


## Install

```sh
# install `serverless-rspack`
yarn add --dev @kitchenshelf/serverless-rspack
# or
npm install -D @kitchenshelf/serverless-rspack
# or
pnpm install -D @kitchenshelf/serverless-rspack
```

Add the following plugin to your `serverless.yml`:

```yaml
plugins:
  - @kitchenshelf/serverless-rspack
```


## Plugin Options

By default, no plugin options is required, but you can override the reasonable defaults via the `custom.rspack` section in the `serverless.yml` file.

```yml
custom:
  rspack:
    mode: 'production'
    esm: true
```

### Examples

See [example folder](../../examples) for example plugin option configuration.

### Plugin Options

| Option                        | Description                                                                                                                            | Default      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `zipConcurrency`              | The number of concurrent zip operations to run at once. eg. `8`. _NOTE_: This can be memory intensive and could produce slower builds. | `Infinity`   |
| `keepOutputDirectory`         | Keeps the `.rspack` output folder. Useful for debugging.                                                                               | `false`      |
| `stats`                       | Generate packaging information that can be used to analyze module dependencies and optimize compilation speed.                         | `false`      |
| [`config`](#config-file)      | rspack config options.                                                                                                                 | `undefined`  |
| `config.path`                 | Relative rspack config path.                                                                                                           | `undefined`  |
| [`config.strategy`](#config-file-merge-strategies) | Strategy to use when a rspack config is provided.                                                                 | `override`   |
| `esm`                         | Output format will be ESM (experimental).                                                                                              | `false`      |
| `mode`                        | Used to set the build mode of Rspack to enable the default optimization strategy (https://www.rspack.dev/config/mode).                 | `production` |
| `tsConfig`                    | Relative path to your tsconfig.                                                                                                        | `undefined`  |
| [`externals`](#external-dependencies) | Provides a way of excluding dependencies from the output bundles.                                                              | `undefined`  |
| [`scripts`](#scripts)         | Array of scripts to execute after your code has been bundled by rspack.                                                                | `undefined`  |
| [`doctor`](#doctor)           | Enable the `Rsdoctor` plugin.                                                                                                          | `undefined`  |

#### Read-only default Rspack Options

The following `rspack` options are automatically set and **cannot** be overwritten.

| Option        | Notes                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `entry`       | Handler entries are determined by the plugin                                                                     |
| `output.path` | The plugin needs to have full control over where bundles are output to, so it can correctly create zip artifacts |

#### Function Options

| Option   | Description                                                                                   | Default     |
| -------- | --------------------------------------------------------------------------------------------- | ----------- |
| `rspack` | Set this property on a function definition to force the handler to be processed by the plugin | `undefined` |



## Supported Runtimes

This plugin will automatically process any function that has a runtime that starts with `node` i.e `nodejs20.x`

### Non-Node functions

If you wish to use this plugin alongside non Node functions like Python or functions with images, this plugin will automatically ignore any function which does not match the supported runtimes.

If you wish to force a function to be process set `rspack: true` on a function definition. This is handy when using custom provided node runtimes i.e `  runtime: 'provided.al2023'`

⚠️ **Note: this will only work if your custom runtime and function are written in JavaScript/Typescript.
Make sure you know what you are doing when this option is set to `true`**


## Advanced Configuration

### Config file

Rspack configuration can be defined by a config file.

```yml
custom:
  esbuild:
    config:
      path: './rspack.config.js'
```

```js
// rspack.config.js
module.exports = (serverless) => {
  external: ['lodash'],
  // etc
};
```

#### Config file merge strategies

You can change how the plugin uses a provided config via the `strategy` option:

```yml
custom:
  esbuild:
    config:
      path: './rspack.config.js'
      strategy: combine
```

1. `override`: ***Default*** - Enables power users to provided their own complete Rspack configuration: `rspack.config.js` -> [`PluginReadOnlyDefaults`](#read-only-default-rspack-options)
2. `combine`: Enables providing partial configuration.  Merges all configuration together: `PluginDefaults` -> `PluginOptions` -> `rspack.config.js` -> [`PluginReadOnlyDefaults`](#read-only-default-rspack-options).

⚠️ **Note: Pay attention to the order in which configuration is combined. Each time the right take precedence. **

### External Dependencies

By providing a regex you can mark packages as `external` and they will be excluded from the output bundles.

```yml
custom:
  rspack:
    externals:
      - "^@aws-sdk\/.*$"
      - "^@smithy\/.*$"
      - '^isin-validator$'
```

### Scripts

Run custom shell commands after your code has been bundled by rspack. 

**Order**: `bundle` -> `scripts` -> `package`

Scripts are executed from the root of the service directory. This is useful for modifying the output of the build before it is packaged.

#### Usage

```yml
custom:
  rspack:
    externals: ['^@aws-sdk/.*$', '^sharp$'],
    scripts:
      - 'echo "First script"'
      - 'cd $KS_BUILD_OUTPUT_FOLDER/App1 && npx npm init -y && npm pkg delete main && npm install --force --os=linux --cpu=x64 --include=optional sharp @img/sharp-linux-x64'
      - 'echo "Last script"'
```
⚠️ **Note: Scripts run sequentially and will fail the build if any errors occur in any of the scripts.**

#### Environment Variables

The following environment variables are available to your scripts:

- `process.env`: All system environment variables.
- `KS_SERVICE_DIR`: The absolute path to the service directory (e.g. `/Users/user/code/my-service`).
- `KS_BUILD_OUTPUT_FOLDER`: The name of the build output folder (e.g. `.rspack`).
- `KS_PACKAGE_OUTPUT_FOLDER`: The name of the package output folder (e.g. `.serverless`).

### Doctor

[Rsdoctor](https://rsdoctor.dev/guide/start/intro) is a one-stop tool for diagnosing and analyzing the build process and build artifacts.

The serverless-rspack plugin will automatically enable the `Rsdoctor` plugin when the `doctor` option is provided.

```yml
custom:
  rspack:
    doctor: true
```

You can also provide an `outputDirectory` to specify where the report should be saved. By default, the report will be saved in the `.rspack` folder.

```yml
custom:
  rspack:
    doctor:
      doctor: true
      outputDirectory: ./doctor-report
```

⚠️ **Note: Rsdoctor is configured to run in [`brief`](https://rsdoctor.dev/guide/start/cicd#enabling-brief-mode) mode. If you want to use another mode, you can register `RsdoctorRspackPlugin` manually using the [rspack config option](#config-file).**

## Known Issues

  - Invoke Local does not work with ESM enabled when using serverless V3: [ISSUE-11308](https://github.com/serverless/serverless/issues/11308#issuecomment-1719297694)


---

---

---

Inspired by [serverless-plugin-typescript](https://github.com/prisma-labs/serverless-plugin-typescript), [serverless-webpack](https://github.com/serverless-heaven/serverless-webpack) and [serverless-esbuild](https://github.com/floydspace/serverless-esbuild)

[ico-serverless]: http://public.serverless.com/badges/v3.svg
[ico-npm]: https://img.shields.io/npm/v/@kitchenshelf/serverless-rspack.svg
[ico-build]: https://github.com/kitchenshelf/serverless-rspack/actions/workflows/ci.yml/badge.svg
[link-serverless]: https://www.serverless.com/
[link-npm]: https://www.npmjs.com/package/@kitchenshelf/serverless-rspack
[link-build]: https://github.com/kitchenshelf/serverless-rspack/actions/workflows/ci.yml
