import { getDbClient } from '../../../shared/db_client.js';
import { v4 as uuidv4 } from 'uuid';
import { getGardenBedByName } from './garden_beds.js';

export type Plant = {
  id: string; // UUID
  bed_id: string; // UUID (FK to garden_beds)
  name: string;
  species: string | null;
  planting_date: string; // YYYY-MM-DD string
  notes: string | null;
};

export async function addPlants(bedName: string, plants: any[]): Promise<void | string> {
  const bed = await getGardenBedByName(bedName);
  if (typeof bed === 'string') return bed;

  const sql = getDbClient();
  const queries = plants.map(p => sql`INSERT INTO plants (id, bed_id, name, species, planting_date, notes)
     VALUES (${uuidv4()}, ${bed.id}, ${p.name}, ${p.species}, ${p.planting_date}, ${p.notes})`);
  await Promise.all(queries);
}

export async function removePlants(bedName: string, plantNames: string[]): Promise<void | string> {
  const bed = await getGardenBedByName(bedName);
  if (typeof bed === 'string') return bed;

  const sql = getDbClient();
  await sql`DELETE FROM plants WHERE bed_id = ${bed.id} AND name = ANY(${plantNames})`;
}

export async function getPlantsByBedName(bedName: string): Promise<Plant[] | string> {
  const bed = await getGardenBedByName(bedName);
  if (typeof bed === 'string') return bed;

  const sql = getDbClient();
  const result = await sql`SELECT * FROM plants WHERE bed_id = ${bed.id}`;
  return result as Plant[];
}

export async function clearBed(bedName: string): Promise<void | string> {
  const bed = await getGardenBedByName(bedName);
  if (typeof bed === 'string') return bed;
  const sql = getDbClient();
  await sql`DELETE FROM plants WHERE bed_id = ${bed.id}`;
}

export async function updatePlant(bedName: string, plantName: string, updates: Partial<Omit<Plant, 'id' | 'bed_id' | 'name'>>,): Promise<void | string> {
  const bed = await getGardenBedByName(bedName);
  if (typeof bed === 'string') return 'Bed not found';

  const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const sql = getDbClient();
  const existing = await sql`SELECT id FROM plants WHERE bed_id = ${bed.id} AND name = ${plantName}` as { id: string; }[];
  if (existing.length === 0) return 'Plant not found';

  const setPairs = Object.entries(updates).map(([field, value]) => `${field} = ${value}`);
  await sql`UPDATE plants SET ${setPairs.join(', ')} WHERE bed_id = $${entries.length + 1} AND name = $${entries.length + 2}`;
}

export async function getPlantByBedAndName(bedName: string, plantName: string): Promise<Plant | string> {
  const bed = await getGardenBedByName(bedName);
  if (typeof bed === 'string') return bed;

  const sql = getDbClient();
  const row = await sql`SELECT * FROM plants WHERE bed_id = ${bed.id} AND name = ${plantName}` as Plant[];
  return row[0] ?? 'Plant not found';
}

export async function listAllPlants(species?: string): Promise<any[]> {
  const sql = getDbClient();
  const rows = species
    ? await sql`
        SELECT
          p.name,
          p.species,
          p.planting_date,
          p.notes,
          b.name AS bed_name
        FROM plants p
        JOIN garden_beds b ON b.id = p.bed_id
        WHERE p.species = ${species}
      ` as Plant[]
    : await sql`
        SELECT
          p.name,
          p.species,
          p.planting_date,
          p.notes,
          b.name AS bed_name
        FROM plants p
        JOIN garden_beds b ON b.id = p.bed_id
      ` as Plant[];

  return rows.map((row) => {
    const plantingDate = new Date(row.planting_date);
    const formatted = {
      ...row,
      ...(!isNaN(plantingDate.getTime())) && { planting_date: plantingDate.toISOString().split("T")[0] }
    };

    return Object.fromEntries(
      Object.entries(formatted).filter(([_, value]) => value != null)
    );
  });
}

