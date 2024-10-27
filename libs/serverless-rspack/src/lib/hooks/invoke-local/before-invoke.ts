import type { RspackServerlessPlugin } from '../../serverless-rspack.js';
import { isInvokeOptions } from '../../types.js';

export async function BeforeInvokeLocalInvoke(this: RspackServerlessPlugin) {
  this.log.verbose('before:invoke:local:invoke');

  if (!isInvokeOptions(this.options)) {
    throw new this.serverless.classes.Error(
      'This hook only supports invoke options'
    );
  }

  const invokeFunc = this.options.function;

  if (!(invokeFunc in this.functionEntries)) {
    throw new this.serverless.classes.Error(
      `Function ${invokeFunc} not found in function entries`
    );
  }

  await this.bundle({
    [invokeFunc]: this.functionEntries[invokeFunc],
  });

  this.serverless.config.servicePath =
    this.serviceDirPath + '/' + this.buildOutputFolder + '/' + invokeFunc;
}
