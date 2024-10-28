import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';
import {
  type RspackOptions,
  type RspackPluginFunction,
  type RspackPluginInstance,
  type WebpackPluginFunction,
  type WebpackPluginInstance,
  rspack,
} from '@rspack/core';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { cwd } from 'node:process';
import { mergeWithCustomize } from 'webpack-merge';
import type { RspackServerlessPlugin } from './serverless-rspack.js';
import type { PluginOptions } from './types.js';

export async function bundle(
  this: RspackServerlessPlugin,
  entries: RspackOptions['entry']
) {
  let config: RspackOptions;

  if (this.providedRspackConfig && this.pluginOptions.config?.strategy) {
    this.log.verbose(
      `[Bundle] Config merge strategy: ${this.pluginOptions.config.strategy}`
    );
    if (this.pluginOptions.config.strategy === 'combine') {
      const baseConfig = defaultConfig(
        entries,
        this.pluginOptions,
        this.buildOutputFolderPath,
        this.log
      );

      const mergedConfig: RspackOptions = mergeWithCustomize({
        customizeArray: mergeArrayUniqueStrategy(this.log),
      })([baseConfig, this.providedRspackConfig]);

      config = enforcePluginReadOnlyDefaults(
        mergedConfig,
        this.buildOutputFolderPath,
        entries
      );
    } else {
      config = enforcePluginReadOnlyDefaults(
        this.providedRspackConfig,
        this.buildOutputFolderPath,
        entries
      );
    }
  } else {
    config = defaultConfig(
      entries,
      this.pluginOptions,
      this.buildOutputFolderPath,
      this.log
    );
  }
  this.log.verbose(
    `[Bundle] Bundling with config: ${safelyStringifyConfig(config)}`
  );
  const startBundle = Date.now();

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
          this.log?.error(`[Bundle] Failed to write stats file: ${error}`);
        }
      }
      this.log.verbose(
        `[Performance] Bundle total execution time for service ${
          this.serverless.service.service
        } [${Date.now() - startBundle} ms]`
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
    ...(buildOptions.tsConfig
      ? {
          tsConfig: path.resolve(cwd(), buildOptions.tsConfig),
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
    createDoctorPlugin(buildOptions),
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

function mergeArrayUniqueStrategy(logger: RspackServerlessPlugin['log']) {
  return (base: unknown, provided: unknown, key: string) => {
    if (key === 'plugins' && isPlugins(base) && isPlugins(provided)) {
      const plugins = [...provided];
      base.forEach((basePlugin) => {
        const matchedPlugin = provided.find(
          (providedPlugin) => basePlugin.name === providedPlugin.name
        );
        if (matchedPlugin) {
          logger.warning(
            `[Bundle] You have provided your own ${matchedPlugin.name}. This will override the default one provided by @kitchenshelf/serverless-rspack.`
          );
        } else {
          plugins.push(basePlugin);
        }
      });

      return plugins;
    }
    // Fall back to default merging
    return undefined;
  };
}

const enforcePluginReadOnlyDefaults: (
  config: RspackOptions,
  buildOutputFolderPath: string,
  entries: RspackOptions['entry']
) => RspackOptions = (config, buildOutputFolderPath, entries) => {
  return {
    ...config,
    entry: entries,
    optimization: {
      ...config.optimization,
      mangleExports: false,
    },
    output: {
      ...config.output,
      path: buildOutputFolderPath,
    },
  };
};

function isPlugins(
  a: unknown
): a is (
  | RspackPluginInstance
  | RspackPluginFunction
  | WebpackPluginInstance
  | WebpackPluginFunction
)[] {
  return Array.isArray(a);
}

function createDoctorPlugin(buildOptions: PluginOptions) {
  const isEnabled =
    enabledViaSimpleConfig(buildOptions.doctor) ||
    enabledViaConfigObject(buildOptions.doctor);

  return isEnabled
    ? new RsdoctorRspackPlugin({
        disableClientServer: true,
        mode: 'brief',
        reportDir: getReportDir(buildOptions.doctor),
      })
    : null;
}

function enabledViaSimpleConfig(
  doctor: PluginOptions['doctor']
): doctor is boolean {
  return typeof doctor === 'boolean' && doctor === true;
}

function enabledViaConfigObject(
  doctor: PluginOptions['doctor']
): doctor is Exclude<PluginOptions['doctor'], boolean | null | undefined> {
  return (
    typeof doctor === 'object' && doctor !== null && doctor.enable === true
  );
}

function getReportDir(doctor: PluginOptions['doctor']) {
  if (enabledViaConfigObject(doctor) && doctor.outputDirectory) {
    return doctor.outputDirectory;
  }
  return undefined;
}

function safelyStringifyConfig(config: RspackOptions) {
  return JSON.stringify(config, (key, value) => {
    if (key === 'plugins') {
      return value.map((plugin: any) => plugin.constructor.name);
    }
    return value;
  });
}
