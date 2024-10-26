import { rm } from 'node:fs/promises';
import path from 'node:path';
import type Serverless from 'serverless';
import { Logging } from 'serverless/classes/Plugin.js';
import type Service from 'serverless/classes/Service';
import { bundle } from '../lib/bundle.js';
import { pack } from '../lib/pack.js';
import { RspackServerlessPlugin } from '../lib/serverless-rspack.js';
import { PluginOptions } from '../lib/types.js';

jest.mock('../lib/bundle', () => ({
  bundle: jest.fn(),
}));
jest.mock('../lib/pack', () => ({
  pack: jest.fn(),
}));

jest.mock('node:fs', () => ({
  readdirSync: () => ['hello1.ts', 'hello2.ts'],
}));

jest.mock('node:fs/promises', () => ({
  rm: jest.fn(),
}));

const mockProvider: Service['provider'] = {
  name: 'aws',
  region: 'eu-west-1',
  stage: 'dev',
  runtime: 'nodejs20.x',
  compiledCloudFormationTemplate: {
    Resources: {},
  },
  versionFunctions: true,
};

const functions: Service['functions'] = {
  hello1: {
    handler: 'hello1.handler',
    events: [],
    package: { artifact: 'hello1' },
  },
  hello2: {
    handler: 'hello2.handler',
    events: [],
    package: { artifact: 'hello2' },
  },
};

const packageIndividuallyService: () => Partial<Service> = () => ({
  functions: functions,
  package: { individually: true },
  provider: mockProvider,
  getFunction: (name) => functions[name],
  getAllFunctions: jest.fn().mockReturnValue(Object.keys(functions)),
});

const mockServerlessConfig = (
  serviceOverride?: Partial<Service>
): Serverless => {
  const service = {
    ...packageIndividuallyService(),
    ...serviceOverride,
  } as Service;

  const mockCli = {
    log: jest.fn(),
  };

  return {
    service,
    config: {
      servicePath: '/workDir',
      serviceDir: '/workDir',
    },
    configSchemaHandler: {
      defineCustomProperties: jest.fn(),
      defineFunctionEvent: jest.fn(),
      defineFunctionEventProperties: jest.fn(),
      defineFunctionProperties: jest.fn(),
      defineProvider: jest.fn(),
      defineTopLevelProperty: jest.fn(),
    },
    cli: mockCli,
    utils: {
      fileExistsSync: jest.fn(),
    } as any,
    classes: {
      Error: jest.fn() as any,
    },
  } as Partial<Serverless> as Serverless;
};

const mockOptions: Serverless.Options = {
  region: 'eu-east-1',
  stage: 'dev',
};

const logger: Logging = {
  log: {
    error: () => jest.fn(),
    warning: () => jest.fn(),
    notice: () => jest.fn(),
    info: () => jest.fn(),
    debug: () => jest.fn(),
    verbose: () => jest.fn(),
    success: () => jest.fn(),
  },
  writeText: jest.fn(),
  progress: {
    get: jest.fn(),
    create: jest.fn(),
  },
};

afterEach(() => {
  jest.resetAllMocks();
});

