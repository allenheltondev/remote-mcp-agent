import { getDbClient } from '../../../shared/db_client';
import { getAnimalByName } from './animals';
export type AnimalMovement = {
  id: string;
  animalName: string;
  from_location: string | null;
  to_location: string;
  moved_at: string;
};

export async function addAnimalMovement(movement: Omit<AnimalMovement, 'id'>): Promise<void | string> {
  const animal = await getAnimalByName(movement.animalName);
  if (!animal) {
    return 'Animal not found';
  }

  const sql = getDbClient();
  await sql`INSERT INTO animal_movements (animal_id, from_location, to_location, moved_at)
    VALUES (${animal.id}, ${movement.from_location}, ${movement.to_location}, ${movement.moved_at})`;
}

export async function listAnimalMovements(animalName: string, startDate?: string): Promise<AnimalMovement[] | string> {
  const animal = await getAnimalByName(animalName);
  if (!animal) {
    return 'Animal not found';
  }

  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const result = await sql`SELECT * FROM animal_movements WHERE animal_id = ${animal.id} AND moved_at >= ${start} ORDER BY moved_at DESC`;
  return result as AnimalMovement[];
}
