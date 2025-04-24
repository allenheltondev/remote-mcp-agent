import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { insertGardenBed, getGardenBedByName, listGardenBeds, updateGardenBed } from "./db/gardenBeds";
import { getAllObservations, getObservationsByBedId, logObservation } from "./db/observations";
import { insertPlants, removePlants } from "./db/plants";
import { getAllHarvests, getHarvestsByBedId, logHarvest } from "./db/harvests";

export function registerTools(server: McpServer) {
  server.tool("add-bed", "Adds a new garden bed to the system. Garden bed metadata only.",
    {
      name: z.string().describe("Name of the bed"),
      shape: z.string().describe("Shape of the bed"),
      size_sqft: z.number().describe("Size of the bed in square feet"),
      location: z.string().describe("Location description"),
      soil_type: z.string().describe("Type of soil").optional(),
      sunlight: z.string().describe("Sunlight availability").optional()
    },
    async (input) => {
      await insertGardenBed(input);

      return { content: [{ type: "text", text: `Added bed ${input.name}` }] };
    }
  );

  server.tool("get-bed", "Gets details of a specific bed by name like bed metadata and currently planted plants.",
    {
      name: z.string().describe("Name of the garden bed"),
    },
    async (input) => {
      const bed = await getGardenBedByName(input.name);
      const response = bed ? JSON.stringify(bed) : "Bed not found";

      return { content: [{ type: "text", text: response }] };
    }
  );

  server.tool("list-beds", "Lists all garden bed names and identifiers",
    {},
    async () => {
      const beds = await listGardenBeds();
      return { content: [{ type: "text", text: `Beds: ${beds.map(bed => `${bed.name} (id: ${bed.id})`).join(',')}` }] };
    }
  );

  server.tool("update-bed", "Updates existing garden bed metadata",
    {
      name: z.string().describe("Name of the garden bed"),
      shape: z.string().describe("Shape of the bed").optional(),
      size_sqft: z.number().describe("Size of the bed in square feet").optional(),
      location: z.string().describe("Location description").optional(),
      soil_type: z.string().describe("Type of soil").optional(),
      sunlight: z.string().describe("Sunlight availability").optional()
    },
    async (input) => {
      await updateGardenBed(input.name, input);
      return { content: [{ type: "text", text: `Garden bed updated` }] };
    }
  );

  server.tool("log-observation", "Logs an observation for a specific bed.",
    {
      name: z.string().describe("Name of the garden bed"),
      note: z.string().describe("Freeform note about the observation").optional(),
      moisture: z.string().describe("Moisture level").optional(),
      pests: z.string().describe("Observed pests").optional(),
      health: z.string().describe("Overall plant health").optional()
    },
    async (input) => {
      await logObservation(input.name, input);
      return { content: [{ type: "text", text: `Logged observation for ${input.name}` }] };
    }
  );

  server.tool("add-plants-to-bed", "Adds plants to a specific bed.",
    {
      bedId: z.string().describe("Identifier of the garden bed"),
      plants: z.array(z.object({
        name: z.string().describe("Name of the plant"),
        species: z.string().describe("Species of the plant").optional(),
        planting_date: z.string().describe("Date of planting"),
        notes: z.string().describe("Additional notes about the plant").optional()
      }))
    },
    async (input) => {
      await insertPlants(input.bedId, input.plants);
      return { content: [{ type: "text", text: `Added ${input.plants.length} plant(s) to garden bed '${input.bedId}'` }] };
    }
  );

  server.tool("remove-plants-from-bed", "Removes plants from a specific bed.",
    {
      bedId: z.string().describe("Identifier of the garden bed"),
      plants: z.array(z.string().describe("Name of the plant to remove"))
    },
    async (input) => {
      await removePlants(input.bedId, input.plants);
      return { content: [{ type: "text", text: `Removed ${input.plants.length} plant(s) to garden bed '${input.bedId}'` }] };
    }
  );

  server.tool("log-harvest", "Logs harvest information for a specific bed.",
    {
      bedId: z.string().describe("Identifier of the garden bed"),
      harvest_date: z.string().describe("Date of harvest"),
      harvest_quantity: z.number().describe("Quantity harvested"),
      notes: z.string().describe("Additional notes about the harvest").optional()
    },
    async (input) => {
      await logHarvest(input.bedId, input);
      return { content: [{ type: "text", text: `Logged harvest for garden bed '${input.bedId}'` }] };
    }
  );

  server.tool("list-all-harvests", "Lists all harvest records across the entire garden.",
    {},
    async () => {
      const harvests = await getAllHarvests();
      return { content: [{ type: "text", text: JSON.stringify(harvests) }] };
    }
  );

  server.tool("list-bed-harvests", "Lists all harvest records for a specific bed.",
    {
      bedId: z.string().describe("Identifier of the garden bed"),
    },
    async (input) => {
      const harvests = await getHarvestsByBedId(input.bedId);
      return { content: [{ type: "text", text: JSON.stringify(harvests) }] };
    }
  );

  server.tool("list-all-observations", "Lists all observations recorded across all garden beds.",
    {},
    async () => {
      const observations = await getAllObservations();
      return { content: [{ type: "text", text: JSON.stringify(observations) }] };
    }
  );

  server.tool("list-bed-observations", "Lists all observations for a specific bed",
    {
      bedId: z.string().describe("Identifier of the garden bed"),
    },
    async (input) => {
      const observations = await getObservationsByBedId(input.bedId);
      return { content: [{ type: "text", text: JSON.stringify(observations) }] };
    }
  );
}
