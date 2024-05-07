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
import { PluginConfiguration, PluginConfigurationSchema } from './types.js';

export class RspackServerlessPlugin implements ServerlessPlugin {
  serviceDirPath: string;
  buildOutputFolder: string;
  buildOutputFolderPath: string;
  packageOutputPath: string;

  log: ServerlessPlugin.Logging['log'];
  serverless: Serverless;
  options: Serverless.Options;

  pluginConfig!: Required<PluginConfiguration>;
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
      'before:run:run': () => {
        this.log?.verbose('before:run:run');
        // this.bundle();
        // await this.packExternalModules();
        // await this.copyExtras();
      },
      'before:offline:start': () => {
        this.log?.verbose('before:offline:start');
        // await this.bundle();
        // await this.packExternalModules();
        // await this.copyExtras();
        // await this.preOffline();
        // this.watch();
      },
      'before:offline:start:init': () => {
        this.log?.verbose('before:offline:start:init');
        // await this.bundle();
        // await this.packExternalModules();
        // await this.copyExtras();
        // await this.preOffline();
        // this.watch();
      },
      'before:package:createDeploymentArtifacts': async () => {
        this.timings.set(
          'before:package:createDeploymentArtifacts',
          Date.now()
        );

        this.log?.verbose('before:package:createDeploymentArtifacts');
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
        this.log?.verbose('after:package:createDeploymentArtifacts');
        await this.cleanup();
        this.log.verbose(
          `[PERFORMANCE] Hook createDeploymentArtifacts ${
            this.serverless.service.service
          } [${
            Date.now() -
            (this.timings.get('before:package:createDeploymentArtifacts') ?? 0)
          } ms]`
        );
      },
      'before:deploy:function:packageFunction': () => {
        this.log?.verbose('after:deploy:function:packageFunction');
        // await this.bundle();
        // await this.packExternalModules();
        // await this.copyExtras();
        // await this.pack();
      },
      'after:deploy:function:packageFunction': () => {
        this.log?.verbose('after:deploy:function:packageFunction');
        // await this.disposeContexts();
        // await this.cleanup();
      },
      'before:invoke:local:invoke': () => {
        this.log?.verbose('before:invoke:local:invoke');
        // await this.bundle();
        // await this.packExternalModules();
        // await this.copyExtras();
        // await this.preLocal();
      },
      'after:invoke:local:invoke': () => {
        this.log?.verbose('after:invoke:local:invoke');
        // await this.disposeContexts();
      },
    };
  }

  private async init() {
    this.pluginConfig = this.getPluginConfig();
    if (this.pluginConfig.config) {
      this.providedRspackConfig = (
        await import(path.join(this.serviceDirPath, this.pluginConfig.config))
      ).default;
    }
    const functions = this.serverless.service.getAllFunctions();
    this.functionEntries = this.buildFunctionEntries(functions);
    this.log.verbose('Function Entries:', this.functionEntries);
  }

  private buildFunctionEntries(functions: string[]) {
    this.log.verbose('Building function entries for: ', functions);
    let entries = {};

    functions.forEach((functionName) => {
      const functionDefinitionHandler =
        this.serverless.service.getFunction(functionName);

      // TODO: support container images
      const entry = this.getEntryForFunction(
        functionName,
        functionDefinitionHandler as Serverless.FunctionDefinitionHandler
      );
      entries = {
        ...entries,
        ...entry,
      };
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
    const outputExtension =
      this.providedRspackConfig?.experiments?.outputModule ||
      this.pluginConfig.esm
        ? 'mjs'
        : 'js';

    return {
      [name]: {
        import: `./${handlerFile}${ext}`,
        filename: `[name]${safeFilePath}${fileName}.${outputExtension}`,
      },
    };
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

  private async cleanup(): Promise<void> {
    if (!this.pluginConfig.keepOutputDirectory) {
      await rm(path.join(this.buildOutputFolderPath), { recursive: true });
    }
  }

  private getPluginConfig() {
    if (this.pluginConfig) return this.pluginConfig;
    const DEFAULT_CONFIG_OPTIONS: Required<PluginConfiguration> = {
      config: null,
      esm: true,
      mode: 'production',
      stats: false,
      keepOutputDirectory: false,
      zipConcurrency: Infinity,
    };

    let config: Required<PluginConfiguration>;
    const userProvidedConfig = this.serverless.service.custom['rspack'];
    if (this.serverless.service.custom['rspack']) {
      PluginConfigurationSchema.parse(this.serverless.service.custom['rspack']);
      config = {
        ...DEFAULT_CONFIG_OPTIONS,
        ...userProvidedConfig,
      };
    } else {
      config = DEFAULT_CONFIG_OPTIONS;
    }

    return config;
  }
}
