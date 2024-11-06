import type { RspackServerlessPlugin } from '../../serverless-rspack.js';
import { RsPackFunctionDefinitionHandler } from '../../types.js';

export async function BeforeOfflineStartInit(this: RspackServerlessPlugin) {
  this.log.verbose('[sls-rspack] before:offline:start:init');
  this.offlineMode = true;

  this.pluginOptions = {
    ...this.pluginOptions,
    sourcemap: 'source-map',
  };

  await this.bundle(this.functionEntries);
  await this.scripts();

  if (this.serverless.service.custom?.['serverless-offline']) {
    this.serverless.service.custom['serverless-offline'].location =
      this.buildOutputFolderPath;
  } else {
    this.serverless.service.custom = {
      ...this.serverless.service.custom,
      'serverless-offline': { location: this.buildOutputFolderPath },
    };
  }

  this.serverless.service.getAllFunctions().forEach((functionName) => {
    const functionDefinitionHandler = this.serverless.service.getFunction(
      functionName
    ) as RsPackFunctionDefinitionHandler;

    functionDefinitionHandler.handler =
      functionName + '/' + functionDefinitionHandler.handler;
  });
}
