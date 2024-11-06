import type Service from 'serverless/classes/Service';
import { bundle } from '../../../lib/bundle.js';
import { scripts } from '../../../lib/scripts.js';
import { RspackServerlessPlugin } from '../../../lib/serverless-rspack.js';
import { RsPackFunctionDefinitionHandler } from '../../../lib/types.js';
import { logger, mockOptions, mockServerlessConfig } from '../../test-utils.js';

jest.mock('../../../lib/bundle', () => ({
  bundle: jest.fn(),
}));

jest.mock('../../../lib/scripts', () => ({
  scripts: jest.fn(),
}));

afterEach(() => {
  jest.resetModules();
  jest.resetAllMocks();
});

describe('before:offline:start:init hook', () => {
  it('should be defined', () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    expect(plugin.hooks['before:offline:start:init']).toBeDefined();
  });

  it('should set default plugin options', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    await plugin.hooks['before:offline:start:init']();

    expect(plugin.pluginOptions.sourcemap).toEqual('source-map');
  });

  it('should set offline mode', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    await plugin.hooks['before:offline:start:init']();

    expect(plugin.offlineMode).toBe(true);
  });

  it('should bundle the entries', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    await plugin.hooks['before:offline:start:init']();

    expect(bundle).toHaveBeenCalledTimes(1);
    expect(bundle).toHaveBeenCalledWith(plugin.functionEntries);
  });

  it('should run scripts', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    await plugin.hooks['before:offline:start:init']();

    expect(scripts).toHaveBeenCalledTimes(1);
    expect(scripts).toHaveBeenCalledWith();
  });

  it('should bundle before scripts', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    await plugin.hooks['before:offline:start:init']();

    expect(jest.mocked(bundle).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(scripts).mock.invocationCallOrder[0]
    );
  });

  it('should set serverless-offline location when custom.serverless-offline is not defined', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    await plugin.hooks['before:offline:start:init']();

    expect(plugin.serverless.service.custom['serverless-offline']).toEqual({
      location: plugin.buildOutputFolderPath,
    });
  });

  it('should update existing serverless-offline config', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    plugin.serverless.service.custom = {
      'serverless-offline': {
        existingProp: true,
      },
    };

    await plugin.hooks['before:offline:start:init']();

    expect(plugin.serverless.service.custom['serverless-offline']).toEqual({
      existingProp: true,
      location: plugin.buildOutputFolderPath,
    });
  });

  it('should update handlers', async () => {
    const serverless = mockServerlessConfig();
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

    serverless.service.getFunction = (name) => functions[name];
    serverless.service.getAllFunctions = jest
      .fn()
      .mockReturnValue(Object.keys(functions));
    serverless.service.functions = { ...functions };
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    await plugin.hooks['before:offline:start:init']();

    const functionNames = plugin.serverless.service.getAllFunctions();

    expect(functionNames).toEqual(['hello1', 'hello2']);

    const handlers = functionNames.map((functionName) => {
      const functionDefinitionHandler = plugin.serverless.service.getFunction(
        functionName
      ) as RsPackFunctionDefinitionHandler;

      return functionDefinitionHandler.handler;
    });

    expect(handlers).toEqual([
      'hello1/hello1.handler',
      'hello2/hello2.handler',
    ]);
  });
});
