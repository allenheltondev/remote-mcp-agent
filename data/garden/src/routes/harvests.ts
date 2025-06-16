import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as harvests from '../db/harvests';

export const harvestInput = z.object({
  harvestDate: z.string(),
  crop: z.string().optional(),
  quantity: z.number().optional(),
  notes: z.string().optional(),
});

const bedNameParam = z.string();

export const harvestRoutes = new Hono()
  .get('/beds/:bedName/harvests', zValidator('param', z.object({ bedName: bedNameParam })), async (c) => {
    const { bedName } = c.req.valid('param');
    const data = await harvests.getHarvestsByBedName(bedName);
    if (typeof data === 'string') return c.json({ message: data }, 404);
    return c.json({ harvests: data });
  })

  .post('/beds/:bedName/harvests',
    zValidator('param', z.object({ bedName: bedNameParam })),
    zValidator('json', harvestInput),
    async (c) => {
      const { bedName } = c.req.valid('param');
      const body = c.req.valid('json');
      const message = await harvests.addHarvest(bedName, body);
      if (message) return c.json({ message }, 404);
      return c.body(null, 204);
    },
  )

  .get('/harvests', async (c) => {
    const data = await harvests.getAllHarvestsWithBedName();
    return c.json(data);
  });
