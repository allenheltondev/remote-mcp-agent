import serverlessExpress from '@codegenie/serverless-express';
import app from './app.mjs';

export const handler = serverlessExpress({ app });
