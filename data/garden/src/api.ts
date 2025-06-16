import { Hono } from 'hono';
import { gardenBedRoutes } from './routes/garden_beds';
import { harvestRoutes } from './routes/harvests';
import { observationRoutes } from './routes/observations';
import { plantRoutes } from './routes/plants';
import { seedRoutes } from './routes/seeds';

const app = new Hono();
app.route('/api', gardenBedRoutes);
app.route('/api', harvestRoutes);
app.route('/api', observationRoutes);
app.route('/api', plantRoutes);
app.route('/api', seedRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ message: 'Something went wrong' });
});

export const api = app;
