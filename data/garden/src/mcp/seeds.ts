import { z } from 'zod';
import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initialize } from '../../../shared/db_client';
import { addSeeds, removeSeeds, listSeeds, getSeedDetail, useSeeds, Seed } from '../db/seeds';

type Env = {
  SEEDS_MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string; };
};

export class SeedAgent extends McpAgent<Env> {
  server = new McpServer({ name: 'Seed Catalog MCP', version: '1.0.0' });

  async init() {
    const conn = await this.env.NEON_CONNECTION_STRING.get();
    initialize(conn);
    registerSeedTools(this.server);
  }
}

export const basePath = '/mcp/seed_catalog';
export const handler = SeedAgent.mount(`${basePath}/sse`, { binding: 'SEED_MCP_OBJECT' });

const seedInput: z.ZodType<Seed> = z.object({
  name: z.string(),
  variety: z.string().nullable().optional(),
  species: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),

  days_to_germinate: z.number().nullable().optional(),
  days_to_maturity: z.number().nullable().optional(),
  planting_depth_inches: z.number().nullable().optional(),
  spacing_inches: z.number().nullable().optional(),
  sun_requirements: z.string().nullable().optional(),
  hardiness_zone_range: z.string().nullable().optional(),

  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),

  preferred_soil_ph: z.string().nullable().optional(),
  fertilization_needs: z.string().nullable().optional(),
  companion_plants: z.array(z.string()).nullable().optional(),
  avoid_near: z.array(z.string()).nullable().optional(),
});

const seedQtyInput = z
  .object({
    newAmount: z.number().optional(),
    amountUsed: z.number().optional(),
  })
  .refine((o) => (o.newAmount ?? o.amountUsed) !== undefined, {
    message: 'Provide either newAmount or amountUsed',
  });

function registerSeedTools(server: McpServer) {
  server.tool(
    'list-seeds',
    'Lists the seed catalog. Optionally include empty packets.',
    { includeEmpty: z.boolean().optional() },
    async ({ includeEmpty }) => {
      const rows = await listSeeds(includeEmpty ?? false);
      return { content: [{ type: 'text', text: JSON.stringify(rows) }] };
    },
  );

  server.tool(
    'get-seed',
    'Fetch detailed information about a seed.',
    { seedName: z.string() },
    async ({ seedName }) => {
      const seed = await getSeedDetail(seedName);
      return { content: [{ type: 'text', text: typeof seed === 'string' ? seed : JSON.stringify(seed) }] };
    },
  );

  server.tool(
    'add-seeds',
    'Adds one or more seeds to the catalog.',
    { seeds: z.array(seedInput) },
    async ({ seeds: newSeeds }) => {
      await addSeeds(newSeeds as Seed[]);
      return { content: [{ type: 'text', text: `Added ${newSeeds.length} seed(s)` }] };
    },
  );

  server.tool(
    'remove-seeds',
    'Removes one or more seeds from the catalog by name.',
    { seedNames: z.array(z.string()) },
    async ({ seedNames }) => {
      await removeSeeds(seedNames);
      return { content: [{ type: 'text', text: `Removed ${seedNames.length} seed(s)` }] };
    },
  );

  server.tool(
    'update-seed-quantity',
    'Updates the quantity for a seed (absolute or amount used).',
    { seedName: z.string(), qty: seedQtyInput },
    async ({ seedName, qty }) => {
      const result = await useSeeds(seedName, qty as any);
      return { content: [{ type: 'text', text: typeof result === 'string' ? result : `Remaining quantity: ${result}` }] };
    },
  );
}
