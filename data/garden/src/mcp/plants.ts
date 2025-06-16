import { z } from 'zod';
import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initialize } from '../../../shared/db_client';
import { getPlantsByBedName, addPlants, removePlants, clearBed, getPlantByBedAndName, updatePlant, listAllPlants } from '../db/plants';

type Env = {
  PLANTS_MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string }
};

export class GardenPlantsAgent extends McpAgent<Env> {
  server = new McpServer({ name: 'Garden Plants MCP', version: '1.0.0' });

  async init() {
    const conn = await this.env.NEON_CONNECTION_STRING.get();
    initialize(conn);
    registerPlantTools(this.server);
  }
}

export const basePath = '/mcp/garden_plants';
export const handler  = GardenPlantsAgent.mount(`${basePath}/sse`, { binding: 'PLANTS_MCP_OBJECT'});

const plantInput = z.object({
  name: z.string(),
  species: z.string().optional(),
  plantingDate: z.string().optional(),
  notes: z.string().optional(),
});

const plantPatch = plantInput.partial().omit({ name: true });

function registerPlantTools(server: McpServer) {
  server.tool(
    'list-bed-plants',
    'Lists all plants within a garden bed.',
    { bedName: z.string().describe('Garden bed name') },
    async ({ bedName }) => {
      const rows = await getPlantsByBedName(bedName);
      return { content: [{ type: 'text', text: typeof rows === 'string' ? rows : JSON.stringify(rows) }] };
    },
  );

  server.tool(
    'add-plants-to-bed',
    'Add plants to a bed.',
    { bedName: z.string(), plants: z.array(plantInput) },
    async ({ bedName, plants }) => {
      const id = await addPlants(bedName, plants);
      if (id === 'not-found') return { content: [{ type: 'text', text: 'Bed not found' }] };
      return { content: [{ type: 'text', text: `Added plants to ${bedName}` }] };
    },
  );

  server.tool(
    'remove-plants-from-bed',
    'Removes plant from a bed.',
    { bedName: z.string(), plants: z.array(z.string()) },
    async ({ bedName, plants }) => {
      const msg = await removePlants(bedName, plants);
      return { content: [{ type: 'text', text: msg ?? 'Plants removed' }] };
    },
  );

  server.tool(
    'get-plant',
    'Fetch metadata for a single plant in a bed.',
    { bedName: z.string(), plantName: z.string() },
    async ({ bedName, plantName }) => {
      const data = await getPlantByBedAndName(bedName, plantName);
      return { content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data) }] };
    },
  );

  server.tool(
    'update-plant',
    'Patch metadata fields on a plant.',
    { bedName: z.string(), plantName: z.string(), patch: plantPatch },
    async ({ bedName, plantName, patch }) => {
      const res = await updatePlant(bedName, plantName, patch as any);
      return { content: [{ type: 'text', text: res ?? 'Plant updated' }] };
    },
  );

  server.tool(
    'clear-bed',
    'Removes all plants from a garden bed.',
    { bedName: z.string() },
    async ({ bedName }) => {
      const msg = await clearBed(bedName);
      return { content: [{ type: 'text', text: msg ?? `Cleared plants from ${bedName}` }] };
    },
  );

  server.tool(
    'list-all-plants',
    'Lists every plant in the garden (optional species filter).',
    { species: z.string().optional() },
    async ({ species }) => {
      const rows = await listAllPlants(species);

      return { content: [{ type: 'text', text: JSON.stringify(rows) }] };
    },
  );
}
