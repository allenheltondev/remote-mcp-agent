import { CacheClient, CacheListConcatenateBackResponse, CacheListFetchResponse } from "@gomomento/sdk";

let cacheClient;

const setupCacheClient = () => {
  if (!cacheClient) {
    cacheClient = new CacheClient({ defaultTtlSeconds: 300 });
  }
};

export const getChatHistory = async (event) => {
  const incomingMessage = getIncomingMessage(event);
  if (!process.env.MOMENTO_API_KEY || !event.headers?.['X-Session-Id']) {
    return incomingMessage;
  }
  const sessionId = event.headers['X-Session-Id'];
  setupCacheClient();
  let messages = [];
  const historyResponse = await cacheClient.listFetch(process.env.CACHE_NAME, sessionId);
  switch (historyResponse.type) {
    case CacheListFetchResponse.Hit:
      messages = historyResponse.valueListString().map(JSON.parse);
      break;
    case CacheListFetchResponse.Error:
      console.error(historyResponse.toString());
  }

  messages.push(incomingMessage);
  return messages;
};

export const updateChatHistory = async (event, response) => {
  if (!process.env.MOMENTO_API_KEY || !event.headers?.['X-Session-Id'] || !response) {
    return;
  }
  const newChatMessages = [JSON.stringify(getIncomingMessage(event)), JSON.stringify(response)];
  const updateHistoryResponse = await cacheClient.listConcatenateBack(process.env.CACHE_NAME, event.headers['X-Session-Id'], newChatMessages);
  switch (updateHistoryResponse.type) {
    case CacheListConcatenateBackResponse.Error:
      console.error(updateHistoryResponse.toString());
  }
};

const getIncomingMessage = (event) => {
  const { message } = JSON.parse(event.body);

  const incomingMessage = [{ role: "user", content: message }];
  return incomingMessage;
};
