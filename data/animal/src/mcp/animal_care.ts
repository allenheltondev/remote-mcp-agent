import { z } from "zod";
import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initialize } from '../../../shared/db_client';
import { addTreatment, listTreatments, listTreatmentsByAnimalName } from "../db/treatments";
import { addWeight, listWeights, listWeightsByAnimalName } from '../db/weights';

type Env = {
  ANIMAL_CARE_MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string }
};

export class AnimalCareAgent extends McpAgent<Env> {
  server = new McpServer({ name: 'Animal Care MCP', version: '1.0.0' });

  async init() {
    const conn = await this.env.NEON_CONNECTION_STRING.get();
    initialize(conn);
    registerAnimalCareTools(this.server);
  }
}

export const basePath = '/mcp/animal_care';
export const handler  = AnimalCareAgent.mount(`${basePath}/sse`, { binding: 'ANIMAL_CARE_MCP_OBJECT'});

function registerAnimalCareTools(server: McpServer) {
  server.tool("log-treatment", "Logs a treatment given to an animal.",
    {
      animal_name: z.string(),
      treatment_type: z.string(),
      product_used: z.string().optional(),
      dosage: z.string().optional(),
      administered_on: z.string(),
      administered_by: z.string().optional(),
      notes: z.string().optional()
    },
    async (input) => {
      const message = await addTreatment({
        ...input,
        animalName: input.animal_name,
        product_used: input.product_used ?? null,
        dosage: input.dosage ?? null,
        administered_by: input.administered_by ?? null,
        notes: input.notes ?? null
      });
      return { content: [{ type: "text", text: message ?? `Logged treatment for animal '${input.animal_name}'` }] };
    }
  );

  server.tool("list-treatments", "Lists all treatments for animals.",
    {},
    async () => {
      const treatments = await listTreatments();
      return { content: [{ type: "text", text: JSON.stringify(treatments) }] };
    }
  );

  server.tool("list-treatments-by-animal-name", "Lists treatments for an animal by name.",
    { name: z.string() },
    async (input) => {
      const treatments = await listTreatmentsByAnimalName(input.name);
      if (typeof treatments === 'string') {
        return { content: [{ type: 'text', text: treatments }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(treatments) }] };
    }
  );

  server.tool("log-weight", "Logs a weight measurement for an animal.",
    {
      animal_name: z.string(),
      weight_kg: z.number(),
      measured_on: z.string(),
      measured_by: z.string().optional()
    },
    async (input) => {
      const message = await addWeight({
        ...input,
        animalName: input.animal_name,
        measured_by: input.measured_by ?? null
      });
      return { content: [{ type: "text", text: message ?? `Logged weight for animal '${input.animal_name}'` }] };
    }
  );

  server.tool("list-weights", "Lists current weights for active animals",
    {},
    async () => {
      const weights = await listWeights();
      return { content: [{ type: "text", text: JSON.stringify(weights) }] };
    }
  );

  server.tool("list-weights-by-name", "Lists weight entries for an animal by name.",
    { name: z.string() },
    async (input) => {
      const weights = await listWeightsByAnimalName(input.name);
      if (typeof weights === 'string') {
        return { content: [{ type: 'text', text: weights }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(weights) }] };
    }
  );
}

