import type { RspackServerlessPlugin } from './serverless-rspack.js';
import { execSync } from 'node:child_process';

export async function scripts(this: RspackServerlessPlugin) {
  if (this.pluginOptions.scripts && this.pluginOptions.scripts.length > 0) {
    this.log.verbose(
      `[Scripts] Running ${this.pluginOptions.scripts.length} scripts`
    );
    const startScripts = Date.now();
    for (const [index, script] of this.pluginOptions.scripts.entries()) {
      const startZip = Date.now();
      try {
        execSync(script, {
          cwd: this.serviceDirPath,
          stdio: this.options.verbose ? 'inherit' : 'ignore',
          env: {
            ...process.env,
            KS_SERVICE_DIR: this.serviceDirPath,
            KS_BUILD_OUTPUT_FOLDER: this.buildOutputFolder,
            KS_PACKAGE_OUTPUT_FOLDER: this.packageOutputFolder,
          },
        });
        this.log.verbose(
          `[Performance] Script ${index + 1} of ${
            this.pluginOptions.scripts.length
          } [${Date.now() - startZip} ms]`
        );
      } catch (error) {
        throw new this.serverless.classes.Error(
          `Failed to execute script: ${script}`
        );
      }
    }
    this.log.verbose(
      `[Performance] Scripts total execution time for service ${
        this.serverless.service.service
      } [${Date.now() - startScripts} ms]`
    );
  }
}
