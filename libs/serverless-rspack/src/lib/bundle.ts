import { RspackOptions, rspack } from '@rspack/core';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import Serverless from 'serverless';
import { defaultConfig } from './helpers.js';
import type { RspackServerlessPlugin } from './serverless-rspack.js';

export async function bundle(
  this: RspackServerlessPlugin,
  entries: Record<string, Serverless.FunctionDefinitionHandler>
) {
  const configPath = this.serverless.service.custom?.['rspack']?.config;

  let config: RspackOptions;

  if (configPath) {
    const providedConfig = (
      await import(path.join(this.serviceDirPath, configPath))
    ).default;
    config = {
      ...providedConfig,
      entry: entries,
      output: {
        ...providedConfig.output,
        path: this.workFolderPath,
      },
    };
  } else {
    config = defaultConfig(entries, this.buildOptions, this.workFolderPath);
  }
  this.log.info(config);

  return new Promise((resolve) => {
    rspack(config, (x, y) => {
      if (this.buildOptions?.stats) {
        const c = y?.toJson();
        try {
          writeFileSync(
            path.join(this.workFolderPath, 'stats.json'),
            JSON.stringify(c)
          );
        } catch (error) {
          this.log?.info(error);
        }
      }
      console.log('done');
      resolve('Success!'); // Yay! Everything went well!
    });
  });
}
