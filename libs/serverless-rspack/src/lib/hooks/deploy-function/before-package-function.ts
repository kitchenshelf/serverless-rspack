import type { RspackServerlessPlugin } from '../../serverless-rspack.js';
import { isDeployFunctionOptions } from '../../types.js';

export async function BeforeDeployFunctionPackageFunction(
  this: RspackServerlessPlugin
) {
  this.log.verbose('[sls-rspack] before:deploy:function:packageFunction');

  if (!isDeployFunctionOptions(this.options)) {
    throw new this.serverless.classes.Error(
      'This hook only supports deploy function options'
    );
  }

  const deployFunc = this.options.function;

  if (!(deployFunc in this.functionEntries)) {
    throw new this.serverless.classes.Error(
      `Function ${deployFunc} not found in function entries`
    );
  }

  const entry = this.functionEntries[deployFunc];

  await this.bundle({
    [deployFunc]: entry,
  });

  this.functionEntries = {};
  this.functionEntries[deployFunc] = entry;

  await this.scripts();
  await this.pack();
}
