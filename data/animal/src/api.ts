import { Hono } from 'hono';
import { animalRoutes } from './routes/animal_registry';
import { animalCareRoutes } from './routes/animal_care';
import { locationRoutes } from './routes/locations';
import { movementAndEventsRoutes } from './routes/movement_and_events';
import { productionRoutes } from './routes/production';

const app = new Hono();
app.route('/api', animalRoutes);
app.route('/api', animalCareRoutes);
app.route('/api', locationRoutes);
app.route('/api', movementAndEventsRoutes);
app.route('/api', productionRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ message: 'Something went wrong' });
});

export const api = app;
