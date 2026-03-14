import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: any) => {
  const id = event.pathParameters?.id;

  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Falta el id' }) };
  }

  const result = await client.send(new GetItemCommand({
    TableName: TABLE_NAME,
    Key: marshall({ reserva_id: id }),
  }));

  if (!result.Item) {
    return { statusCode: 404, body: JSON.stringify({ error: 'No encontrado' }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unmarshall(result.Item)),
  };
};