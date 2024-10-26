const { rspack } = require('@rspack/core');
const path = require('node:path');
const { cwd } = require('node:process');

/** @type {import('@rspack/cli').Configuration} */
const config = (serverless) => {
  return {
    // mode: 'development',
    mode: 'production',
    target: 'node',
    experiments: {
      outputModule: true,
    },
    resolve: {
      extensions: ['...', '.ts', '.tsx', '.jsx'],
      // tsConfig: path.resolve(cwd(), "tsconfig.app.json"),
    },
    externals: [
      'uuid',
      function (obj, callback) {
        const resource = obj.request;
        if (
          /^@aws-sdk\/.*$/.test(resource) ||
          /^@smithy\/.*$/.test(resource) ||
          /^isin-validator$/.test(resource)
        ) {
          return callback(null, 'module ' + resource);
        }
        callback();
      },
    ],
    plugins: [
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env['NODE_ENV']),
      }),
      new rspack.ProgressPlugin({}),
      new rspack.node.NodeTargetPlugin(),
    ].filter(Boolean),
    output: {
      chunkFormat: 'module',
      chunkLoading: 'import',
      library: {
        type: 'module',
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              target: 'es2020',
              jsc: {
                parser: {
                  syntax: 'typescript',
                },
              },
            },
          },
        },
      ],
    },
    optimization: {
      moduleIds: 'named',
      mangleExports: false,
      minimizer: [new rspack.SwcJsMinimizerRspackPlugin()],
    },
  };
};
module.exports = config;
