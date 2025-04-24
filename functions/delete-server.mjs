import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();
export const handler = async (event) => {
  try {
    const { name } = event.pathParameters;
    const sk = `server#${name}`;

    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: "mcp",
        sk,
      }),
    }));

    return { statusCode: 204 };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
    };
  }
};
