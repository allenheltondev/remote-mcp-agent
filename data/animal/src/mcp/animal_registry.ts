import { z } from "zod";
import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initialize } from '../../../shared/db_client';
import { addAnimals, getAnimalByName, listAnimals, listAnimalsBySpecies, updateAnimalStatus } from "../db/animals";
import { addUpdateLineage, getLineageByChildName } from '../db/lineage';

type Env = {
  ANIMAL_REGISTRY_MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string } };

export class AnimalRegistryAgent extends McpAgent<Env> {
  server = new McpServer({ name: 'Animal Registry MCP', version: '1.0.0' });

  async init() {
    const conn = await this.env.NEON_CONNECTION_STRING.get();
    initialize(conn);
    registerAnimalCoreTools(this.server);
  }
}

export const basePath = '/mcp/animal_registry';
export const handler  = AnimalRegistryAgent.mount(`${basePath}/sse`, { binding: 'ANIMAL_REGISTRY_MCP_OBJECT'});

function registerAnimalCoreTools(server: McpServer) {
  server.tool("add-animal", "Registers new animals in the system.",
    {
      animals: z.array(z.object({
        name: z.string(),
        species: z.string(),
        breed: z.string().optional(),
        sex: z.enum(['male', 'female', 'unknown']).optional(),
        date_of_birth: z.string().optional(),
        date_acquired: z.string().optional(),
        is_active: z.boolean().optional(),
        tag_number: z.string().nullable().optional(),
        notes: z.string().nullable().optional()
      }))
    },
    async (input) => {
      const normalized = input.animals.map(a => ({
        ...a,
        tag_number: a.tag_number ?? null,
        notes: a.notes ?? null,
        breed: a.breed ?? null,
        sex: a.sex ?? 'unknown',
        date_of_birth: a.date_of_birth ?? null,
        date_acquired: a.date_acquired ?? null,
        is_active: a.is_active ?? true
      }));
      await addAnimals(normalized);
      return { content: [{ type: "text", text: `Added ${normalized.length} animal(s)` }] };
    }
  );

  server.tool("get-animal-by-name", "Gets a specific animal by name.",
    { name: z.string() },
    async (input) => {
      const animal = await getAnimalByName(input.name);
      return { content: [{ type: "text", text: JSON.stringify(animal, null, 2) }] };
    }
  );

  server.tool("list-animals", "Lists all animals.",
    {},
    async () => {
      const animals = await listAnimals();
      return { content: [{ type: "text", text: JSON.stringify(animals, null, 2) }] };
    }
  );

  server.tool("list-animals-by-species", "Lists animals by species.",
    { species: z.string() },
    async (input) => {
      const animals = await listAnimalsBySpecies(input.species);
      return { content: [{ type: "text", text: JSON.stringify(animals, null, 2) }] };
    }
  );

  server.tool("log-lineage", "Adds lineage information for an animal.",
    {
      animal_name: z.string(),
      mother_id: z.string().nullable(),
      father_id: z.string().nullable()
    },
    async (input) => {
      const message = await addUpdateLineage({ animalName: input.animal_name, mother_id: input.mother_id, father_id: input.father_id });
      return { content: [{ type: "text", text: message ?? `Recorded parentage for animal ${input.animal_name}` }] };
    }
  );

  server.tool("get-lineage-by-animal-name", "Gets lineage by child name.",
    { name: z.string() },
    async (input) => {
      const data = await getLineageByChildName(input.name);
      if (typeof data === 'string') {
        return { content: [{ type: "text", text: data }] };
      } else if (typeof data === 'object') {
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
      else {
        return { content: [{ type: "text", text: 'No lineage information found' }] };
      }
    }
  );

  server.tool("update-animal-status", "Updates an animal's active status and notes.",
    {
      name: z.string(),
      is_active: z.boolean().optional(),
      notes: z.string().optional()
    },
    async (input) => {
      await updateAnimalStatus(input.name, { is_active: input.is_active, notes: input.notes });
      return { content: [{ type: "text", text: `Updated animal status for '${input.name}'` }] };
    }
  );
}
