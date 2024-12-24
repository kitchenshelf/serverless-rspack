import decompress from 'decompress';
import fs from 'fs-extra';
import path from 'path';

export const validateLambdaFunction = async (
  appName: string,
  cloudformation: any,
  testArtifactPath: string,
  tempAssertDir: string,
  esm: boolean = true
) => {
  const zipFile = `${appName}.zip`;
  const extractPath = path.join(tempAssertDir, appName);
  const functionName = appName.charAt(0).toUpperCase() + appName.slice(1);
  const resourceKey = `${functionName}LambdaFunction`;
  const outputsKey = `${functionName}LambdaFunctionQualifiedArn`;

  // Test CloudFormation resource
  expect(cloudformation.Resources[resourceKey]).toMatchSnapshot({
    Properties: {
      Code: { S3Key: expect.stringContaining(zipFile) },
    },
  });

  // Test CloudFormation output
  expect(cloudformation.Outputs[outputsKey]).toMatchSnapshot({
    Value: {
      Ref: expect.stringContaining(`${functionName}LambdaVersion`),
    },
  });

  // Test zip contents
  const zipFilePath = path.join(testArtifactPath, zipFile);
  await decompress(zipFilePath, extractPath);

  const handlerBasePath =
    cloudformation.Resources[resourceKey].Properties['Handler'].split('.')[0];
  const handlerPath = path.join(
    extractPath,
    `${handlerBasePath}.${esm ? 'mjs' : 'js'}`
  );
  expect(await fs.pathExists(handlerPath)).toBe(true);

  const indexContents = fs.readFileSync(handlerPath).toString();

  expect(indexContents).toMatchSnapshot();
};
