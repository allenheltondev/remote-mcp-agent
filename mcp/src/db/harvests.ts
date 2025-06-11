import { getDbClient} from '../../shared/db_client.js';
import { v4 as uuidv4 } from 'uuid';

type Harvest = {
  id: string; // UUID
  bed_id: string; // UUID (FK to garden_beds)
  harvest_date: string; // YYYY-MM-DD string
  crop: string | null;
  quantity: number | null;
  notes: string | null;
};

export async function addHarvest(bedId: string, harvest: any): Promise<Harvest> {
  const sql = getDbClient();
  const id = uuidv4();
  await sql`INSERT INTO harvests (id, bed_id, harvest_date, crop, quantity, notes)
     VALUES (${id}, ${bedId}, ${harvest.harvest_date}, ${harvest.crop}, ${harvest.harvest_quantity}, ${harvest.notes})`;
  return { id, bedId, ...harvest };
}

export async function getHarvestsByBedId(bedId: string): Promise<Harvest[]> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM harvests WHERE bed_id = ${bedId} ORDER BY harvest_date DESC`;
  return result as Harvest[];
}

export async function getAllHarvests(): Promise<Harvest[]> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM harvests ORDER BY harvest_date DESC`;
  return result as Harvest[];
}

export async function getAllHarvestsWithBedName(): Promise<Harvest[]> {
  const sql = getDbClient();
  const result = await sql`SELECT h.*, b.name AS bed_name
     FROM harvests h
     JOIN garden_beds b ON h.bed_id = b.id
     ORDER BY h.harvest_date DESC`;
  return result as Harvest[];
}
