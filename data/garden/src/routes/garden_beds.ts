import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as beds from '../db/garden_beds';

export const gardenBedInput = z.object({
  name: z.string(),
  shape: z.string().optional(),
  sizeSqft: z.string().optional(),
  location: z.string().optional(),
  soilType: z.string().optional(),
  sunlight: z.string().optional(),
});

export const bedNameParam = z.string();

export const gardenBedRoutes = new Hono()
  .get('/beds', async c => {
    const all = await beds.listGardenBeds();
    return c.json(all);
  })

  .post('/beds', zValidator('json', gardenBedInput), async c => {
    const body = c.req.valid('json');
    const id = await beds.addGardenBed(body);
    return c.json({ id }, 201);
  })

  .get('/beds/:bedName', zValidator('param', z.object({ bedName: bedNameParam })), async c => {
    const { bedName } = c.req.valid('param');
    const detail = await beds.getGardenBedByName(bedName);
    if (!detail) return c.json({ message: 'Not found' }, 404);
    return c.json(detail);
  })

  .put('/beds/:bedName',
    zValidator('param', z.object({ bedName: bedNameParam })),
    zValidator('json', gardenBedInput.partial()),
    async c => {
      const { bedName } = c.req.valid('param');
      const patch = c.req.valid('json');
      const message = await beds.updateGardenBed(bedName, patch);
      if (message) return c.json({ message }, 404);
      return c.body(null, 204);
    },
  );
