import { rm } from 'node:fs/promises';
import { RspackServerlessPlugin } from '../../../lib/serverless-rspack.js';
import { PluginOptions } from '../../../lib/types.js';
import { logger, mockOptions, mockServerlessConfig } from '../../test-utils.js';

jest.mock('../../../lib/bundle', () => ({
  bundle: jest.fn(),
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

describe('after:package:createDeploymentArtifacts hook', () => {
  it('should be defined', () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    expect(
      plugin.hooks['after:package:createDeploymentArtifacts']
    ).toBeDefined();
  });

  it('should by default remove the build dir', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    plugin.pluginOptions = {} as Required<PluginOptions>;

    await plugin.hooks['after:package:createDeploymentArtifacts']();

    expect(rm).toHaveBeenCalledWith('/workDir/.rspack', {
      recursive: true,
    });
  });

  it('should remove the build dir when keepOutputDirectory is false', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    plugin.pluginOptions = {
      keepOutputDirectory: false,
    } as Required<PluginOptions>;

    await plugin.hooks['after:package:createDeploymentArtifacts']();

    expect(rm).toHaveBeenCalledWith('/workDir/.rspack', {
      recursive: true,
    });
  });

  it('keep the build dir', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    plugin.pluginOptions = {
      keepOutputDirectory: true,
    } as Required<PluginOptions>;

    await plugin.hooks['after:package:createDeploymentArtifacts']();
    expect(rm).not.toHaveBeenCalledWith('/workDir/.rspack', {
      recursive: true,
    });
  });
});
