import { bundle } from '../../../lib/bundle.js';
import { pack } from '../../../lib/pack.js';
import { scripts } from '../../../lib/scripts.js';
import { RspackServerlessPlugin } from '../../../lib/serverless-rspack.js';
import { logger, mockOptions, mockServerlessConfig } from '../../test-utils.js';

jest.mock('../../../lib/bundle', () => ({
  bundle: jest.fn(),
}));

jest.mock('../../../lib/pack', () => ({
  pack: jest.fn(),
}));

jest.mock('../../../lib/scripts', () => ({
  scripts: jest.fn(),
}));

afterEach(() => {
  jest.resetModules();
  jest.resetAllMocks();
});

describe('before:deploy:function:packageFunction', () => {
  let plugin: RspackServerlessPlugin;

  it('should be defined', () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    expect(
      plugin.hooks['before:deploy:function:packageFunction']
    ).toBeDefined();
  });

  it('should throw error if options are invalid', async () => {
    const serverless = mockServerlessConfig();
    plugin = new RspackServerlessPlugin(serverless, {}, logger);

    try {
      await plugin.hooks['before:deploy:function:packageFunction']();
      fail('Expected function to throw an error');
    } catch (error) {
      expect(serverless.classes.Error).toHaveBeenCalledTimes(1);
      expect(serverless.classes.Error).toHaveBeenCalledWith(
        'This hook only supports deploy function options'
      );
    }
  });

  it('should throw error if function not found in entries', async () => {
    const serverless = mockServerlessConfig();
    plugin = new RspackServerlessPlugin(
      serverless,
      { ...mockOptions, function: 'nonexistentFunc' },
      logger
    );
    plugin.functionEntries = {};
    try {
      await plugin.hooks['before:deploy:function:packageFunction']();
      fail('Expected function to throw an error');
    } catch (error) {
      expect(serverless.classes.Error).toHaveBeenCalledTimes(1);
      expect(serverless.classes.Error).toHaveBeenCalledWith(
        'Function nonexistentFunc not found in function entries'
      );
    }
  });

  it('should bundle the entries', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(
      serverless,
      { ...mockOptions, function: 'myFunc' },
      logger
    );

    plugin.functionEntries = {
      myFunc: { import: 'test/path/entry.ts', filename: 'test/path/entry.ts' },
    };

    await plugin.hooks['before:deploy:function:packageFunction']();

    expect(bundle).toHaveBeenCalledTimes(1);
    expect(bundle).toHaveBeenCalledWith(plugin.functionEntries);
  });

  it('should run scripts', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(
      serverless,
      { ...mockOptions, function: 'myFunc' },
      logger
    );

    plugin.functionEntries = {
      myFunc: { import: 'test/path/entry.ts', filename: 'test/path/entry.ts' },
    };

    await plugin.hooks['before:deploy:function:packageFunction']();

    expect(scripts).toHaveBeenCalledTimes(1);
    expect(scripts).toHaveBeenCalledWith();
  });

  it('should pack the entries', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(
      serverless,
      { ...mockOptions, function: 'myFunc' },
      logger
    );

    plugin.functionEntries = {
      myFunc: { import: 'test/path/entry.ts', filename: 'test/path/entry.ts' },
    };

    await plugin.hooks['before:deploy:function:packageFunction']();

    expect(pack).toHaveBeenCalledTimes(1);
  });

  it('should bundle before scripts', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(
      serverless,
      { ...mockOptions, function: 'myFunc' },
      logger
    );

    plugin.functionEntries = {
      myFunc: { import: 'test/path/entry.ts', filename: 'test/path/entry.ts' },
    };

    await plugin.hooks['before:deploy:function:packageFunction']();

    expect(jest.mocked(bundle).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(scripts).mock.invocationCallOrder[0]
    );
  });

  it('should pack after scripts', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(
      serverless,
      { ...mockOptions, function: 'myFunc' },
      logger
    );

    plugin.functionEntries = {
      myFunc: { import: 'test/path/entry.ts', filename: 'test/path/entry.ts' },
    };

    await plugin.hooks['before:deploy:function:packageFunction']();

    expect(jest.mocked(scripts).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(pack).mock.invocationCallOrder[0]
    );
  });
});
