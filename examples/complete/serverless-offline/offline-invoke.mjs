import { Buffer } from 'node:buffer';
import aws from 'aws-sdk';

const { stringify } = JSON;

const lambda = new aws.Lambda({
  apiVersion: '2015-03-31',
  endpoint: 'http://localhost:3002',
  region: 'eu-west-1',
});

export async function handler() {
  const clientContextData = stringify({
    foo: 'foo',
  });

  const payload = stringify({
    isin: 'XX000A1G0AE8',
  });

  const params = {
    ClientContext: Buffer.from(clientContextData).toString('base64'),
    // FunctionName is composed of: service name - stage - function name, e.g.
    FunctionName: 'complete-example-dev-app3',
    InvocationType: 'RequestResponse',
    Payload: payload,
  };

  const response = await lambda.invoke(params).promise();
  console.log(response);

  return {
    body: stringify(response),
    statusCode: 200,
  };
}

handler();
