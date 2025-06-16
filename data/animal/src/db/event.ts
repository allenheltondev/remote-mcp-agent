import { getDbClient } from '../../../shared/db_client';
import { getAnimalByName } from './animals';

export type AnimalEvent = {
  id: string;
  animalName: string;
  event_type: string;
  event_date: string;
  description: string | null;
  recorded_by: string | null;
};

export async function addAnimalEvent(event: Omit<AnimalEvent, 'id'>): Promise<void | string> {
  const animal = await getAnimalByName(event.animalName);
  if (!animal) {
    return 'Animal not found';
  }

  const sql = getDbClient();
  await sql`INSERT INTO animal_events (animal_id, event_type, event_date, description, recorded_by)
    VALUES (${animal.id}, ${event.event_type}, ${event.event_date}, ${event.description}, ${event.recorded_by})`;
}

export async function listAnimalEvents(startDate?: string): Promise<(AnimalEvent & { animal_name: string })[]> {
  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;

  const result = await sql`
    SELECT ae.*, a.name as animal_name
    FROM animal_events ae
    JOIN animals a ON ae.animal_id = a.id
    WHERE ae.event_date >= ${start}
    ORDER BY ae.event_date DESC
  `;

  return result as (AnimalEvent & { animal_name: string })[];
}

export async function listAnimalEventsByName(name: string, startDate?: string): Promise<AnimalEvent[] | string> {
  const animal = await getAnimalByName(name);
  if (!animal) {
    return 'Animal not found';
  }

  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const result = await sql`SELECT e.* FROM animal_events WHERE animal_id = ${animal.id} AND event_date >= ${start} ORDER BY e.event_date DESC`;
  return result as AnimalEvent[];
}
