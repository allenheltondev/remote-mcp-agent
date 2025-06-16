import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as weight from '../db/weights';
import * as treatment from '../db/treatments';

const weightSchema = z.object({
  measured_on: z.string(),
  measured_by: z.string().optional(),
  weight_kg: z.number(),
});

const treatmentSchema = z.object({
  treatment_type: z.string(),
  product_used: z.string().optional(),
  dosage: z.string().optional(),
  administered_on: z.string(),
  administered_by: z.string().optional(),
  notes: z.string().optional(),
});

export const animalCareRoutes = new Hono()
  .post('/animals/:name/weights', zValidator('json', weightSchema), async (c) => {
    const name = c.req.param('name');
    const data = c.req.valid('json');
    const message = await weight.addWeight({
      ...data,
      measured_by: data.measured_by ?? null,
      animalName: name
    });
    if (message) return c.json({ message }, 404);
    return c.body(null, 204);
  })

  .get('/animals/:name/weights', async (c) => {
    const name = c.req.param('name');
    const weights = await weight.listWeightsByAnimalName(name);
    if (typeof weights === 'string') return c.json({ message: weights }, 404);
    return c.json({ weights });
  })

  .post('/animals/:name/treatments', zValidator('json', treatmentSchema), async (c) => {
    const name = c.req.param('name');
    const data = c.req.valid('json');
    const message = await treatment.addTreatment({
      ...data,
      animalName: name,
      product_used: data.product_used ?? null,
      dosage: data.dosage ?? null,
      administered_by: data.administered_by ?? null,
      notes: data.notes ?? null,
    });
    if (message) return c.json({ message }, 404);
    return c.body(null, 204);
  })

  .get('/animals/:name/treatments', async (c) => {
    const name = c.req.param('name');
    const treatments = await treatment.listTreatmentsByAnimalName(name);
    if (typeof treatments === 'string') return c.json({ message: treatments }, 404);
    return c.json({ treatments });
  })

  .get('/weights', async (c) => {
    const result = await weight.listWeights();
    return c.json(result);
  })

  .get('/treatments', async (c) => {
    const result = await treatment.listTreatments();
    return c.json(result);
  });
