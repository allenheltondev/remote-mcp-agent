import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as db from '../db/locations';

const locationSchema = z.object({
  name: z.string(),
  type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateLocationSchema = z.object({
  name: z.string().optional(),
  notes: z.string().optional(),
});

export const locationRoutes = new Hono()
  .post('/locations', zValidator('json', locationSchema), async (c) => {
    const data = c.req.valid('json');
    await db.addLocations([{ ...data, type: data.type ?? null, notes: data.notes ?? null }]);
    return c.body(null, 201);
  })

  .get('/locations', async (c) => {
    const result = await db.listLocations();
    return c.json(result);
  })

  .get('/locations/:locationName', async (c) => {
    const name = c.req.param('locationName');
    const location = await db.getLocationByName(name);
    if (!location) return c.json({ message: 'Not found' }, 404);
    return c.json(location);
  })

  .put('/locations/:locationName', zValidator('json', updateLocationSchema), async (c) => {
    const name = c.req.param('locationName');
    const data = c.req.valid('json');
    await db.updateLocation(name, data);
    return c.body(null, 204);
  })

  .delete('/locations/:locationName', async (c) => {
    const name = c.req.param('locationName');
    await db.removeLocation(name);
    return c.body(null, 204);
  });
