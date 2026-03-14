import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: any) => {
  const id = event.pathParameters?.id;

  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Falta el id' }) };
  }

  await client.send(new DeleteItemCommand({
    TableName: TABLE_NAME,
    Key: marshall({ reserva_id: id }),
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Eliminado', reserva_id: id }),
  };
};