import { RspackOptions } from '@rspack/core';
import { assert } from 'node:console';
import { readdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import type Serverless from 'serverless';
import type ServerlessPlugin from 'serverless/classes/Plugin';
import { bundle } from './bundle.js';
import { SERVERLESS_FOLDER, WORK_FOLDER } from './constants.js';
import { pack } from './pack.js';
import {
  PluginOptions,
  PluginOptionsSchema,
  RsPackFunctionDefinitionHandler,
} from './types.js';

export class RspackServerlessPlugin implements ServerlessPlugin {
  serviceDirPath: string;
  buildOutputFolder: string;
  buildOutputFolderPath: string;
  packageOutputPath: string;

  log: ServerlessPlugin.Logging['log'];
  serverless: Serverless;
  options: Serverless.Options;

  pluginOptions!: PluginOptions;
  providedRspackConfig: RspackOptions | undefined;

  functionEntries: RspackOptions['entry'] | undefined;

  hooks: ServerlessPlugin.Hooks;

  timings = new Map<string, number>();

  #bundle = bundle.bind(this);
  #pack = pack.bind(this);

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
    this.packageOutputPath = SERVERLESS_FOLDER;
    this.buildOutputFolder = WORK_FOLDER;
    this.buildOutputFolderPath = path.join(
      this.serviceDirPath,
      this.buildOutputFolder
    );

    this.hooks = {
      initialize: async () => {
        await this.init();
      },
      // 'before:run:run': async () => {
      // this.log.verbose('before:run:run');
      // await this.#bundle(this.functionEntries);
      // },
      // 'before:offline:start': () => {
      //   this.log.verbose('before:offline:start');
      // },
      // 'before:offline:start:init': () => {
      //   this.log.verbose('before:offline:start:init');
      // },
      'before:package:createDeploymentArtifacts': async () => {
        this.log.verbose('before:package:createDeploymentArtifacts');
        this.timings.set(
          'before:package:createDeploymentArtifacts',
          Date.now()
        );

        if (
          !this.functionEntries ||
          Object.entries(this.functionEntries).length === 0
        ) {
          throw new this.serverless.classes.Error(
            `No function entries provided - try running in verbose mode to see expected entries`
          );
        }
        await this.#bundle(this.functionEntries);
        await this.#pack();
      },
      'after:package:createDeploymentArtifacts': async () => {
        this.log.verbose('after:package:createDeploymentArtifacts');
        await this.cleanup();
        this.log.verbose(
          `[Performance] Hook createDeploymentArtifacts ${
            this.serverless.service.service
          } [${
            Date.now() -
            this.timings.get('before:package:createDeploymentArtifacts')!
          } ms]`
        );
      },
      // 'before:deploy:function:packageFunction': () => {
      //   this.log.verbose('after:deploy:function:packageFunction');
      // },
      // 'after:deploy:function:packageFunction': () => {
      //   this.log.verbose('after:deploy:function:packageFunction');
      // },
      // 'before:invoke:local:invoke': async () => {
      //   this.log.verbose('before:invoke:local:invoke');
      //   this.log.verbose(this.options);
      //   // @ts-ignore
      //   const invokeFunc: string =
      //     this.serverless.processedInput.options.function;
      //   this.log.verbose(invokeFunc);
      //   await this.#bundle({
      //     [invokeFunc]: (this.functionEntries as any)[invokeFunc],
      //   });

      //   this.serviceDirPath = this.buildOutputFolderPath;
      //   this.serverless.config.servicePath = this.buildOutputFolderPath;
      //   process.chdir(this.serviceDirPath);
      // },
      // 'after:invoke:local:invoke': () => {
      //   this.log.verbose('after:invoke:local:invoke');
      // },
    };
  }

  private async init() {
    this.pluginOptions = this.getPluginOptions();

    if (this.pluginOptions.config?.path) {
      const configPath = path.join(
        this.serviceDirPath,
        this.pluginOptions.config.path
      );
      if (!this.serverless.utils.fileExistsSync(configPath)) {
        throw new this.serverless.classes.Error(
          `Rspack config does not exist at path: ${configPath}`
        );
      }
      const configFn = (await import(configPath)).default;

      if (typeof configFn !== 'function') {
        throw new this.serverless.classes.Error(
          `Config located at ${configPath} does not return a function. See for reference: https://github.com/kitchenshelf/serverless-rspack/blob/main/README.md#config-file`
        );
      }

      this.providedRspackConfig = configFn(this.serverless);
    }

    const functions = this.serverless.service.getAllFunctions();
    this.functionEntries = this.buildFunctionEntries(functions);
    this.log.verbose('Function Entries:', this.functionEntries);
  }

  private buildFunctionEntries(functions: string[]) {
    this.log.verbose('Building function entries for: ', functions);
    let entries = {};

    functions.forEach((functionName) => {
      const functionDefinitionHandler = this.serverless.service.getFunction(
        functionName
      ) as RsPackFunctionDefinitionHandler;
      if (
        functionDefinitionHandler.rspack ||
        this.isNodeFunction(functionDefinitionHandler)
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

  private getEntryForFunction(
    name: string,
    serverlessFunction: Serverless.FunctionDefinitionHandler
  ) {
    const handler = serverlessFunction.handler;
    this.log.verbose(
      `Processing function ${name} with provided handler ${handler}`
    );

    const handlerFile = this.getHandlerFile(handler);

    const { filePath, fileName } = this.determineFileParts(handlerFile);
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
      `Determined: filePath: [${safeFilePath}] - fileName: [${fileName}] - ext: [${ext}]`
    );
    const outputExtension = this.isESM() ? 'mjs' : 'js';

    return {
      [name]: {
        import: `./${handlerFile}${ext}`,
        filename: `[name]${safeFilePath}${fileName}.${outputExtension}`,
      },
    };
  }

  private isESM() {
    return (
      this.providedRspackConfig?.experiments?.outputModule ||
      this.pluginOptions.esm
    );
  }

  private determineFileParts(handlerFile: string) {
    const regex = /^(.*)\/([^/]+)$/;
    const result = regex.exec(handlerFile);

    const filePath = result?.[1] ?? '';
    const fileName = result?.[2] ?? handlerFile;
    return { filePath, fileName };
  }

  private getHandlerFile(handler: string) {
    // Check if handler is a well-formed path based handler.
    const handlerEntry = /(.*)\..*?$/.exec(handler);
    if (handlerEntry) {
      return handlerEntry[1];
    }
    throw new this.serverless.classes.Error(`malformed handler: ${handler}`);
  }

  /**
   * Checks if the runtime for the given function is nodejs.
   * If the runtime is not set , checks the global runtime.
   * @param {Serverless.FunctionDefinitionHandler} func the function to be checked
   * @returns {boolean} true if the function/global runtime is nodejs; false, otherwise
   */
  private isNodeFunction(func: Serverless.FunctionDefinitionHandler): boolean {
    const runtime = func.runtime || this.serverless.service.provider.runtime;

    return typeof runtime === 'string' && runtime.startsWith('node');
  }

  private async cleanup(): Promise<void> {
    if (!this.pluginOptions.keepOutputDirectory) {
      await rm(path.join(this.buildOutputFolderPath), { recursive: true });
    }
  }

  private getPluginOptions() {
    return PluginOptionsSchema.parse(
      this.serverless.service.custom?.['rspack'] ?? {}
    );
  }
}
