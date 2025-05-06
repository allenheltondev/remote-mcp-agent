import express from 'express';
import cors from 'cors';
import { listSeeds, addSeeds, removeSeeds, useSeeds, getSeedDetail } from '../mcp/src/db/seeds';
import { listGardenBeds, addGardenBed, updateGardenBed, getGardenBedByName } from '../mcp/src/db/gardenBeds';
import { addHarvest, getAllHarvestsWithBedName, getHarvestsByBedId } from '../mcp/src/db/harvests';
import { getAllObservationsWithBedName, addObservation, getObservationsByBedId } from '../mcp/src/db/observations';
import { addPlants, removePlants, getPlantsByBedId } from '../mcp/src/db/plants';

import { initialize } from '../mcp/src/db/client';

initialize(process.env.CONNECTION_STRING);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/seeds', async (req, res) => {
  const includeEmpty = req.query.includeEmpty === 'true';
  try {
    const seeds = await listSeeds(includeEmpty);
    res.send(seeds);
  } catch (err) {
    console.error('Error listing seeds:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.post('/seeds', async (req, res) => {
  try {
    const seeds = req.body.seeds;
    await addSeeds(seeds);
    res.status(201).json({ message: `Added ${seeds.length} seed(s)` });
  } catch (err) {
    console.error('Error adding seeds:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.get('/seeds/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const seed = await getSeedDetail(name);
    if (!seed) return res.status(404).json({ message: 'Seed not found' });
    res.json(seed);
  } catch (err) {
    console.error('Error getting seed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.delete('/seeds/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    await removeSeeds([name]);
    res.status(204).send();
  } catch (err) {
    console.error('Error removing seed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.post('/seeds/:name/quantities', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const { amount } = req.body;
    const remaining = await useSeeds(name, amount);
    res.json({ remaining });
  } catch (err) {
    console.error('Error using seeds:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.get('/beds', async (req, res) => {
  try {
    const beds = await listGardenBeds();
    res.json({ beds });
  } catch (err) {
    console.error('Error listing beds:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.put('/beds/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const bed = await getGardenBedByName(name);
    if (!bed) return res.status(404).json({ message: 'Bed not found' });

    await updateGardenBed(name, req.body);
    res.status(204).send();
  } catch (err) {
    console.error('Error updating bed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.post('/beds', async (req, res) => {
  try {
    const bed = req.body;
    const newBed = await addGardenBed(bed);
    res.status(201).json({ id: newBed.id });
  } catch (err) {
    console.error('Error adding bed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.get('/beds/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const bed = await getGardenBedByName(name);
    if (!bed) return res.status(404).json({ message: 'Bed not found' });
    res.json(bed);
  } catch (err) {
    console.error('Error getting bed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.get('/harvests', async (req, res) => {
  try {
    const harvests = await getAllHarvestsWithBedName();
    res.json({ harvests });
  } catch (err) {
    console.error('Error getting bed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.get('/beds/:name/harvests', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const bed = await getGardenBedByName(name);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }

    const harvests = await getHarvestsByBedId(bed.id);
    res.json({ harvests });
  } catch (err) {
    console.error('Error getting bed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.post('/beds/:name/harvests', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const bed = await getGardenBedByName(name);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }

    const harvest = req.body;
    const newHarvest = await addHarvest(bed.id, harvest);
    res.status(201).json({ id: newHarvest.id });
  } catch (err) {
    console.error('Error getting bed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.get('/observations', async (req, res) => {
  try {
    const observations = await getAllObservationsWithBedName();
    res.json({ observations });
  } catch (err) {
    console.error('Error getting bed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.post('/beds/:name/observations', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const bed = await getGardenBedByName(name);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }

    const observation = req.body;
    const newObservation = await addObservation(bed.id, observation);
    res.status(201).json({ id: newObservation.id });
  } catch (err) {
    console.error('Error getting bed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.get('/beds/:name/observations', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const bed = await getGardenBedByName(name);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }

    const observations = await getObservationsByBedId(bed.id);
    res.json({ observations });
  } catch (err) {
    console.error('Error getting bed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.get('/beds/:name/plants', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const bed = await getGardenBedByName(name);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }

    const plants = await getPlantsByBedId(bed.id);
    res.json({ plants });
  } catch (err) {
    console.error('Error getting bed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.post('/beds/:name/plants', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const bed = await getGardenBedByName(name);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }

    const plant = req.body;
    await addPlants(bed.id, [plant]);
    res.status(204);
  } catch (err) {
    console.error('Error getting bed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.delete('/beds/:name/plants/:plant', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const bed = await getGardenBedByName(name);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }

    const plant = decodeURIComponent(req.params.plant);
    await removePlants(bed.id, [plant]);
    res.status(204).send();
  } catch (err) {
    console.error('Error getting bed:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

export default app;
