import { bundle } from '../../../lib/bundle.js';
import { scripts } from '../../../lib/scripts.js';
import { RspackServerlessPlugin } from '../../../lib/serverless-rspack.js';
import {
  functions,
  logger,
  mockOptions,
  mockServerlessConfig,
} from '../../test-utils.js';

jest.mock('../../../lib/bundle', () => ({
  bundle: jest.fn(),
}));

jest.mock('../../../lib/scripts', () => ({
  scripts: jest.fn(),
}));

jest.mock('node:fs', () => ({
  readdirSync: () => ['hello1.ts', 'hello2.ts'],
}));

jest.mock('node:fs/promises', () => ({
  rm: jest.fn(),
}));

afterEach(() => {
  jest.resetModules();
  jest.resetAllMocks();
});

describe('before:invoke:local:invoke hook', () => {
  it('should bundle the specified function and update servicePath', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(
      serverless,
      { ...mockOptions, function: Object.keys(functions).at(0) },
      logger
    );

    plugin.functionEntries = {
      hello1: { import: './hello1.js', filename: 'hello1.js' },
    };

    await plugin.hooks['before:invoke:local:invoke']();

    expect(logger.log.verbose).toHaveBeenCalledWith(
      '[sls-rspack] before:invoke:local:invoke'
    );
    expect(bundle).toHaveBeenCalledWith({
      hello1: { import: './hello1.js', filename: 'hello1.js' },
    });
    expect(scripts).toHaveBeenCalled();
    expect(jest.mocked(bundle).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(scripts).mock.invocationCallOrder[0]
    );
    expect(serverless.config.servicePath).toBe('/workDir/.rspack/hello1');
  });

  it('should throw an error if options are not invoke options', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, {}, logger);

    try {
      await plugin.hooks['before:invoke:local:invoke']();
      fail('Expected function to throw an error');
    } catch (error) {
      expect(serverless.classes.Error).toHaveBeenCalledTimes(1);
      expect(serverless.classes.Error).toHaveBeenCalledWith(
        'This hook only supports invoke options'
      );
    }
  });

  it('should throw an error if function entries does not contain the invoke function', async () => {
    const serverless = mockServerlessConfig();
    const invokeFunc = Object.keys(functions).at(0);
    const plugin = new RspackServerlessPlugin(
      serverless,
      { ...mockOptions, function: invokeFunc },
      logger
    );
    plugin.functionEntries = {
      wrongFunc: { import: './wrong.js', filename: 'wrong.js' },
    };

    try {
      await plugin.hooks['before:invoke:local:invoke']();
      fail('Expected function to throw an error');
    } catch (error) {
      expect(serverless.classes.Error).toHaveBeenCalledTimes(1);
      expect(serverless.classes.Error).toHaveBeenCalledWith(
        `Function ${invokeFunc} not found in function entries`
      );
    }
  });
});
