## Development

1. `cd` to the repository root
2. `npm install` to install all dependencies
3. `npx nx run serverless-rspack:build --watch` will build the plugin in watch mode

The example projects point to the local dist of the build. To use the example projects, in a new terminal

1. `cd` into an example project i.e. `/examples/complete`
2. `npm install` to install all dependencies
3. `npx sls package --verbose`

To try the plugin in another local repo then

1. `npx nx run @serverless-rspack/source:local-registry` to run a local registry
2. `npx nx run serverless-rspack:build --watch` to build the plugin in watch mode
3. Edit the `package.json` version in the dist folder to a non-existent version i.e. `1.0.0-my-local.0`
4. `npx nx release publish` to publish the plugin to the local registry
5. Follow the [Install Instructions](../README.md#install) as normal in your other local repository, replacing the version with the one you just published.
6. If you make changes to the plugin, repeat steps 3&4 changing the version number. You will also need to update the `package.json` in your local repo to point to the new version. And perform a fresh install of the plugin in your local repo.
