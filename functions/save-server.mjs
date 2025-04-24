import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from '@aws-sdk/util-dynamodb';
const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { name, url, headers = [] } = JSON.parse(event.body);
    const sk = `server#${name}`;

    const response = await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        pk: "mcp",
        sk,
        url,
        headers,
      }),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
    };
  }
};
