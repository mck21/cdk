import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: any) => {
  const body = JSON.parse(event.body ?? '{}');

  // Generamos un ID único si no viene en el body
  const item = {
    reserva_id: randomUUID(),
    ...body,
    createdAt: new Date().toISOString(),
  };

  await client.send(new PutItemCommand({
    TableName: TABLE_NAME,
    Item: marshall(item),
  }));

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  };
};