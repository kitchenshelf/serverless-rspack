// @ts-check
const { releaseVersion, releaseChangelog } = require('nx/release');
const yargs = require('yargs');

(async () => {
  try {
    const options = await yargs
      // don't use the default meaning of version in yargs
      .version(false)
      .option('version', {
        type: 'string',
      })
      .option('dryRun', {
        alias: 'd',
        type: 'boolean',
        default: true,
      })
      .option('verbose', {
        type: 'boolean',
        default: false,
      })
      .parseAsync();

    if (!options.dryRun) {
      if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
        throw new Error(
          `GH_TOKEN or GITHUB_TOKEN environment variable must be set in order to run a real release`
        );
      }
    }

    console.log();
    console.info(`********* Release Options **********`);
    console.info(
      `version   : ${options.version ?? 'use conventional commits'}`
    );
    console.info(
      `dryRun    : ${options.dryRun} ${options.dryRun ? '😅' : '🚨🚨🚨'}`
    );
    console.info(`verbose   : ${options.verbose}`);
    console.log();

    const { workspaceVersion, projectsVersionData } = await releaseVersion({
      specifier: options.version,
      dryRun: options.dryRun,
      verbose: options.verbose,
    });

    // This will create a release on GitHub, which will act as a trigger for the publish.yml workflow
    await releaseChangelog({
      version: workspaceVersion,
      versionData: projectsVersionData,
      dryRun: options.dryRun,
      verbose: options.verbose,
    });

    if (!options.dryRun) {
      console.log(
        'Check GitHub: https://github.com/kitchenshelf/serverless-rspack/actions/workflows/publish.yml'
      );
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
