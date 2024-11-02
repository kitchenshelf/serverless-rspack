import { RspackServerlessPlugin } from '../lib/serverless-rspack.js';
import { logger, mockOptions, mockServerlessConfig } from './test-utils.js';

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

afterEach(() => {
  jest.resetModules();
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
        rspack: {
          oneOf: [
            { type: 'boolean' },
            {
              type: 'object',
              properties: {
                enable: { type: 'boolean' },
                scripts: { type: 'array', items: { type: 'string' } },
              },
              required: [],
            },
          ],
        },
      },
    });
  });

  it('should initialize class fields', () => {
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

    expect(plugin.packageOutputFolder).toEqual('.serverless');
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
      'before:package:createDeploymentArtifacts',
      'after:package:createDeploymentArtifacts',
      'before:deploy:function:packageFunction',
      'after:deploy:function:packageFunction',
      'before:invoke:local:invoke',
    ]);
  });
});
