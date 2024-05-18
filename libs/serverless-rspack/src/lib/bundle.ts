import { RspackOptions, rspack } from '@rspack/core';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { cwd } from 'node:process';
import type { RspackServerlessPlugin } from './serverless-rspack.js';
import type { PluginOptions } from './types.js';

export async function bundle(
  this: RspackServerlessPlugin,
  entries: RspackOptions['entry']
) {
  let config: RspackOptions;
  if (this.providedRspackConfig) {
    config = {
      ...this.providedRspackConfig,
      entry: entries,
      optimization: {
        ...this.providedRspackConfig.optimization,
        mangleExports: false,
      },
      output: {
        ...this.providedRspackConfig.output,
        path: this.buildOutputFolderPath,
      },
    };
  } else {
    config = defaultConfig(
      entries,
      this.pluginOptions,
      this.buildOutputFolderPath,
      this.log
    );
  }
  this.log.verbose('Bundling with config: ', config);
  const startPack = Date.now();

  return new Promise((resolve) => {
    rspack(config, (x, y) => {
      if (this.pluginOptions.stats) {
        const c = y?.toJson();
        try {
          writeFileSync(
            path.join(this.buildOutputFolderPath, 'stats.json'),
            JSON.stringify(c)
          );
        } catch (error) {
          this.log?.error('Failed to write stats file: ', error);
        }
      }
      this.log.verbose(
        `[Performance] Bundle service ${this.serverless.service.service} [${
          Date.now() - startPack
        } ms]`
      );
      resolve('Success!'); // Yay! Everything went well!
    });
  });
}

const esmOutput = {
  chunkFormat: 'module',
  chunkLoading: 'import',
  library: {
    type: 'module',
  },
};

const defaultConfig: (
  entries: RspackOptions['entry'],
  buildOptions: PluginOptions,
  workFolderPath: string,
  logger: RspackServerlessPlugin['log']
) => RspackOptions = (entries, buildOptions, workFolderPath, logger) => ({
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
  ...(buildOptions.externals?.length && buildOptions.externals?.length > 0
    ? {
        externals: [
          ({ request }: any, callback: any) => {
            const isExternal = buildOptions?.externals?.some((external) => {
              return new RegExp(external).test(request);
            });
            if (isExternal) {
              logger.verbose(`[Bundle] Marking ${request} as external`);
              return callback(null, 'node-commonjs ' + request);
            }
            callback();
          },
        ],
      }
    : {}),
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
  optimization: {
    mangleExports: false,
  },
  output: {
    library: { type: 'commonjs2' },
    ...(buildOptions.esm ? esmOutput : {}),
    path: workFolderPath,
  },
});
