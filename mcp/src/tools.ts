import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addGardenBed, getGardenBedByName, listGardenBeds, updateGardenBed } from "./db/gardenBeds";
import { getAllObservations, getObservationsByBedId, addObservation } from "./db/observations";
import { addPlants, removePlants } from "./db/plants";
import { getAllHarvests, getHarvestsByBedId, addHarvest } from "./db/harvests";
import { addSeeds, removeSeeds, listSeeds, useSeeds, getSeedDetail, Seed } from "./db/seeds";

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
      await addGardenBed(input);

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
      await addObservation(input.name, input);
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
      await addPlants(input.bedId, input.plants);
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
      await addHarvest(input.bedId, input);
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

  server.tool("add-seeds", "Adds seeds to the system inventory.",
    {
      seeds: z.array(
        z.object({
          name: z.string().describe("Name of the seed"),
          variety: z.string().describe("Variety of the seed").optional(),
          species: z.string().describe("Species of the seed").optional(),
          source: z.string().describe("Source where the seed was obtained").optional(),
          purchase_date: z.string().describe("Date the seed was purchased (ISO 8601)").optional(),
          quantity: z.number().describe("Amount of seeds or seed packets").optional(),

          days_to_germinate: z.number().describe("Days required for the seed to germinate").optional(),
          days_to_maturity: z.number().describe("Days required to reach maturity").optional(),
          planting_depth_inches: z.number().describe("Recommended planting depth in inches").optional(),
          spacing_inches: z.number().describe("Recommended spacing between plants in inches").optional(),
          sun_requirements: z.string().describe("Sunlight needs like 'full sun' or 'partial shade'").optional(),
          hardiness_zone_range: z.string().describe("USDA hardiness zone range, like '5-9'").optional(),

          notes: z.string().describe("User notes about the seed").optional(),
          tags: z.array(z.string()).describe("Tags for filtering or categorization").optional(),

          preferred_soil_ph: z.string().describe("Preferred soil pH range").optional(),
          fertilization_needs: z.string().describe("Fertilizer or soil nutrition requirements").optional(),
          companion_plants: z.array(z.string()).describe("Plants that grow well with this seed").optional(),
          avoid_near: z.array(z.string()).describe("Plants that should not be grown near this seed").optional()
        })
      )
    },
    async (input) => {
      await addSeeds(input.seeds as Seed[]);
      return { content: [{ type: "text", text: `Added ${input.seeds.length} seed(s)` }] };
    }
  );

  server.tool("remove-seeds", "Removes seeds from the system inventory.",
    {
      seeds: z.array(z.string().describe("Name of the seed to remove"))
    },
    async (input) => {
      await removeSeeds(input.seeds);
      return { content: [{ type: "text", text: `Removed ${input.seeds.length} seed(s) from catalog` }] };
    }
  );

  server.tool("use-seeds", "Removes quantity from seed catalog",
    {
      seedName: z.string().describe("Name of the seed to use"),
      amount: z.number().describe("Amount of seed to use")
    },
    async (input) => {
      const remaining = await useSeeds(input.seedName, input.amount);
      return { content: [{ type: "text", text: `Remaining quantity of ${input.seedName}: ${remaining}` }] };
    }
  );

  server.tool("list-seeds", "Lists all seeds in the system inventory.",
    {
      includeEmpty: z.boolean().describe("Include seeds with zero quantity in the list").optional()
    },
    async (input) => {
      const seeds = await listSeeds(input.includeEmpty ?? false);
      const catalog = seeds.map(seed => {
        const parts = [
          `${seed.name}`,
          seed.variety ? `(${seed.variety})` : null,
          seed.species ? `– ${seed.species}` : null,
          seed.quantity != null ? `– ${seed.quantity} seed(s)` : null
        ].filter(Boolean);

        return parts.join(" ");
      })
      .join("\n");
      return { content: [{ type: "text", text: catalog }] };
    }
  );

  server.tool("get-seed-detail", "Gets all details about a specific seed", {
    seedName: z.string().describe("Name of the seed")
  },
    async (input) => {
      const seed = await getSeedDetail(input.seedName);
      return { content: [{ type: "text", text: JSON.stringify(seed) }] };
    }
  );
}
