import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as db from '../db/collections';

const collectionInput = z.object({
  animal_name: z.string().optional(),
  product_type: z.string(),
  quantity: z.number(),
  unit: z.string(),
  collected_on: z.string(),
  collected_by: z.string().optional(),
  notes: z.string().optional(),
});

export const productionRoutes = new Hono()

  .get('/collections', async (c) => {
    const productType = c.req.query('product_type');
    const startDate = c.req.query('startDate');
    let result: db.Collection[];
    if (productType) {
      result = await db.listCollectionsByProduct(productType, startDate);
    } else {
      result = await db.listCollections(startDate);
    }
    return c.json(result);
  })

  .post('/collections',
    zValidator('json', collectionInput),
    async (c) => {
      const body = c.req.valid('json');
      const message = await db.addCollection({
        ...body,
        animalName: body.animal_name ?? null,
        product_type: body.product_type ?? null,
        collected_by: body.collected_by ?? null,
        notes: body.notes ?? null,
      });
      if (message) {
        return c.json({ message }, 404);
      }
      return c.body(null, 204);
    }
  )

  .get('/animals/:name/collections', async (c) => {
    const name = c.req.param('name');
    const startDate = c.req.query('startDate') || undefined;
    const result = await db.getCollectionsByAnimalName(name, startDate);
    if (typeof result === 'string') return c.json({ message: result }, 404);
    return c.json(result);
  });
