import { getDbClient } from '../../../shared/db_client';
export type AnimalEvent = {
  id: string;
  animal_id: string;
  event_type: string;
  event_date: string;
  description: string | null;
  recorded_by: string | null;
};

export async function addAnimalEvents(events: Omit<AnimalEvent, 'id'>[]): Promise<void> {
  const sql = getDbClient();
  const queries = events.map(e => sql`INSERT INTO animal_events (animal_id, event_type, event_date, description, recorded_by)
    VALUES (${e.animal_id}, ${e.event_type}, ${e.event_date}, ${e.description}, ${e.recorded_by})`);
  await Promise.all(queries);
}

export async function listAnimalEvents(animalId: string, startDate?: string): Promise<AnimalEvent[]> {
  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const result = await sql`SELECT * FROM animal_events WHERE animal_id = ${animalId} AND event_date >= ${start} ORDER BY event_date DESC`;
  return result as AnimalEvent[];
}

export async function listAnimalEventsByName(name: string, startDate?: string): Promise<AnimalEvent[]> {
  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const result = await sql`SELECT e.* FROM animal_events e
    JOIN animals a ON e.animal_id = a.id
    WHERE a.name = ${name} AND e.event_date >= ${start} ORDER BY e.event_date DESC`;
  return result as AnimalEvent[];
}
