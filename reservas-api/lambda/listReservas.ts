import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async () => {
  const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));

  const items = (result.Items ?? []).map(item => unmarshall(item));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  };
};