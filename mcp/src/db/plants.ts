import { getDbClient } from '../../shared/db_client.js';
import { v4 as uuidv4 } from 'uuid';

export type Plant = {
  id: string; // UUID
  bed_id: string; // UUID (FK to garden_beds)
  name: string;
  species: string | null;
  planting_date: string; // YYYY-MM-DD string
  notes: string | null;
};

export async function addPlants(bedId: string, plants: any[]): Promise<void> {
  const sql = getDbClient();
  const queries = plants.map(p => sql`INSERT INTO plants (id, bed_id, name, species, planting_date, notes)
     VALUES (${uuidv4()}, ${bedId}, ${p.name}, ${p.species}, ${p.planting_date}, ${p.notes})`);
  await Promise.all(queries);
}

export async function removePlants(bedId: string, plantNames: string[]): Promise<void> {
  const sql = getDbClient();
  await sql`DELETE FROM plants WHERE bed_id = ${bedId} AND name = ANY(${plantNames})`;
}

export async function getPlantsByBedId(bedId: string): Promise<Plant[]> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM plants WHERE bed_id = ${bedId}`;
  return result as Plant[];
}
