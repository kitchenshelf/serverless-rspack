import fs from 'fs-extra';
import path from 'path';
import { validateLambdaFunction } from './lib/utilities';

describe('Lambda Function Deployments', () => {
  let cloudformation: any;
  let testArtifactPath: string;
  const tempAssertDir = path.join('./assert-complete' + Date.now());

  beforeAll(() => {
    testArtifactPath = path.resolve(
      __dirname,
      '../examples/complete/.serverless'
    );

    cloudformation = require(path.join(
      testArtifactPath,
      'cloudformation-template-update-stack.json'
    ));
  });

  afterEach(async () => {
    // Clean extracted files between tests
    await fs.emptyDir(tempAssertDir);
  });

  afterAll(() => {
    fs.rmSync(tempAssertDir, { recursive: true });
  });

  test('Top level cloudformation', async () => {
    expect(cloudformation.AWSTemplateFormatVersion).toMatchSnapshot();
  });

  test('Correct zips are outputted', async () => {
    const zipFiles = fs
      .readdirSync(testArtifactPath)
      .filter((file) => file.endsWith('.zip'));

    const expectedZipFiles = [
      'App1.zip',
      'app2.zip', //Handled and packaged by serverless (python)
      'app3.zip',
      'app4.zip',
      'app5.zip',
      'app6.zip', // Handled and packaged by serverless (rspack false)
    ];

    expect(zipFiles).toEqual(expect.arrayContaining(expectedZipFiles));
  });

  describe('apps packaged by rspack', () => {
    test('App1 Lambda Function', async () => {
      await validateLambdaFunction(
        'App1',
        cloudformation,
        testArtifactPath,
        tempAssertDir
      );
    });

    test('app3 Lambda Function', async () => {
      await validateLambdaFunction(
        'app3',
        cloudformation,
        testArtifactPath,
        tempAssertDir
      );
      const extractPath = path.join(tempAssertDir, 'app3');
      const nodeModules = fs
        .readdirSync(path.join(extractPath, 'node_modules'))
        .toString();

      expect(nodeModules).toEqual(expect.stringContaining('sharp'));
    });

    test('app4 Lambda Function', async () => {
      await validateLambdaFunction(
        'app4',
        cloudformation,
        testArtifactPath,
        tempAssertDir
      );
    });

    test('app5 Lambda Function', async () => {
      await validateLambdaFunction(
        'app5',
        cloudformation,
        testArtifactPath,
        tempAssertDir
      );
    });
  });
});
