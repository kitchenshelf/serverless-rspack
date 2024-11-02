import type { RspackServerlessPlugin } from '../serverless-rspack.js';
import path from 'node:path';

export async function Initialize(this: RspackServerlessPlugin) {
  this.pluginOptions = this.getPluginOptions();

  if (this.pluginOptions.config?.path) {
    const configPath = path.join(
      this.serviceDirPath,
      this.pluginOptions.config.path
    );
    if (!this.serverless.utils.fileExistsSync(configPath)) {
      throw new this.serverless.classes.Error(
        `Rspack config does not exist at path: ${configPath}`
      );
    }
    const configFn = (await import(configPath)).default;

    if (typeof configFn !== 'function') {
      throw new this.serverless.classes.Error(
        `Config located at ${configPath} does not return a function. See for reference: https://github.com/kitchenshelf/serverless-rspack/blob/main/README.md#config-file`
      );
    }

    this.providedRspackConfig = await configFn(this.serverless);
  }

  const functions = this.serverless.service.getAllFunctions();
  this.functionEntries = this.buildFunctionEntries(functions);
  if (
    !this.functionEntries ||
    Object.entries(this.functionEntries).length === 0
  ) {
    throw new this.serverless.classes.Error(
      `No functions detected in service - you can remove this plugin from your service`
    );
  }
  this.log.verbose('[sls-rspack] Function Entries:', this.functionEntries);
}
