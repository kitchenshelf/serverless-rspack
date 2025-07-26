import { rspack, RspackOptions } from '@rspack/core';
import { writeFileSync } from 'node:fs';
import path from 'path';
import Serverless from 'serverless';
import { bundle } from '../lib/bundle.js';
import { RspackServerlessPlugin } from '../lib/serverless-rspack.js';
import { PluginOptions } from '../lib/types.js';
import { logger, mockOptions, mockServerlessConfig } from './test-utils.js';

jest.mock('@rspack/core', () => {
  const mockRspack = jest.fn((config, callback) =>
    callback(null, { toJson: jest.fn().mockImplementation(() => ({})) })
  );
  return {
    rspack: mockRspack,
    DefinePlugin: jest
      .fn()
      .mockImplementation(() => ({ name: 'DefinePlugin' })),
    ProgressPlugin: jest
      .fn()
      .mockImplementation(() => ({ name: 'ProgressPlugin' })),
    node: {
      NodeTargetPlugin: jest
        .fn()
        .mockImplementation(() => ({ name: 'NodeTargetPlugin' })),
    },
  };
});

jest.mock('@rsdoctor/rspack-plugin', () => ({
  RsdoctorRspackPlugin: jest.fn().mockImplementation(() => ({
    name: 'RsdoctorRspackPlugin',
    apply: jest.fn(),
  })),
}));

jest.mock('node:fs', () => ({
  writeFileSync: jest.fn(),
}));

jest.mock('node:process', () => ({
  cwd: jest.fn().mockReturnValue('/Users/test/dir'),
}));

