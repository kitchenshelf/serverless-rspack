import type { RspackServerlessPlugin } from '../../serverless-rspack.js';

export async function AfterDeployFunctionPackageFunction(
  this: RspackServerlessPlugin
) {
  this.log.verbose('[sls-rspack] after:deploy:function:packageFunction');
  await this.cleanup();
}
