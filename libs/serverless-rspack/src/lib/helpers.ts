import { RspackOptions, rspack } from '@rspack/core';
import path from 'node:path';
import { cwd } from 'node:process';
import type { PluginConfiguration } from './types.js';

export const humanSize = (size: number) => {
  const exponent = Math.floor(Math.log(size) / Math.log(1024));
  const sanitized = (size / 1024 ** exponent).toFixed(2);

  return `${sanitized} ${['B', 'KB', 'MB', 'GB', 'TB'][exponent]}`;
};

const esmOutput = {
  chunkFormat: 'module',
  chunkLoading: 'import',
  library: {
    type: 'module',
  },
};

export const defaultConfig: (
  entries: RspackOptions['entry'],
  buildOptions: PluginConfiguration,
  workFolderPath: string
) => RspackOptions = (entries, buildOptions, workFolderPath) => ({
  mode: buildOptions.mode,
  entry: entries,
  target: 'node',
  experiments: {
    outputModule: buildOptions.esm,
  },
  resolve: {
    extensions: ['...', '.ts', '.tsx', '.jsx'],
    ...(buildOptions.tsConfigPath
      ? {
          tsConfigPath: path.resolve(cwd(), buildOptions.tsConfigPath),
        }
      : {}),
  },
  plugins: [
    new rspack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env['NODE_ENV']),
    }),
    new rspack.ProgressPlugin({}),
    new rspack.node.NodeTargetPlugin(),
  ].filter(Boolean),

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            target: 'es2020',
            jsc: {
              parser: {
                syntax: 'typescript',
              },
            },
          },
        },
      },
    ],
  },
  output: {
    ...(buildOptions.esm ? esmOutput : {}),
    path: workFolderPath,
  },
});
