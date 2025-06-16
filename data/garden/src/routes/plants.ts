import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as plants from '../db/plants';

/** Plant schema mirrors the OpenAPI Plant definition */
export const plantInput = z.object({
  name: z.string(),
  species: z.string().optional(),
  plantingDate: z.string().optional(),
  notes: z.string().optional()
});

export const updatePlant = z.object({
  species: z.string().optional(),
  plantingDate: z.string().optional(),
  notes: z.string().optional()
});
const bedNameParam = z.string();
const plantNameParam = z.string();

export const plantRoutes = new Hono()
  .get('/beds/:bedName/plants', zValidator('param', z.object({ bedName: bedNameParam })), async (c) => {
    const { bedName } = c.req.valid('param');
    const data = await plants.getPlantsByBedName(bedName);
    if (typeof data === 'string') return c.json({ message: data }, 404);
    return c.json({ plants: data });
  })

  .post('/beds/:bedName/plants',
    zValidator('param', z.object({ bedName: bedNameParam })),
    zValidator('json', plantInput),
    async (c) => {
      const { bedName } = c.req.valid('param');
      const body = c.req.valid('json');
      const message = await plants.addPlants(bedName, [body]);
      if (message) return c.json({ message }, 404);
      return c.body(null, 204);
    },
  )

  .delete('/beds/:bedName/plants/:plant',
    zValidator('param', z.object({ bedName: bedNameParam, plant: plantNameParam })),
    async (c) => {
      const { bedName, plant } = c.req.valid('param');
      const message = await plants.removePlants(bedName, [plant]);
      if (message) return c.json({ message }, 404);
      return c.body(null, 204);
    },
  )

  .get('/beds/:bedName/plants/:plant',
    zValidator('param', z.object({ bedName: bedNameParam, plant: plantNameParam })),
    async (c) => {
      const { bedName, plant } = c.req.valid('param');
      const plantData = await plants.getPlantByBedAndName(bedName, plant);
      if (typeof plantData === 'string') return c.json({ message: plantData }, 404);
      return c.json(plantData);
    }
  )

  .put('/beds/:bedName/plants/:plant',
    zValidator('param', z.object({ bedName: bedNameParam, plant: plantNameParam })),
    zValidator('json', updatePlant),
    async (c) => {
      const { bedName, plant } = c.req.valid('param');
      const body = c.req.valid('json');
      const message = await plants.updatePlant(bedName, plant, body);
      if (message) return c.json({ message }, 404);
      return c.body(null, 204);
    }
  )

  .delete('/beds/:bedName/plants',
    zValidator('param', z.object({ bedName: bedNameParam })),
    async (c) => {
      const { bedName } = c.req.valid('param');
      const message = await plants.clearBed(bedName);
      if (message) return c.json({ message }, 404);
      return c.body(null, 204);
    }
  )

  .get('/plants', async (c) => {
    const species = c.req.query('species');
    const data = await plants.listAllPlants(species);
    return c.json(data);
  });
