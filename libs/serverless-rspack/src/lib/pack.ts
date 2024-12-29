import archiver from 'archiver';
import fs from 'node:fs';
import path from 'node:path';
import { humanSize } from './helpers.js';
import type { RspackServerlessPlugin } from './serverless-rspack.js';

export async function pack(this: RspackServerlessPlugin) {
  if (Object.keys(this.functionEntries).length === 0) {
    this.log.verbose('[Pack] No functions to pack');
    return;
  }
  const pMap = (await import('p-map')).default;
  const zipMapper = async (name: string) => {
    const loadedFunc = this.serverless.service.getFunction(name);
    const zipName = `${name}.zip`;

    const artifactPath = path.join(
      this.serviceDirPath,
      this.packageOutputFolder,
      zipName
    );
    try {
      this.log.verbose(`[Pack] Compressing ${name} to ${artifactPath}`);
      const startZip = Date.now();
      await zipDirectory(
        this.serviceDirPath + '/' + this.buildOutputFolder + '/' + name,
        artifactPath
      );
      const { size } = fs.statSync(artifactPath);

      this.log.verbose(
        `[Performance] Pack service ${this.serverless.service.service}: ${
          loadedFunc.name
        } -  ${humanSize(size)} [${Date.now() - startZip} ms]`
      );
    } catch (error) {
      throw new this.serverless.classes.Error(
        `[Pack] Failed to zip ${name} with: ${error}`
      );
    }
    loadedFunc.package = {
      artifact: artifactPath,
    };
  };

  this.log.verbose(
    `[Pack] Packing service ${this.serverless.service.service} with concurrency: [${this.pluginOptions.zipConcurrency}] `
  );

  await pMap(
    Object.entries(this.functionEntries).map((x) => x[0]),
    zipMapper,
    {
      concurrency: this.pluginOptions.zipConcurrency,
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

  const outDir = path.dirname(outPath);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
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
