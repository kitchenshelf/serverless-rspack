import { execSync } from 'child_process';
import type Serverless from 'serverless';
import { scripts } from '../lib/scripts.js';
import { RspackServerlessPlugin } from '../lib/serverless-rspack.js';
import { logger, mockOptions, mockServerlessConfig } from './test-utils.js';
import { PluginOptions } from '../lib/types.js';

const ENV_DEFAULTS = {
  KS_BUILD_OUTPUT_FOLDER: '.rspack',
  KS_PACKAGE_OUTPUT_FOLDER: '.serverless',
  KS_SERVICE_DIR: '/workDir',
};

describe('scripts', () => {
  let serverless: Serverless;
  let plugin: RspackServerlessPlugin;
  let execSyncMock: jest.Mock;

  beforeEach(() => {
    process.env = {
      'test-env': 'test-value',
    };
    execSyncMock = jest.fn();
    serverless = mockServerlessConfig({ service: 'test-service' });
    plugin = createRspackPlugin(plugin, serverless);
    (execSync as unknown as jest.Mock) = execSyncMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runFunctionScripts', () => {
    beforeEach(() => {
      plugin.functionScripts = {
        functionName1: ['script1', 'script2'],
        functionName2: ['script3'],
      };
    });

    it('should run function scripts and log performance', async () => {
      scripts.call(plugin);

      expect(execSyncMock).toHaveBeenCalledTimes(3);
      expect(execSyncMock).toHaveBeenCalledWith('script1', {
        cwd: '/workDir/.rspack/functionName1',
        env: {
          ...process.env,
          KS_FUNCTION_NAME: 'functionName1',
          ...ENV_DEFAULTS,
        },
        stdio: 'ignore',
      });
      expect(execSyncMock).toHaveBeenCalledWith('script2', {
        cwd: '/workDir/.rspack/functionName1',
        env: {
          ...process.env,
          KS_FUNCTION_NAME: 'functionName1',
          ...ENV_DEFAULTS,
        },
        stdio: 'ignore',
      });
      expect(execSyncMock).toHaveBeenCalledWith('script3', {
        cwd: '/workDir/.rspack/functionName2',
        env: {
          ...process.env,
          KS_FUNCTION_NAME: 'functionName2',
          ...ENV_DEFAULTS,
        },
        stdio: 'ignore',
      });
      expect(plugin.log.verbose).toHaveBeenCalledWith(
        '[Scripts] Running 2 scripts for function functionName1'
      );
      expect(plugin.log.verbose).toHaveBeenCalledWith(
        '[Scripts] Running 1 scripts for function functionName2'
      );
    });

    it('should throw an error if script execution fails', async () => {
      execSyncMock.mockImplementationOnce(() => {
        throw new Error('Script execution failed');
      });

      try {
        await scripts.call(plugin);
        fail('Expected function to throw an error');
      } catch (error) {
        expect(plugin.serverless.classes.Error).toHaveBeenCalledTimes(1);
        expect(plugin.serverless.classes.Error).toHaveBeenCalledWith(
          'Failed to execute script: script1\nError: Script execution failed'
        );
      }
    });

    it('should not run scripts if functionScripts is empty', async () => {
      plugin.functionScripts = {};

      await scripts.call(plugin);

      expect(execSyncMock).not.toHaveBeenCalled();
      expect(plugin.log.verbose).not.toHaveBeenCalled();
    });
  });

  describe('runGlobalScripts', () => {
    beforeEach(() => {
      plugin.pluginOptions = {
        scripts: ['script1', 'script2'],
      } as PluginOptions;
    });

    it('should run global scripts and log performance', async () => {
      scripts.call(plugin);

      expect(execSyncMock).toHaveBeenCalledTimes(2);
      expect(execSyncMock).toHaveBeenCalledWith('script1', {
        cwd: '/workDir',
        env: {
          ...process.env,
          ...ENV_DEFAULTS,
        },
        stdio: 'ignore',
      });
      expect(execSyncMock).toHaveBeenCalledWith('script2', {
        cwd: '/workDir',
        env: {
          ...process.env,
          ...ENV_DEFAULTS,
        },
        stdio: 'ignore',
      });
      expect(plugin.log.verbose).toHaveBeenCalledWith(
        '[Scripts] Running 2 global scripts'
      );
    });

    it('should throw an error if script execution fails', async () => {
      execSyncMock.mockImplementationOnce(() => {
        throw new Error('Script execution failed');
      });

      try {
        await scripts.call(plugin);
        fail('Expected function to throw an error');
      } catch (error) {
        expect(plugin.serverless.classes.Error).toHaveBeenCalledTimes(1);
        expect(plugin.serverless.classes.Error).toHaveBeenCalledWith(
          'Failed to execute script: script1\nError: Script execution failed'
        );
      }
    });

    it('should not run scripts if global scripts is empty', async () => {
      plugin.pluginOptions.scripts = [];

      await scripts.call(plugin);

      expect(execSyncMock).not.toHaveBeenCalled();
      expect(plugin.log.verbose).not.toHaveBeenCalled();
    });
  });
});

function createRspackPlugin(
  plugin: RspackServerlessPlugin,
  serverless: Serverless
) {
  plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);
  plugin.pluginOptions = {} as PluginOptions;

  return plugin;
}
