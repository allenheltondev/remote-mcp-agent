import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addCollections, getCollectionsByAnimalId, getCollectionsByAnimalName, listCollections, listCollectionsByProduct } from "../db/collections";

export function registerProductionTools(server: McpServer) {
  server.tool("log-collection", "Logs a collection (e.g. milk, eggs) for an animal.",
    {
      animal_id: z.string(),
      product_type: z.string(),
      quantity: z.number(),
      unit: z.string(),
      collected_on: z.string(),
      collected_by: z.string().optional(),
      notes: z.string().optional()
    },
    async (input) => {
      await addCollections([{
        ...input,
        collected_by: input.collected_by ?? null,
        notes: input.notes ?? null
      }]);
      return { content: [{ type: "text", text: `Logged collection for animal '${input.animal_id}'` }] };
    }
  );

  server.tool("list-collections", "Lists all collections since the start of the year (or optional start date).",
    { startDate: z.string().optional() },
    async (input) => {
      const data = await listCollections(input.startDate);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool("list-collections-by-product", "Lists collections of a specific product (e.g. milk).",
    {
      product_type: z.string(),
      startDate: z.string().optional()
    },
    async (input) => {
      const data = await listCollectionsByProduct(input.product_type, input.startDate);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool("list-collections-by-animal-id", "Lists collections by animal ID.",
    {
      animal_id: z.string(),
      startDate: z.string().optional()
    },
    async (input) => {
      const data = await getCollectionsByAnimalId(input.animal_id, input.startDate);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool("list-collections-by-animal-name", "Lists collections by animal name.",
    {
      name: z.string(),
      startDate: z.string().optional()
    },
    async (input) => {
      const data = await getCollectionsByAnimalName(input.name, input.startDate);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
