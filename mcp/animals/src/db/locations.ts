import { getDbClient } from '../../../shared/db_client';
export type Location = {
  id: string;
  name: string;
  type: string | null;
  notes: string | null;
};

export async function addLocations(locations: Omit<Location, 'id'>[]): Promise<void> {
  const sql = getDbClient();
  const queries = locations.map(l => sql`INSERT INTO locations (name, type, notes)
    VALUES (${l.name}, ${l.type}, ${l.notes})`);
  await Promise.all(queries);
}

export async function getLocationByName(name: string): Promise<Location | null> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM locations WHERE name = ${name}`;
  return result[0] || null;
}

export async function listLocations(): Promise<Location[]> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM locations ORDER BY name`;
  return result as Location[];
}

export async function removeLocation(name: string): Promise<void> {
  const sql = getDbClient();
  await sql`DELETE FROM locations WHERE name = ${name}`;
}

export async function updateLocation(name: string, updates: { newName?: string; notes?: string }): Promise<void> {
  const sql = getDbClient();
  const existing = await getLocationByName(name);
  if (!existing) return;

  const newName = updates.newName ?? existing.name;
  const newNotes = updates.notes ?? existing.notes;
  await sql`UPDATE locations SET name = ${newName}, notes = ${newNotes} WHERE name = ${name}`;
}
