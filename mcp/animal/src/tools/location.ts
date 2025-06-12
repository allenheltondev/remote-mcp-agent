import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addLocations, getLocationByName, listLocations, removeLocation, updateLocation } from "../db/locations";

export function registerLocationTools(server: McpServer) {
  server.tool("add-location", "Adds a new location.",
    {
      name: z.string(),
      type: z.string().nullable().optional(),
      notes: z.string().nullable().optional()
    },
    async (input) => {
      await addLocations([{ name: input.name, type: input.type ?? null, notes: input.notes ?? null }]);
      return { content: [{ type: "text", text: `Added location '${input.name}'` }] };
    }
  );

  server.tool("get-location", "Gets details about a location by name.",
    {
      name: z.string()
    },
    async (input) => {
      const loc = await getLocationByName(input.name);
      return { content: [{ type: "text", text: loc ? JSON.stringify(loc) : "Location not found" }] };
    }
  );

  server.tool("list-locations", "Lists all known locations.", {},
    async () => {
      const locations = await listLocations();
      return { content: [{ type: "text", text: JSON.stringify(locations) }] };
    }
  );

  server.tool("remove-location", "Removes a location by name.",
    { name: z.string() },
    async (input) => {
      await removeLocation(input.name);
      return { content: [{ type: "text", text: `Removed location '${input.name}'` }] };
    }
  );

  server.tool("update-location", "Updates the name or notes for a location.",
    {
      name: z.string(),
      newName: z.string().optional(),
      notes: z.string().optional()
    },
    async (input) => {
      await updateLocation(input.name, { newName: input.newName, notes: input.notes });
      return { content: [{ type: "text", text: `Updated location '${input.name}'` }] };
    }
  );
}
