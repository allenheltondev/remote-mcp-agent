import { z } from 'zod';
import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initialize } from '../../../shared/db_client';
import { addGardenBed, getGardenBedByName, listGardenBeds, updateGardenBed } from '../db/garden_beds';

type Env = {
  GARDEN_BED_MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string }
};

export class GardenBedAgent extends McpAgent<Env> {
  server = new McpServer({ name: 'Garden Bed MCP', version: '1.0.0' });

  async init() {
    const conn = await this.env.NEON_CONNECTION_STRING.get();
    initialize(conn);
    registerGardenBedTools(this.server);
  }
}

export const basePath = '/mcp/garden_beds';
export const handler  = GardenBedAgent.mount(`${basePath}/sse`, { binding: 'GARDEN_BED_MCP_OBJECT'});

function registerGardenBedTools(server: McpServer) {
  server.tool(
    'add-bed',
    'Adds a new garden bed to the system (metadata only).',
    {
      name: z.string().describe('Friendly name'),
      shape: z.string().describe('Shape').optional(),
      sizeSqft: z.string().describe('Plantable area, sqft').optional(),
      location: z.string().describe('Location in the garden').optional(),
      soilType: z.string().describe('Soil type').optional(),
      sunlight: z.string().describe('Sunlight exposure').optional(),
    },
    async (input) => {
      const id = await addGardenBed(input);
      return { content: [{ type: 'text', text: `Added bed ${input.name} (id: ${id})` }] };
    },
  );

  server.tool(
    'list-beds',
    'Lists all garden bed names and identifiers.',
    {},
    async () => {
      const beds = await listGardenBeds();
      const out = beds.map((b) => b.name).join(', ');
      return { content: [{ type: 'text', text: out }] };
    },
  );

  server.tool(
    'get-bed',
    'Gets full metadata for a bed and its current plants.',
    { name: z.string().describe('Bed name') },
    async ({ name }) => {
      const bed = await getGardenBedByName(name, true);
      if(typeof bed === 'string'){
        return { content: [{ type: 'text', text: bed}]};
      }
      return { content: [{ type: 'text', text: JSON.stringify(bed) }] };
    },
  );

  server.tool(
    'update-bed',
    'Updates existing garden bed metadata.',
    {
      name: z.string().describe('Bed name'),
      shape: z.string().optional(),
      sizeSqft: z.string().optional(),
      location: z.string().optional(),
      soilType: z.string().optional(),
      sunlight: z.string().optional(),
    },
    async (input) => {
      const { name, ...patch } = input;
      const res = await updateGardenBed(name, patch);
      if(typeof res === 'string'){
        return { content: [{ type: 'text', text: res}]};
      }
      return { content: [{ type: 'text', text: `Garden bed updated` }] };
    },
  );
}
