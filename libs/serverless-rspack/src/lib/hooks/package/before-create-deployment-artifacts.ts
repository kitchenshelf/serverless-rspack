import type { RspackServerlessPlugin } from '../../serverless-rspack.js';

export async function BeforePackageCreateDeploymentArtifacts(
  this: RspackServerlessPlugin
) {
  this.log.verbose('[sls-rspack] before:package:createDeploymentArtifacts');
  this.timings.set('before:package:createDeploymentArtifacts', Date.now());
  await this.bundle(this.functionEntries);
  await this.scripts();
  await this.pack();
}
