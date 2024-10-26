const { rspack } = require('@rspack/core');

/** @type {import('@rspack/cli').Configuration} */
const config = (serverless) => {
  const SIGNER_SECRET = serverless.service.custom.SIGNER_SECRET;
  return {
    mode: 'production',
    plugins: [
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env['NODE_ENV']),
        __SIGNER_SECRET__: JSON.stringify(`${SIGNER_SECRET}`),
      }),
    ].filter(Boolean),
  };
};
module.exports = config;
