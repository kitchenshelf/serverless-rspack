import path from 'node:path';
import { RspackServerlessPlugin } from '../../lib/serverless-rspack.js';
import { logger, mockOptions, mockServerlessConfig } from '../test-utils.js';

jest.mock('node:fs', () => ({
  readdirSync: () => ['hello1.ts', 'hello2.ts'],
}));

afterEach(() => {
  jest.resetModules();
  jest.resetAllMocks();
});

describe('initialize hook', () => {
  it('should set default plugin options', async () => {
    const expectedDefaultRspackPluginOptions = {
      esm: false,
      mode: 'production',
      stats: false,
      keepOutputDirectory: false,
      zipConcurrency: Infinity,
    };

    const serverless = mockServerlessConfig();

    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    await plugin.hooks['initialize']();

    expect(plugin.pluginOptions).toEqual(expectedDefaultRspackPluginOptions);
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

    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

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

    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

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

    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);
    try {
      await plugin.hooks['initialize']();
      fail('Expected function to throw an error');
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

    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    try {
      await plugin.hooks['initialize']();
      fail('Expected function to throw an error');
    } catch (error) {
      expect(serverless.classes.Error).toHaveBeenCalledTimes(1);
      expect(serverless.classes.Error).toHaveBeenCalledWith(
        'Config located at testServicePath/rspack.config.js does not return a function. See for reference: https://github.com/kitchenshelf/serverless-rspack/blob/main/README.md#config-file'
      );
    }
  });

  it('should error when no functions entries are created', async () => {
    const serverless = mockServerlessConfig();
    serverless.service.getAllFunctions = jest.fn().mockReturnValue([]);

    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    try {
      await plugin.hooks['initialize']();
      fail('Expected function to throw an error');
    } catch (error) {
      expect(serverless.classes.Error).toHaveBeenCalledTimes(1);
      expect(serverless.classes.Error).toHaveBeenCalledWith(
        'No functions detected in service - you can remove this plugin from your service'
      );
    }
  });

  it('should create cjs entries by default', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

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

  it('should create mjs entries when providedRspackConfig experiments outputModule', async () => {
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

    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

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

  it('should create mjs entries when plugin option esm is provided', async () => {
    const serverless = mockServerlessConfig({
      custom: {
        rspack: { esm: true },
        experiments: {},
      },
    });
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

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

    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

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

    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    try {
      await plugin.hooks['initialize']();
      fail('Expected function to throw an error');
    } catch (error) {
      expect(plugin.serverless.classes.Error).toHaveBeenLastCalledWith(
        'malformed handler: src/hello2-handler'
      );
    }
  });
});
