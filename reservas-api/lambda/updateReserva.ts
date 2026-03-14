import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: any) => {
  const id = event.pathParameters?.id;
  const body = JSON.parse(event.body ?? '{}');

  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Falta el id' }) };
  }

  // Construimos dinámicamente la expresión de actualización
  const fields = Object.keys(body);
  if (fields.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body vacío' }) };
  }

  const updateExpr = 'SET ' + fields.map(f => `#${f} = :${f}`).join(', ');
  const exprNames: Record<string, string> = {};
  const exprValues: Record<string, any> = {};

  fields.forEach(f => {
    exprNames[`#${f}`] = f;
    exprValues[`:${f}`] = body[f];
  });

  await client.send(new UpdateItemCommand({
    TableName: TABLE_NAME,
    Key: marshall({ reserva_id: id }),
    UpdateExpression: updateExpr,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: marshall(exprValues),
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Actualizado', reserva_id: id }),
  };
};