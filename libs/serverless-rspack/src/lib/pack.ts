import archiver from 'archiver';
import fs from 'node:fs';
import path from 'node:path';

import { humanSize } from './helpers.js';
import type { RspackServerlessPlugin } from './serverless-rspack.js';

export async function pack(this: RspackServerlessPlugin) {
  if (!this.functionEntries) {
    return;
  }
  const pMap = (await import('p-map')).default;
  const zipMapper = async (name: string) => {
    const loadedFunc = this.serverless.service.getFunction(name);
    const zipName = `${name}.zip`;

    const artifactPath = path.join(
      this.serviceDirPath,
      this.packageOutputPath,
      zipName
    );
    try {
      const startZip = Date.now();

      await zipDirectory(
        this.serviceDirPath + '/' + this.buildOutputFolder + '/' + name,
        artifactPath
      );
      const { size } = fs.statSync(artifactPath);

      this.log.verbose(
        `[PERFORMANCE] Pack service ${this.serverless.service.service}: ${
          loadedFunc.name
        } -  ${humanSize(size)} [${Date.now() - startZip} ms]`
      );
    } catch (error) {
      this.log.error(error);
    }
    loadedFunc.package = {
      artifact: artifactPath,
    };
  };

  this.log.verbose(
    `[PERFORMANCE] Pack service ${this.serverless.service.service} with concurrency: [${this.pluginConfig.zipConcurrency}] `
  );

  await pMap(
    Object.entries(this.functionEntries).map((x) => x[0]),
    zipMapper,
    {
      concurrency: this.pluginConfig.zipConcurrency,
    }
  );
}

/**
 * From: https://stackoverflow.com/a/51518100
 * @param {String} sourceDir: /some/folder/to/compress
 * @param {String} outPath: /path/to/created.zip
 * @returns {Promise}
 */
function zipDirectory(sourceDir: string, outPath: string) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on('error', (err) => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve('success'));
    void archive.finalize();
  });
}
