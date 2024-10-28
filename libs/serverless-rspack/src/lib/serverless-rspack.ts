import { RspackOptions } from '@rspack/core';
import { assert } from 'node:console';
import { readdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import type Serverless from 'serverless';
import type ServerlessPlugin from 'serverless/classes/Plugin';
import { bundle } from './bundle.js';
import { SERVERLESS_FOLDER, WORK_FOLDER } from './constants.js';
import { determineFileParts, isNodeFunction } from './helpers.js';
import { Initialize } from './hooks/initialize.js';
import { BeforeInvokeLocalInvoke } from './hooks/invoke-local/before-invoke.js';
import { AfterPackageCreateDeploymentArtifacts } from './hooks/package/after-create-deployment-artifacts.js';
import { BeforePackageCreateDeploymentArtifacts } from './hooks/package/before-create-deployment-artifacts.js';
import { pack } from './pack.js';
import { scripts } from './scripts.js';
import {
  PluginFunctionEntries,
  PluginOptions,
  PluginOptionsSchema,
  RsPackFunctionDefinitionHandler,
} from './types.js';

export class RspackServerlessPlugin implements ServerlessPlugin {
  serviceDirPath: string;
  buildOutputFolder: string;
  buildOutputFolderPath: string;
  packageOutputFolder: string;

  log: ServerlessPlugin.Logging['log'];
  serverless: Serverless;
  options: Serverless.Options;
  hooks: ServerlessPlugin.Hooks;

  providedRspackConfig: RspackOptions | undefined;
  pluginOptions!: PluginOptions;
  functionEntries!: PluginFunctionEntries;

  timings = new Map<string, number>();

  protected bundle = bundle.bind(this);
  protected pack = pack.bind(this);
  protected scripts = scripts.bind(this);

  constructor(
    serverless: Serverless,
    options: Serverless.Options,
    logging: ServerlessPlugin.Logging
  ) {
    assert(logging, 'Please use serverless V4');

    serverless.configSchemaHandler.defineFunctionProperties('aws', {
      properties: {
        rspack: { type: 'boolean' },
      },
    });

    this.serverless = serverless;
    this.options = options;
    this.log = logging.log;
    this.serviceDirPath = this.serverless.config.serviceDir;
    this.packageOutputFolder = SERVERLESS_FOLDER;
    this.buildOutputFolder = WORK_FOLDER;
    this.buildOutputFolderPath = path.join(
      this.serviceDirPath,
      this.buildOutputFolder
    );

    this.hooks = {
      initialize: Initialize.bind(this),
      'before:package:createDeploymentArtifacts':
        BeforePackageCreateDeploymentArtifacts.bind(this),
      'after:package:createDeploymentArtifacts':
        AfterPackageCreateDeploymentArtifacts.bind(this),
      // 'before:deploy:function:packageFunction': () => {
      //   this.log.verbose('after:deploy:function:packageFunction');
      // },
      // 'after:deploy:function:packageFunction': () => {
      //   this.log.verbose('after:deploy:function:packageFunction');
      // },
      'before:invoke:local:invoke': BeforeInvokeLocalInvoke.bind(this),
    };
  }

  protected buildFunctionEntries(functions: string[]) {
    this.log.verbose(
      `[sls-rspack] Building function entries for: ${functions}`
    );
    let entries: PluginFunctionEntries = {};

    functions.forEach((functionName) => {
      const functionDefinitionHandler = this.serverless.service.getFunction(
        functionName
      ) as RsPackFunctionDefinitionHandler;
      if (
        functionDefinitionHandler.rspack ||
        isNodeFunction(
          functionDefinitionHandler,
          this.serverless.service.provider.runtime
        )
      ) {
        // TODO: support container images
        const entry = this.getEntryForFunction(
          functionName,
          functionDefinitionHandler as Serverless.FunctionDefinitionHandler
        );
        entries = {
          ...entries,
          ...entry,
        };
      }
    });
    return entries;
  }

  protected async cleanup(): Promise<void> {
    if (!this.pluginOptions.keepOutputDirectory) {
      await rm(path.join(this.buildOutputFolderPath), { recursive: true });
    }
  }

  protected getPluginOptions() {
    return PluginOptionsSchema.parse(
      this.serverless.service.custom?.['rspack'] ?? {}
    );
  }

  private getEntryForFunction(
    name: string,
    serverlessFunction: Serverless.FunctionDefinitionHandler
  ) {
    const handler = serverlessFunction.handler;
    this.log.verbose(
      `[sls-rspack] Processing function ${name} with provided handler ${handler}`
    );

    const handlerFile = this.getHandlerFile(handler);

    const { filePath, fileName } = determineFileParts(handlerFile);
    const safeFilePath = filePath ? '/' + filePath + '/' : '/';

    const files = readdirSync(`./${filePath}`);

    const file = files.find((file) => {
      return file.startsWith(fileName);
    });

    if (!file) {
      throw new this.serverless.classes.Error(
        `Unable to find file [${fileName}] in path: [./${filePath}]`
      );
    }
    const ext = path.extname(file);

    this.log.verbose(
      `[sls-rspack] Determined: filePath: [${safeFilePath}] - fileName: [${fileName}] - ext: [${ext}]`
    );
    const outputExtension = this.isESM() ? 'mjs' : 'js';

    return {
      [name]: {
        import: `./${handlerFile}${ext}`,
        filename: `[name]${safeFilePath}${fileName}.${outputExtension}`,
      },
    };
  }

  private getHandlerFile(handler: string) {
    // Check if handler is a well-formed path based handler.
    const handlerEntry = /(.*)\..*?$/.exec(handler);
    if (handlerEntry) {
      return handlerEntry[1];
    }
    throw new this.serverless.classes.Error(`malformed handler: ${handler}`);
  }

  private isESM() {
    return (
      this.providedRspackConfig?.experiments?.outputModule ||
      this.pluginOptions.esm
    );
  }
}
