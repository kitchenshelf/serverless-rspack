import { execSync } from 'node:child_process';
import type { RspackServerlessPlugin } from './serverless-rspack.js';

export async function scripts(this: RspackServerlessPlugin) {
  runFunctionScripts.call(this);
  runGlobalScripts.call(this);
}

function runFunctionScripts(this: RspackServerlessPlugin) {
  const scriptEntries = Object.entries(this.functionScripts);

  if (scriptEntries.length > 0) {
    const startScripts = Date.now();

    for (const [functionName, scripts] of scriptEntries) {
      this.log.verbose(
        `[Scripts] Running ${scripts.length} scripts for function ${functionName}`
      );
      const startFunctionScripts = Date.now();

      for (const [index, script] of scripts.entries()) {
        const startScript = Date.now();

        try {
          execSync(script, {
            cwd:
              this.serviceDirPath +
              `/${this.buildOutputFolder}/${functionName}`,
            stdio: this.options.verbose ? 'inherit' : 'ignore',
            env: {
              ...process.env,
              KS_SERVICE_DIR: this.serviceDirPath,
              KS_BUILD_OUTPUT_FOLDER: this.buildOutputFolder,
              KS_PACKAGE_OUTPUT_FOLDER: this.packageOutputFolder,
              KS_FUNCTION_NAME: functionName,
            },
          });

          this.log.verbose(
            `[Performance] Script ${index + 1} of ${scripts.length} [${
              Date.now() - startScript
            } ms]`
          );
        } catch (error) {
          throw new this.serverless.classes.Error(
            `Failed to execute script: ${script}\nError: ${
              (error as Error).message
            }`
          );
        }
      }

      this.log.verbose(
        `[Performance] Scripts total execution time for function ${functionName} [${
          Date.now() - startFunctionScripts
        } ms]`
      );
    }

    this.log.verbose(
      `[Performance] Scripts total execution time for all functions in service ${
        this.serverless.service.service
      } [${Date.now() - startScripts} ms]`
    );
  }
}

function runGlobalScripts(this: RspackServerlessPlugin) {
  if (this.pluginOptions.scripts && this.pluginOptions.scripts.length > 0) {
    this.log.verbose(
      `[Scripts] Running ${this.pluginOptions.scripts.length} global scripts`
    );
    const startScripts = Date.now();

    for (const [index, script] of this.pluginOptions.scripts.entries()) {
      const startScript = Date.now();

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
          } [${Date.now() - startScript} ms]`
        );
      } catch (error) {
        throw new this.serverless.classes.Error(
          `Failed to execute script: ${script}\nError: ${
            (error as Error).message
          }`
        );
      }
    }

    this.log.verbose(
      `[Performance] Scripts total execution time for global scripts [${
        Date.now() - startScripts
      } ms]`
    );
  }
}
