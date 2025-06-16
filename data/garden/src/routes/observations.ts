import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as obs from '../db/observations';

export const observationInput = z.object({
  observationDate: z.string(),
  note: z.string().optional(),
  moisture: z.string().optional(),
  pests: z.string().optional(),
  health: z.string().optional(),
});

const bedNameParam = z.string();

export const observationRoutes = new Hono()
  .get('/beds/:bedName/observations', zValidator('param', z.object({ bedName: bedNameParam })), async (c) => {
    const { bedName } = c.req.valid('param');
    const data = await obs.getObservationsByBedName(bedName);
    if (typeof data === 'string') return c.json({ message: data }, 404);
    return c.json({ observations: data });
  })

  .post('/beds/:bedName/observations',
    zValidator('param', z.object({ bedName: bedNameParam })),
    zValidator('json', observationInput),
    async (c) => {
      const { bedName } = c.req.valid('param');
      const body = c.req.valid('json');
      const message = await obs.addObservation(bedName, body);
      if (message) return c.json({ message }, 404);
      return c.body(null, 204);
    },
  )

  .get('/observations', async (c) => {
    const data = await obs.getAllObservationsWithBedName();
    return c.json(data);
  });
