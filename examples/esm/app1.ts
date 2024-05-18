import validateIsin from 'isin-validator';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function handler(event: string) {
  const isInvalid = validateIsin(event);

  const command = new GetCommand({
    TableName: 'AngryAnimals',
    Key: {
      CommonName: 'Shoebill',
    },
  });

  try {
    const response = await docClient.send(command);
    console.log(response);
  } catch (error) {
    console.log(error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: isInvalid ? 'ISIN is invalid!' : 'ISIN is fine!',
      input: event,
    }),
  };
}
