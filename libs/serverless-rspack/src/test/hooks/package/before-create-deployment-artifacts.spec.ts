import { bundle } from '../../../lib/bundle.js';
import { pack } from '../../../lib/pack.js';
import { RspackServerlessPlugin } from '../../../lib/serverless-rspack.js';
import { logger, mockOptions, mockServerlessConfig } from '../../test-utils.js';

jest.mock('../../../lib/bundle', () => ({
  bundle: jest.fn(),
}));

jest.mock('../../../lib/pack', () => ({
  pack: jest.fn(),
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

describe('before:package:createDeploymentArtifacts hook', () => {
  it('should be defined', () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    expect(
      plugin.hooks['before:package:createDeploymentArtifacts']
    ).toBeDefined();
  });

  it('should bundle the entries', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    await plugin.hooks['before:package:createDeploymentArtifacts']();

    expect(bundle).toHaveBeenCalledTimes(1);
    expect(bundle).toHaveBeenCalledWith(plugin.functionEntries);
  });

  it('should pack the entries', async () => {
    const serverless = mockServerlessConfig();
    const plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);

    await plugin.hooks['before:package:createDeploymentArtifacts']();

    expect(pack).toHaveBeenCalledTimes(1);
  });
});
