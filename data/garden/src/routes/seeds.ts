import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as seeds from '../db/seeds';

export const seedInput = z.object({
  name: z.string(),
  variety: z.string().optional(),
  species: z.string().optional(),
  source: z.string().optional(),
  purchase_date: z.string().optional(),
  quantity: z.number().optional(),
  days_to_germinate: z.number().optional(),
  days_to_maturity: z.number().optional(),
  planting_depth_inches: z.number().optional(),
});

export const seedQtyInput = z
  .object({
    newAmount: z.number().optional(),
    amountUsed: z.number().optional(),
  })
  .refine((o) => (o.newAmount ?? o.amountUsed) !== undefined, {
    message: 'Provide either newAmount or amountUsed',
  });

const seedNameParam = z.string();

export const seedRoutes = new Hono()
  .get('/seeds', async (c) => {
    const includeEmptyParam = c.req.query('includeEmpty');
    const includeEmpty = includeEmptyParam == 'true';
    const catalog = await seeds.listSeeds(includeEmpty);
    return c.json(catalog);
  })

  .post('/seeds', zValidator('json', seedInput), async (c) => {
    const body = c.req.valid('json');
    const id = await seeds.addSeeds([body]);
    return c.body(null, 204);
  })

  .get('/seeds/:seedName',
    zValidator('param', z.object({ seedName: seedNameParam })),
    async (c) => {
      const { seedName } = c.req.valid('param');
      const seed = await seeds.getSeedDetail(seedName);
      if (typeof seed === 'string') return c.json({ message: seed }, 404);
      return c.json(seed);
    },
  )

  .delete(
    '/seeds/:seedName',
    zValidator('param', z.object({ seedName: seedNameParam })),
    async (c) => {
      const { seedName } = c.req.valid('param');
      await seeds.removeSeeds([seedName]);
      return c.body(null, 204);
    },
  )

  .put(
    '/seeds/:seedName/quantities',
    zValidator('param', z.object({ seedName: seedNameParam })),
    zValidator('json', seedQtyInput),
    async (c) => {
      const { seedName } = c.req.valid('param');
      const { newAmount, amountUsed } = c.req.valid('json');
      const response = await seeds.useSeeds(seedName, { newAmount, amountUsed });
      if (typeof response === 'string') return c.json({ message: response }, 404);
      return c.json({ amount: response }, 200);
    },
  );
