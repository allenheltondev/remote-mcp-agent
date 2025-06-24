import { getDbClient } from '../../../shared/db_client.js';
import { v4 as uuidv4 } from 'uuid';
import { getPlantsByBedName } from './plants.js';
import { Plant } from './plants.js';

type GardenBed = {
  id: string; // UUID
  name: string;
  shape: string | null;
  size_sqft: number | null;
  location: string | null;
  soil_type: string | null;
  sunlight: string | null;
  created_at: string; // ISO timestamp string
  plants?: Plant[];
};

export async function addGardenBed(params: any): Promise<GardenBed> {
  const id = uuidv4();
  const sql = getDbClient();
  await sql`INSERT INTO garden_beds (id, name, shape, size_sqft, location, soil_type, sunlight)
     VALUES (${id}, ${params.name}, ${params.shape}, ${params.size_sqft}, ${params.location}, ${params.soil_type}, ${params.sunlight})`;
  return { id, ...params, created_at: new Date().toISOString() };
}

export async function getGardenBedByName(name: string, includePlants: boolean = false): Promise<GardenBed | string> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM garden_beds WHERE name ILIKE ${name}`;
  const rows = result as GardenBed[];
  if (rows.length === 0) return 'Garden bed not found';
  const bed: GardenBed = rows[0];
  if (includePlants) {
    const plants = await getPlantsByBedName(name);
    if (typeof plants !== 'string') {
      bed.plants = plants;
    }
  }
  return bed;
}

export async function listGardenBeds(): Promise<GardenBed[]> {
  const sql = getDbClient();
  const result = await sql`SELECT name FROM garden_beds`;
  return result as GardenBed[];
}

export async function updateGardenBed(name: string, updates: Partial<GardenBed>,): Promise<void | string> {
  if (Object.keys(updates).length === 0) return;

  const bed = await getGardenBedByName(name);
  if (typeof bed === 'string') return bed;

  const setPairs = Object.entries(updates).map(([field, value]) => `${field} = ${value}`);

  const db = getDbClient();
  await db`UPDATE garden_beds SET ${setPairs.join(', ')} WHERE id = ${bed.id}`;
}
