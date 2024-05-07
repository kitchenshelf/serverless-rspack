import { RspackOptions, rspack } from '@rspack/core';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { defaultConfig } from './helpers.js';
import type { RspackServerlessPlugin } from './serverless-rspack.js';

export async function bundle(
  this: RspackServerlessPlugin,
  entries: RspackOptions['entry']
) {
  let config: RspackOptions;
  if (this.providedRspackConfig) {
    config = {
      ...this.providedRspackConfig,
      entry: entries,
      output: {
        ...this.providedRspackConfig.output,
        path: this.buildOutputFolderPath,
      },
    };
  } else {
    config = defaultConfig(
      entries,
      this.pluginConfig,
      this.buildOutputFolderPath
    );
  }
  this.log.verbose('Bundling with config: ', config);
  const startPack = Date.now();

  return new Promise((resolve) => {
    rspack(config, (x, y) => {
      if (this.pluginConfig.stats) {
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
        `[PERFORMANCE] Bundle service ${this.serverless.service.service} [${
          Date.now() - startPack
        } ms]`
      );
      resolve('Success!'); // Yay! Everything went well!
    });
  });
}
