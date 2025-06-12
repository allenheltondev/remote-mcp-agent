import { getDbClient } from '../../../shared/db_client.js';
import { v4 as uuidv4 } from 'uuid';
import { getPlantsByBedId } from './plants.js';
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

export async function getGardenBedByName(name: string): Promise<GardenBed> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM garden_beds WHERE name = ${name}`;
  const rows = result as GardenBed[];
  if (rows.length === 0) throw new Error(`Bed not found: ${name}`);
  const bed: GardenBed = rows[0];
  const plants = await getPlantsByBedId(bed.id);
  bed.plants = plants;

  return bed;
}

export async function listGardenBeds(): Promise<GardenBed[]> {
  const sql = getDbClient();
  const result = await sql`SELECT name, id FROM garden_beds`;
  return result as GardenBed[];
}

export async function updateGardenBed(name: string, updates: Partial<any>): Promise<GardenBed> {
  const sql = getDbClient();
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
  await sql`UPDATE garden_beds SET ${setClause} WHERE name = ${name}`;
  return getGardenBedByName(name);
}
