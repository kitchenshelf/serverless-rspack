import archiver from 'archiver';
import fs, { WriteStream } from 'node:fs';
import type Serverless from 'serverless';
import { pack } from '../lib/pack.js';
import { RspackServerlessPlugin } from '../lib/serverless-rspack.js';
import { logger, mockOptions, mockServerlessConfig } from './test-utils.js';

jest.mock('archiver');
jest.mock('node:fs');
jest.mock('p-map', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation((items, fn) => Promise.all(items.map(fn))),
}));

describe('pack', () => {
  let mockArchiver: any;
  let serverless: Serverless;
  let plugin: RspackServerlessPlugin;

  beforeEach(() => {
    serverless = mockServerlessConfig({ service: 'test-service' });
    plugin = createRspackPlugin(plugin, serverless);

    // Setup fs mock
    (fs.createWriteStream as jest.Mock).mockReturnValue({
      on: jest
        .fn()
        .mockImplementation(function (this: WriteStream, event, handler) {
          if (event === 'close') {
            handler();
          }
          return this;
        }),
      pipe: jest.fn(),
    });
    (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

    // Setup archiver mock
    mockArchiver = {
      directory: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      pipe: jest.fn().mockReturnThis(),
      finalize: jest.fn(),
    };
    (archiver as unknown as jest.Mock).mockReturnValue(mockArchiver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return early if functionEntries is empty', async () => {
    plugin.functionEntries = {};
    await pack.call(plugin);

    expect(plugin.log.verbose).toHaveBeenCalledWith(
      '[Pack] No functions to pack'
    );
  });

  it('should process all functions and create zip files', async () => {
    await pack.call(plugin);

    expect(plugin.log.verbose).toHaveBeenCalledWith(
      expect.stringContaining('Packing service test-service with concurrency')
    );
    expect(plugin.serverless.service.getFunction).toHaveBeenCalledTimes(2);
    expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
  });

  it('should handle zip creation error', async () => {
    const error = new Error('Zip failed');
    mockArchiver.directory.mockImplementation(() => {
      throw error;
    });
    try {
      await pack.call(plugin);
      fail('Expected function to throw an error');
    } catch (error) {
      expect(plugin.serverless.classes.Error).toHaveBeenCalledTimes(2);
      expect(plugin.serverless.classes.Error).toHaveBeenCalledWith(
        '[Pack] Failed to zip hello1 with: Error: Zip failed'
      );
      expect(plugin.serverless.classes.Error).toHaveBeenCalledWith(
        '[Pack] Failed to zip hello2 with: Error: Zip failed'
      );
    }
  });

  it('should set artifact path in function configuration', async () => {
    const mockFunction = { name: 'hello2' } as any;
    serverless.service.getFunction = jest.fn().mockReturnValue(mockFunction);

    await pack.call(plugin);

    expect(mockFunction).toHaveProperty('package.artifact');
    expect(mockFunction.package.artifact).toContain(
      '/workDir/.serverless/hello2.zip'
    );
  });

  it("should create output directory if it doesn't exist", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await pack.call(plugin);

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), {
      recursive: true,
    });
  });

  it('should log verbose performance metrics', async () => {
    await pack.call(plugin);

    expect(plugin.log.verbose).toHaveBeenCalledWith(
      expect.stringContaining('Performance')
    );
    expect(plugin.log.verbose).toHaveBeenCalledWith(
      expect.stringContaining('1.00 KB')
    );
  });
});

function createRspackPlugin(
  plugin: RspackServerlessPlugin,
  serverless: Serverless
) {
  plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);
  plugin.pluginOptions = { zipConcurrency: 2 } as any;
  plugin.functionEntries = {
    hello1: {} as any,
    hello2: {} as any,
  };
  return plugin;
}
