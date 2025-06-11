import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addAnimalMovements, listAnimalMovements, listAnimalMovementsByName } from "../db/movements";
import { addAnimalEvents, listAnimalEvents, listAnimalEventsByName } from '../db/event';

export function registerMovementAndEventsTools(server: McpServer) {
  server.tool("log-animal-movement", "Logs a movement for an animal from one location to another.",
    {
      animal_id: z.string(),
      from_location: z.string().optional(),
      to_location: z.string(),
      moved_at: z.string()
    },
    async (input) => {
      await addAnimalMovements([{
        animal_id: input.animal_id,
        from_location: input.from_location ?? null,
        to_location: input.to_location,
        moved_at: input.moved_at
      }]);
      return { content: [{ type: "text", text: `Logged movement for animal '${input.animal_id}'` }] };
    }
  );

  server.tool("list-animal-movements", "Lists movements for an animal by ID.",
    { animal_id: z.string(), startDate: z.string().optional() },
    async (input) => {
      const data = await listAnimalMovements(input.animal_id, input.startDate);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool("list-animal-movements-by-name", "Lists movements for an animal by name.",
    { name: z.string(), startDate: z.string().optional() },
    async (input) => {
      const data = await listAnimalMovementsByName(input.name, input.startDate);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool("log-animal-event", "Logs a generic event for an animal.",
    {
      animal_id: z.string(),
      event_type: z.string(),
      event_date: z.string(),
      description: z.string().optional(),
      recorded_by: z.string().optional()
    },
    async (input) => {
      await addAnimalEvents([{
        animal_id: input.animal_id,
        event_type: input.event_type,
        event_date: input.event_date,
        description: input.description ?? null,
        recorded_by: input.recorded_by ?? null
      }]);
      return { content: [{ type: "text", text: `Logged event for animal '${input.animal_id}'` }] };
    }
  );

  server.tool("list-animal-events", "Lists events for an animal by ID.",
    { animal_id: z.string(), startDate: z.string().optional() },
    async (input) => {
      const data = await listAnimalEvents(input.animal_id, input.startDate);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool("list-animal-events-by-name", "Lists events for an animal by name.",
    { name: z.string(), startDate: z.string().optional() },
    async (input) => {
      const data = await listAnimalEventsByName(input.name, input.startDate);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