describe('bundle', () => {
  let entries: RspackOptions['entry'];
  let serverless: Serverless;
  let plugin: RspackServerlessPlugin;

  beforeEach(() => {
    serverless = mockServerlessConfig({ service: 'test-service' });
    plugin = new RspackServerlessPlugin(serverless, mockOptions, logger);
    plugin.pluginOptions = {} as PluginOptions;

    entries = {
      main: './src/index.ts',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should bundle with default config', async () => {
    await bundle.call(plugin, entries);

    expect(plugin.log.verbose).not.toHaveBeenCalledWith(
      expect.stringContaining('[Bundle] Config merge strategy:')
    );
    expect(plugin.log.verbose).toHaveBeenCalledWith(
      expect.stringContaining('[Bundle] Bundling with config:')
    );
    expect(rspack).toHaveBeenCalledWith(defaultConfig, expect.any(Function));
  });

  describe('with plugin options', () => {
    it('should bundle with default config extended with pluginOption `mode`', async () => {
      plugin.pluginOptions = {
        mode: 'development',
      } as PluginOptions;

      const expectedDefaultConfig = {
        ...defaultConfig,
        mode: 'development',
      };

      await bundle.call(plugin, entries);

      expect(plugin.log.verbose).not.toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Config merge strategy:')
      );
      expect(plugin.log.verbose).toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Bundling with config:')
      );
      expect(rspack).toHaveBeenCalledWith(
        expectedDefaultConfig,
        expect.any(Function)
      );
    });

    it('should bundle with default config extended with pluginOption `esm`', async () => {
      plugin.pluginOptions = {
        esm: true,
      } as PluginOptions;

      const expectedDefaultConfig = {
        ...defaultConfig,
        mode: undefined,
        experiments: {
          outputModule: true,
        },
        output: {
          ...defaultConfig.output,
          environment: {
            dynamicImport: true,
            module: true,
          },
          chunkFormat: 'module',
          chunkLoading: 'import',
          library: {
            type: 'module',
          },
        },
      };
      await bundle.call(plugin, entries);

      expect(plugin.log.verbose).not.toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Config merge strategy:')
      );
      expect(plugin.log.verbose).toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Bundling with config:')
      );
      expect(rspack).toHaveBeenCalledWith(
        expectedDefaultConfig,
        expect.any(Function)
      );
    });

    it('should bundle with default config extended with pluginOption `sourcemap`', async () => {
      plugin.pluginOptions = {
        sourcemap: 'cheap-source-map',
      } as PluginOptions;

      const expectedDefaultConfig = {
        ...defaultConfig,
        devtool: 'cheap-source-map',
      };
      await bundle.call(plugin, entries);

      expect(plugin.log.verbose).not.toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Config merge strategy:')
      );
      expect(plugin.log.verbose).toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Bundling with config:')
      );
      expect(rspack).toHaveBeenCalledWith(
        expectedDefaultConfig,
        expect.any(Function)
      );
    });

    it('should bundle with default config extended with pluginOption `externals`', async () => {
      plugin.pluginOptions = {
        externals: ['^@aws-sdk/.*$'],
      } as PluginOptions;

      const expectedDefaultConfig = {
        ...defaultConfig,
        externals: [expect.any(Function)],
      };
      await bundle.call(plugin, entries);

      expect(plugin.log.verbose).not.toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Config merge strategy:')
      );
      expect(plugin.log.verbose).toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Bundling with config:')
      );
      expect(rspack).toHaveBeenCalledWith(
        expectedDefaultConfig,
        expect.any(Function)
      );
    });

    it('should bundle with default config extended with pluginOption `doctor`', async () => {
      plugin.pluginOptions = {
        doctor: true,
      } as PluginOptions;

      const expectedDefaultConfig = {
        ...defaultConfig,
        plugins: [
          ...defaultConfig.plugins,
          { apply: expect.any(Function), name: 'RsdoctorRspackPlugin' },
        ],
      };
      await bundle.call(plugin, entries);

      expect(plugin.log.verbose).not.toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Config merge strategy:')
      );
      expect(plugin.log.verbose).toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Bundling with config:')
      );
      expect(rspack).toHaveBeenCalledWith(
        expectedDefaultConfig,
        expect.any(Function)
      );
    });

    it('should bundle with default config extended with pluginOption `tsConfig`', async () => {
      plugin.pluginOptions = {
        tsConfig: './test/tsconfig.json',
      } as PluginOptions;

      const expectedDefaultConfig = {
        ...defaultConfig,
        resolve: {
          ...defaultConfig.resolve,
          tsConfig: '/Users/test/dir/test/tsconfig.json',
        },
      };
      await bundle.call(plugin, entries);

      expect(plugin.log.verbose).not.toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Config merge strategy:')
      );
      expect(plugin.log.verbose).toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Bundling with config:')
      );
      expect(rspack).toHaveBeenCalledWith(
        expectedDefaultConfig,
        expect.any(Function)
      );
    });
  });

  describe('with provided config', () => {
    it('should merge provided config with default config with combine strategy', async () => {
      plugin.providedRspackConfig = {
        mode: 'production',
      };
      plugin.pluginOptions.config = { path: './rspack', strategy: 'combine' };

      const expectedDefaultConfig = {
        ...defaultConfig,
        ...plugin.providedRspackConfig,
      };
      await bundle.call(plugin, entries);

      expect(plugin.log.verbose).toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Config merge strategy: combine')
      );
      expect(rspack).toHaveBeenCalledWith(
        expectedDefaultConfig,
        expect.any(Function)
      );
    });

    it('should override default config with provided config with override strategy', async () => {
      plugin.providedRspackConfig = {
        mode: 'production',
      };
      plugin.pluginOptions.config = { path: './rspack', strategy: 'override' };

      const expectedDefaultConfig = {
        mode: 'production',
        ...enforcedDefaultConfig,
      };
      await bundle.call(plugin, entries);

      expect(plugin.log.verbose).toHaveBeenCalledWith(
        expect.stringContaining('[Bundle] Config merge strategy: override')
      );
      expect(rspack).toHaveBeenCalledWith(
        expectedDefaultConfig,
        expect.any(Function)
      );
    });
  });

  it('should resolve with success message', async () => {
    const result = await bundle.call(plugin, entries);
    expect(plugin.log.verbose).toHaveBeenCalledWith(
      expect.stringContaining(
        '[Performance] Bundle total execution time for service'
      )
    );
    expect(result).toBe('Success!');
  });

  it('should write stats file if stats option is enabled', async () => {
    plugin.pluginOptions.stats = true;

    await bundle.call(plugin, entries);

    expect(writeFileSync).toHaveBeenCalledWith(
      path.join(plugin.buildOutputFolderPath, 'stats.json'),
      expect.any(String)
    );
  });

  it('should log error if writing stats file fails', async () => {
    plugin.pluginOptions.stats = true;
    (writeFileSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Failed to write');
    });

    await bundle.call(plugin, entries);

    expect(plugin.log.error).toHaveBeenCalledWith(
      '[Bundle] Failed to write stats file: Error: Failed to write'
    );
  });
});

const defaultConfig = {
  devtool: false,
  entry: {
    main: './src/index.ts',
  },
  experiments: {
    outputModule: undefined,
  },
  mode: undefined,
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
              },
              target: 'es2020',
            },
          },
        },
      },
    ],
  },
  optimization: {
    mangleExports: false,
  },
  output: {
    library: {
      type: 'commonjs2',
    },
    path: '/workDir/.rspack',
  },
  plugins: [
    {
      name: 'DefinePlugin',
    },
    {
      name: 'ProgressPlugin',
    },
    {
      name: 'NodeTargetPlugin',
    },
  ],
  resolve: {
    extensions: ['...', '.ts', '.tsx', '.jsx'],
  },
  target: 'node',
};

const enforcedDefaultConfig = {
  entry: {
    main: './src/index.ts',
  },
  optimization: {
    mangleExports: false,
  },
  output: {
    path: '/workDir/.rspack',
  },
};
