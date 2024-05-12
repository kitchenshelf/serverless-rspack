## Development

1. `cd` to the repository root
2. `npm install` to install all dependencies
3. `npx nx run serverless-rspack:build --watch` will build the plugin in watch mode

The example projects point to the local dist of the build.  To use the example projects, in a new terminal

1. `cd` into an example project i.e. `/examples/complete`
2. `npm install` to install all dependencies
3. `npx sls package --verbose`

To try the plugin in another local repo then

1. `npx nx run @serverless-rspack/source:local-registry` to run a local registry
2. `npx nx release publish` to publish the plugin to the local registry
3. Follow the [Install Instructions](./libs/serverless-rspack/README.md#install) as normal in your other local repository
