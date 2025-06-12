import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as db from '../db/animals';

const animalInput = z.object({
  name: z.string(),
  species: z.string(),
  breed: z.string().nullable().optional(),
  sex: z.enum(['male', 'female', 'unknown']).optional(),
  date_of_birth: z.string().optional(),
  date_acquired: z.string().optional(),
  is_active: z.boolean().optional(),
  tag_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const updateAnimal = z.object({
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
});

export const animalRoutes = new Hono()
  .post('/animals',
    zValidator('json', animalInput),
    async (c) => {
      const body = c.req.valid('json');
      const id = await db.addAnimals([{
        ...body,
        breed: body.breed ?? null,
        sex: body.sex ?? 'unknown',
        date_of_birth: body.date_of_birth ?? null,
        date_acquired: body.date_acquired ?? null,
        tag_number: body.tag_number ?? null,
        notes: body.notes ?? null,
        is_active: body.is_active ?? true
      }]);
      return c.json({ id }, 201);
    }
  )

  .get('/animals', async (c) => {
    const species = c.req.query('species');

    let animals: db.Animal[];
    if (species) {
      animals = await db.listAnimalsBySpecies(species);
    } else {
      animals = await db.listAnimals();
    }
    return c.json(animals);
  })

  .get('/animals/:name', async (c) => {
    const name = c.req.param('name');
    const result = await db.getAnimalByName(name);
    if (!result) return c.json({ message: 'Not found' }, 404);
    return c.json(result);
  })

  .put('/animals/:name',
    zValidator('json', updateAnimal),
    async (c) => {
      const name = c.req.param('name');
      const data = c.req.valid('json');
      const message = await db.updateAnimalStatus(name, { ...data });
      if (message) {
        return c.json({ message }, 404);
      }
      return c.body(null, 204);
    }
  );
