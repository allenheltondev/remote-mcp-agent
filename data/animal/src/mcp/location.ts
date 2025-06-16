import { z } from "zod";
import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initialize } from '../../../shared/db_client';
import { addLocations, getLocationByName, listLocations, removeLocation, updateLocation } from "../db/locations";

type Env = {
  LOCATION_MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string };
};

export class LocationAgent extends McpAgent<Env> {
  server = new McpServer({ name: 'Location MCP', version: '1.0.0' });

  async init() {
    const conn = await this.env.NEON_CONNECTION_STRING.get();
    initialize(conn);
    registerLocationTools(this.server);
  }
}

export const basePath = '/mcp/location';
export const handler = LocationAgent.mount(`${basePath}/sse`, { binding: 'LOCATION_MCP_OBJECT' });

function registerLocationTools(server: McpServer) {
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
