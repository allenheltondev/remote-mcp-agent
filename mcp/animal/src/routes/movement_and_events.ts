import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as movement from '../db/movements';
import * as event from '../db/event';

const movementSchema = z.object({
  from_location: z.string().optional(),
  to_location: z.string(),
  moved_at: z.string()
});

const eventSchema = z.object({
  event_type: z.string(),
  event_date: z.string(),
  description: z.string().optional(),
  recorded_by: z.string().optional()
});

export const movementAndEventsRoutes = new Hono()
  .post('/animals/:name/movements',
    zValidator('json', movementSchema),
    async (c) => {
      const name = c.req.param('name');
      const body = c.req.valid('json');
      const error = await movement.addAnimalMovement({
        ...body,
        animalName: name,
        from_location: body.from_location ?? null
      });
      if (error) return c.json({ message: error }, 404);
      return c.body(null, 204);
    }
  )

  .get('/animals/:name/movements', async (c) => {
    const name = c.req.param('name');
    const start = c.req.query('startDate');
    const result = await movement.listAnimalMovements(name, start);
    if (typeof result === 'string') return c.json({ message: result }, 404);
    return c.json(result);
  })

  .post('/animals/:name/events',
    zValidator('json', eventSchema),
    async (c) => {
      const name = c.req.param('name');
      const body = c.req.valid('json');
      const error = await event.addAnimalEvent({
        ...body,
        animalName: name,
        description: body.description ?? null,
        recorded_by: body.recorded_by ?? null
      });
      if (error) return c.json({ message: error }, 404);
      return c.body(null, 204);
    }
  )

  .get('/animals/:name/events', async (c) => {
    const name = c.req.param('name');
    const start = c.req.query('startDate');
    const result = await event.listAnimalEventsByName(name, start);
    if (typeof result === 'string') return c.json({ message: result }, 404);
    return c.json(result);
  })

  .get('/events', async (c) => {
    const result = await event.listAnimalEvents();
    return c.json(result);
  });
