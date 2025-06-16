import { z } from 'zod';
import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initialize } from '../../../shared/db_client';
import * as harvestDB from '../db/harvests';
import * as obsDB from '../db/observations';

type Env = {
  GARDEN_RECORDS_MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string }
};

export class GardenRecordsAgent extends McpAgent<Env> {
  server = new McpServer({ name: 'Garden Records MCP', version: '1.0.0' });

  async init() {
    const conn = await this.env.NEON_CONNECTION_STRING.get();
    initialize(conn);
    registerGardenRecordsTools(this.server);
  }
}

export const basePath = '/mcp/garden_records';
export const handler  = GardenRecordsAgent.mount(`${basePath}/sse`, { binding: 'GARDEN_RECORDS_MCP_OBJECT'});

const harvestInput = z.object({
  harvestDate: z.string(),
  crop: z.string().optional(),
  quantity: z.number().optional(),
  notes: z.string().optional(),
});

const observationInput = z.object({
  observationDate: z.string(),
  note: z.string().optional(),
  moisture: z.string().optional(),
  pests: z.string().optional(),
  health: z.string().optional(),
});

function registerGardenRecordsTools(server: McpServer) {
  server.tool(
    'list-all-harvests',
    'Lists all harvest records across the entire garden.',
    {},
    async () => {
      const rows = await harvestDB.getAllHarvestsWithBedName();
      return { content: [{ type: 'text', text: JSON.stringify(rows) }] };
    },
  );

  server.tool(
    'list-bed-harvests',
    'Lists harvests for a specific bed.',
    { bedName: z.string().describe('Name of the garden bed') },
    async ({ bedName }) => {
      const rows = await harvestDB.getHarvestsByBedName(bedName);
      if (typeof rows === 'string') {
        return { content: [{ type: 'text', text: rows }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(rows) }] };
    },
  );

  server.tool(
    'log-harvest',
    'Logs a harvest for a bed.',
    {
      bedName: z.string().describe('Garden bed name'),
      harvest: harvestInput,
    },
    async ({ bedName, harvest }) => {
      const msg = await harvestDB.addHarvest(bedName, harvest);
      if (msg) return { content: [{ type: 'text', text: msg }] };
      return { content: [{ type: 'text', text: 'Harvest logged' }] };
    },
  );

  server.tool(
    'list-all-observations',
    'Lists all observations across the garden.',
    {},
    async () => {
      const rows = await obsDB.getAllObservationsWithBedName();
      return { content: [{ type: 'text', text: JSON.stringify(rows) }] };
    },
  );

  server.tool(
    'list-bed-observations',
    'Lists observations for a specific bed.',
    { bedName: z.string().describe('Bed name') },
    async ({ bedName }) => {
      const rows = await obsDB.getObservationsByBedName(bedName);
      if (typeof rows === 'string') {
        return { content: [{ type: 'text', text: rows }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(rows) }] };
    },
  );

  server.tool(
    'log-observation',
    'Logs an observation for a bed.',
    {
      bedName: z.string().describe('Bed name'),
      observation: observationInput,
    },
    async ({ bedName, observation }) => {
      const msg = await obsDB.addObservation(bedName, observation);
      if (msg) return { content: [{ type: 'text', text: msg }] };
      return { content: [{ type: 'text', text: 'Observation logged' }] };
    },
  );
}
