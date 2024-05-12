# ⚡ serverless-rspack

[Serverless Framework](https://www.serverless.com) plugin for zero-config JavaScript and TypeScript code bundling using the high performance Rust-based JavaScript bundler [`rspack`](https://www.rspack.dev/guide/introduction.html)

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
- [Configuration](#configuration)
  - [Examples](#examples)
  - [Options](#options)
    - [Default Rspack Options](#default-rspack-options)
- [Supported Runtimes](#supported-runtimes)
- [Advanced Configuration](#advanced-configuration)
  - [External Dependencies](#external-dependencies)


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

## Configuration

By default, no configuration is required, but you can override the reasonable defaults via the `custom.rspack` section in the `serverless.yml` file.

```yml
custom:
  rspack:
    mode: 'production',
    esm: true
```

### Examples

See [example folder](../../examples) for some example configurations.

### Options

| Option                 | Description                                                        | Default                           |
|------------------------|--------------------------------------------------------------------|-----------------------------------|
| `zipConcurrency`       | The number of concurrent zip operations to run at once. eg. `8`. _NOTE_: This can be memory intensive and could produce slower builds.                                                                                       | `Infinity`                        |
| `keepOutputDirectory`  | Keeps the `.rspack` output folder. Useful for debugging.           | `false`                           |
| `stats`                | Generate packaging information that can be used to analyze module dependencies and optimize compilation speed.  | `false`         |
| `config`  | Relative rspack config path          | `undefined`                            |
| `esm`  | Output format will be ESM (experimental)          | `false`                           |
| `mode`  | Used to set the build mode of Rspack to enable the default optimization strategy (https://www.rspack.dev/config/mode)          | `production`                           |
| `tsConfigPath`  | Relative path to your tsconfig          | `undefined`                            |
| `externals`  | Provides a way of excluding dependencies from the output bundles           | `undefined`                          |

#### Default Rspack Options

The following `rspack` options are automatically set and **cannot** be overwritten.

| Option        | Notes                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `entry`       | Handler entries are determined by the plugin                                                                        |
| `output.path` | The plugin needs to have full control over where bundles are output to, so it can correctly create zip artifacts    |


#### Function Options

| Option        | Description                                                          | Default     |
| ------------- | -------------------------------------------------------------------- | ----------- |
| `rspack`      | Set this property on a function definition to force the handler to be processed by the plugin | `undefined`  |

## Supported Runtimes

This plugin will automatically process any function that has a runtime that starts with `node` i.e `nodejs20.x`

### Non-Node functions

If you wish to use this plugin alongside non Node functions like Python or functions with images, this plugin will automatically ignore any function which does not match the supported runtimes.

If you wish to force a function to be process set  `rspack: true` on a function definition.  This is handy when using custom provided node runtimes i.e `  runtime: 'provided.al2023'`

⚠️ **Note: this will only work if your custom runtime and function are written in JavaScript/Typescript.
Make sure you know what you are doing when this option is set to `true`**


## Advanced Configuration

### Config file

Rspack configuration can be defined by a config file.

```yml
custom:
  esbuild:
    config: './rspack.config.js'
```

```js
// rspack.config.js
module.exports = {
  external: ['lodash'],
  // etc
};
```

### External Dependencies

By providing a regex you can mark packages as `external` and they will be excluded from the output bundles. 

```yml
custom:
  rspack:
    externals: 
      - "^@aws-sdk\/.*$"
      - "^@smithy\/.*$"
      - 'isin-validator'
```
---
---
---


Inspired by [serverless-plugin-typescript](https://github.com/prisma-labs/serverless-plugin-typescript), [serverless-webpack](https://github.com/serverless-heaven/serverless-webpack) and [serverless-esbuild](https://github.com/floydspace/serverless-esbuild)


[ico-serverless]: http://public.serverless.com/badges/v3.svg
[ico-npm]: https://img.shields.io/npm/v/@kitchenshelf/serverless-rspack.svg
[ico-build]: https://github.com/kitchenshelf/serverless-rspack/actions/workflows/ci.yml/badge.svg


[link-serverless]: https://www.serverless.com/
[link-npm]: https://www.npmjs.com/package/@kitchenshelf/serverless-rspack.svg
[link-build]: https://github.com/kitchenshelf/serverless-rspack/actions/workflows/ci.yml