describe('RspackServerlessPlugin', () => {
  it('should define serverless framework function properties', () => {
    const plugin = new RspackServerlessPlugin(
      mockServerlessConfig(),
      mockOptions,
      logger
    );

    expect(
      plugin.serverless.configSchemaHandler.defineFunctionProperties
    ).toHaveBeenCalledTimes(1);
    expect(
      plugin.serverless.configSchemaHandler.defineFunctionProperties
    ).toHaveBeenLastCalledWith('aws', {
      properties: {
        rspack: { type: 'boolean' },
      },
    });
  });

  it('should initialise class fields', () => {
    const plugin = new RspackServerlessPlugin(
      mockServerlessConfig(),
      mockOptions,
      logger
    );

    // Workaround as `Received: serializes to the same string`
    expect(JSON.stringify(plugin.serverless)).toEqual(
      JSON.stringify(mockServerlessConfig())
    );
    expect(plugin.options).toEqual(mockOptions);
    expect(plugin.log).toEqual(logger.log);
    expect(plugin.serviceDirPath).toEqual(
      mockServerlessConfig().config.serviceDir
    );

    expect(plugin.packageOutputPath).toEqual('.serverless');
    expect(plugin.buildOutputFolder).toEqual('.rspack');
    expect(plugin.buildOutputFolderPath).toEqual('/workDir/.rspack');
  });

  it('should set required hooks', () => {
    const plugin = new RspackServerlessPlugin(
      mockServerlessConfig(),
      mockOptions,
      logger
    );

    expect(Object.keys(plugin.hooks)).toEqual([
      'initialize',
      // 'before:run:run',
      // 'before:offline:start',
      // 'before:offline:start:init',
      'before:package:createDeploymentArtifacts',
      'after:package:createDeploymentArtifacts',
      // 'before:deploy:function:packageFunction',
      // 'after:deploy:function:packageFunction',
      // 'before:invoke:local:invoke',
      // 'after:invoke:local:invoke',
    ]);
  });

  describe('hooks', () => {
    describe('initialize', () => {
      it('should set default plugin options', async () => {
        const expectedDefaultRspackPluginOptions = {
          esm: false,
          mode: 'production',
          stats: false,
          keepOutputDirectory: false,
          zipConcurrency: Infinity,
        };

        const serverless = mockServerlessConfig();

        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );

        await plugin.hooks['initialize']();

        expect(plugin.pluginOptions).toEqual(
          expectedDefaultRspackPluginOptions
        );
      });
      it('should set user defined plugin options', async () => {
        const userRspackPluginOptions = {
          esm: false,
          mode: 'development',
          stats: true,
          keepOutputDirectory: true,
          zipConcurrency: 8,
          externals: ['test', 'test2'],
          tsConfig: './app.tsconfig.json',
        };

        const serverless = mockServerlessConfig({
          custom: {
            rspack: userRspackPluginOptions,
          },
        });

        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );

        await plugin.hooks['initialize']();

        expect(plugin.pluginOptions).toEqual({
          ...userRspackPluginOptions,
        });
      });
      it('should load a rspack config from file if `custom.rspack.config.path` is a string', async () => {
        const loadedConfig = () => ({
          mode: 'development',
        });

        jest.doMock(
          path.join('testServicePath', './rspack.config.js'),
          () => loadedConfig,
          { virtual: true }
        );
        const serverless = mockServerlessConfig({
          custom: {
            rspack: {
              config: { path: './rspack.config.js' },
            },
          },
        });
        serverless.config.serviceDir = 'testServicePath';
        serverless.utils.fileExistsSync = jest.fn().mockReturnValue(true);

        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );

        await plugin.hooks['initialize']();

        expect(plugin.providedRspackConfig).toEqual(loadedConfig());
      });
      it('should error if `custom.rspack.config.path` does not exist', async () => {
        const serverless = mockServerlessConfig({
          custom: {
            rspack: {
              config: { path: './rspack.config.js' },
            },
          },
        });

        serverless.utils.fileExistsSync = jest.fn().mockReturnValue(false);

        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );
        try {
          await plugin.hooks['initialize']();
        } catch (error) {
          expect(serverless.classes.Error).toHaveBeenCalledTimes(1);
          expect(serverless.classes.Error).toHaveBeenCalledWith(
            'Rspack config does not exist at path: /workDir/rspack.config.js'
          );
        }
      });
      it('should error if `custom.rspack.config.path` does not return a function', async () => {
        const loadedConfig = {
          mode: 'development',
        };

        jest.doMock(
          path.join('testServicePath', './rspack.config.js'),
          () => loadedConfig,
          { virtual: true }
        );
        const serverless = mockServerlessConfig({
          custom: {
            rspack: {
              config: { path: './rspack.config.js' },
            },
          },
        });
        serverless.config.serviceDir = 'testServicePath';
        serverless.utils.fileExistsSync = jest.fn().mockReturnValue(true);

        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );

        try {
          await plugin.hooks['initialize']();
        } catch (error) {
          expect(serverless.classes.Error).toHaveBeenCalledTimes(1);
          expect(serverless.classes.Error).toHaveBeenCalledWith(
            'Config located at testServicePath/rspack.config.js does not return a function. See for reference: https://github.com/kitchenshelf/serverless-rspack/blob/main/README.md#config-file'
          );
        }
      });
      it('should create mjs entries by default', async () => {
        const serverless = mockServerlessConfig();
        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );

        await plugin.hooks['initialize']();

        expect(plugin.functionEntries).toEqual({
          hello1: {
            filename: '[name]/hello1.js',
            import: './hello1.ts',
          },
          hello2: {
            filename: '[name]/hello2.js',
            import: './hello2.ts',
          },
        });
      });
      it('should create mjs entries if providedRspackConfig experiments outputModule', async () => {
        const loadedConfig = () => ({
          experiments: {
            outputModule: true,
          },
        });
        jest.doMock(
          path.join('testServicePath2', './rspack.config.js'),
          () => loadedConfig,
          { virtual: true }
        );
        const serverless = mockServerlessConfig({
          custom: {
            rspack: {
              esm: false,
              config: { path: './rspack.config.js' },
            },
          },
        });
        serverless.config.serviceDir = 'testServicePath2';
        serverless.utils.fileExistsSync = jest.fn().mockReturnValue(true);

        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );

        await plugin.hooks['initialize']();

        expect(plugin.functionEntries).toEqual({
          hello1: {
            filename: '[name]/hello1.mjs',
            import: './hello1.ts',
          },
          hello2: {
            filename: '[name]/hello2.mjs',
            import: './hello2.ts',
          },
        });
      });
      it('should create mjs entries', async () => {
        const serverless = mockServerlessConfig({
          custom: {
            rspack: { esm: true },
            experiments: {},
          },
        });
        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );

        await plugin.hooks['initialize']();
        expect(plugin.functionEntries).toEqual({
          hello1: {
            filename: '[name]/hello1.mjs',
            import: './hello1.ts',
          },
          hello2: {
            filename: '[name]/hello2.mjs',
            import: './hello2.ts',
          },
        });
      });
      it('should error if file in handler does not exist', async () => {
        const functions = {
          hello3: {
            handler: 'src/hello3.handler',
            events: [],
            package: { artifact: 'hello2' },
          },
        };
        const serverless = mockServerlessConfig({
          custom: { rspack: { esm: false } },
          functions,
          getAllFunctions: jest.fn().mockReturnValue(Object.keys(functions)),
          getFunction: (name: string) => (functions as any)[name],
        });

        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );

        try {
          await plugin.hooks['initialize']();
        } catch (error) {
          expect(plugin.serverless.classes.Error).toHaveBeenLastCalledWith(
            'Unable to find file [hello3] in path: [./src]'
          );
        }
      });
      it('should error if handler is malformed', async () => {
        const functions = {
          hello3: {
            handler: 'src/hello2-handler',
            events: [],
            package: { artifact: 'hello2' },
          },
        };
        const serverless = mockServerlessConfig({
          custom: { rspack: { esm: false } },
          functions,
          getAllFunctions: jest.fn().mockReturnValue(Object.keys(functions)),
          getFunction: (name: string) => (functions as any)[name],
        });

        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );

        try {
          await plugin.hooks['initialize']();
        } catch (error) {
          expect(plugin.serverless.classes.Error).toHaveBeenLastCalledWith(
            'malformed handler: src/hello2-handler'
          );
        }
      });
    });

    describe('before:package:createDeploymentArtifacts', () => {
      it('should error when no function entries defined', async () => {
        const serverless = mockServerlessConfig();
        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );
        expect(
          plugin.hooks['before:package:createDeploymentArtifacts']
        ).toBeDefined();
        try {
          await plugin.hooks['before:package:createDeploymentArtifacts']();
        } catch {
          expect(serverless.classes.Error).toHaveBeenCalledTimes(1);
          expect(serverless.classes.Error).toHaveBeenCalledWith(
            `No function entries provided - try running in verbose mode to see expected entries`
          );
        }
      });
      it('should bundle the entries', async () => {
        const serverless = mockServerlessConfig();
        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );
        plugin.functionEntries = [''];
        plugin.pluginOptions = {} as Required<PluginOptions>;

        await plugin.hooks['before:package:createDeploymentArtifacts']();

        expect(bundle).toHaveBeenCalledTimes(1);
        expect(bundle).toHaveBeenCalledWith(plugin.functionEntries);
      });

      it('should pack the entries', async () => {
        const serverless = mockServerlessConfig();
        const plugin = new RspackServerlessPlugin(
          serverless,
          mockOptions,
          logger
        );
        plugin.functionEntries = [''];
        plugin.pluginOptions = {} as Required<PluginOptions>;

        await plugin.hooks['before:package:createDeploymentArtifacts']();

        expect(pack).toHaveBeenCalledTimes(1);
      });
    }),
      describe('after:package:createDeploymentArtifacts', () => {
        it('by default remove the build dir', async () => {
          const serverless = mockServerlessConfig();
          const plugin = new RspackServerlessPlugin(
            serverless,
            mockOptions,
            logger
          );
          plugin.functionEntries = [''];
          plugin.pluginOptions = {} as Required<PluginOptions>;

          await plugin.hooks['after:package:createDeploymentArtifacts']();
          expect(rm).toHaveBeenCalledWith('/workDir/.rspack', {
            recursive: true,
          });
        });

        it('keep the build dir', async () => {
          const serverless = mockServerlessConfig();
          const plugin = new RspackServerlessPlugin(
            serverless,
            mockOptions,
            logger
          );
          plugin.functionEntries = [''];
          plugin.pluginOptions = {
            keepOutputDirectory: true,
          } as Required<PluginOptions>;

          await plugin.hooks['after:package:createDeploymentArtifacts']();
          expect(rm).not.toHaveBeenCalledWith('/workDir/.rspack', {
            recursive: true,
          });
        });
      });
  });
});
