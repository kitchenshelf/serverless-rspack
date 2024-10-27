import type { RspackServerlessPlugin } from '../../serverless-rspack.js';

export async function AfterPackageCreateDeploymentArtifacts(
  this: RspackServerlessPlugin
) {
  this.log.verbose('after:package:createDeploymentArtifacts');
  await this.cleanup();
  this.log.verbose(
    `[Performance] Hook createDeploymentArtifacts ${
      this.serverless.service.service
    } [${
      Date.now() - this.timings.get('before:package:createDeploymentArtifacts')!
    } ms]`
  );
}
