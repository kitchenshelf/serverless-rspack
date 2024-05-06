import { assert } from 'node:console';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import type Serverless from 'serverless';
import type ServerlessPlugin from 'serverless/classes/Plugin';
import { bundle } from './bundle.js';
import { SERVERLESS_FOLDER, WORK_FOLDER } from './constants.js';
import { pack } from './pack.js';
import { Configuration } from './types.js';
import { rm } from 'node:fs/promises';

export class RspackServerlessPlugin implements ServerlessPlugin {
  serviceDirPath: string;
  workFolder: string;
  packageOutputPath: string;
  workFolderPath: string;

  log: ServerlessPlugin.Logging['log'];
  serverless: Serverless;
  options: Serverless.Options;

  buildOptions!: Configuration;

  functionEntries:
    | Record<string, Serverless.FunctionDefinitionHandler>
    | undefined;

  hooks: ServerlessPlugin.Hooks;

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
    this.workFolder = WORK_FOLDER;
    this.workFolderPath = path.join(this.serviceDirPath, this.workFolder);

    this.hooks = {
      initialize: () => {
        this.init();
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

  private init() {
    // Use zod here rather than casting type!
    this.buildOptions = this.serverless.service.custom[
      'rspack'
    ] as Configuration;
    this.functionEntries = this.buildFunctionDefinitions();
    this.log.verbose('functionEntries:', this.functionEntries);
  }

  private buildFunctionDefinitions() {
    let entries = {};
    const functions = this.serverless.service.getAllFunctions();

    functions.forEach((func, index) => {
      const loadedFunc = this.serverless.service.getFunction(func);

      const entry = this.getEntryForFunction(
        functions[index]!,
        loadedFunc as Serverless.FunctionDefinitionHandler
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

    const handlerFile = this.getHandlerFile(handler);
    this.log.verbose('handlerFileName: ', handlerFile);

    const { filePath, fileName } = this.determineFileParts(handlerFile);
    this.log.verbose('filePath: ', filePath);
    this.log.verbose('fileName: ', fileName);

    const files = readdirSync(`./${filePath}`);

    const file = files.find((file) => {
      return file.startsWith(fileName);
    });
    const ext = path.extname(file!);

    return {
      [name]: {
        import: `./${handlerFile}${ext}`,
        filename: `[name]/${filePath ? filePath + '/' : ''}${fileName}.${
          this.buildOptions.esm ? 'mjs' : 'js'
        }`,
      },
    };
  }

  private determineFileParts(handlerFile: string | undefined) {
    const regex = /^(.*)\/([^/]+)$/;
    const result = regex.exec(handlerFile!);

    const filePath = result?.[1] ?? '';
    const fileName = result?.[2] ?? handlerFile!;
    return { filePath, fileName };
  }

  private getHandlerFile(handler: string) {
    // Check if handler is a well-formed path based handler.
    const handlerEntry = /(.*)\..*?$/.exec(handler);
    if (handlerEntry) {
      return handlerEntry[1];
    }
    this.log.error('malformed handler: ', handler);
    return undefined;
  }

  private async cleanup(): Promise<void> {
    if (!this.buildOptions?.keepOutputDirectory) {
      await rm(path.join(this.workFolderPath), { recursive: true });
    }
  }
}
