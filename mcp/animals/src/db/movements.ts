import { getDbClient } from '../../../shared/db_client';
export type AnimalMovement = {
  id: string;
  animal_id: string;
  from_location: string | null;
  to_location: string;
  moved_at: string;
};

export async function addAnimalMovements(movements: Omit<AnimalMovement, 'id'>[]): Promise<void> {
  const sql = getDbClient();
  const queries = movements.map(m => sql`INSERT INTO animal_movements (animal_id, from_location, to_location, moved_at)
    VALUES (${m.animal_id}, ${m.from_location}, ${m.to_location}, ${m.moved_at})`);
  await Promise.all(queries);
}

export async function listAnimalMovements(animalId: string, startDate?: string): Promise<AnimalMovement[]> {
  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const result = await sql`SELECT * FROM animal_movements WHERE animal_id = ${animalId} AND moved_at >= ${start} ORDER BY moved_at DESC`;
  return result as AnimalMovement[];
}

export async function listAnimalMovementsByName(name: string, startDate?: string): Promise<AnimalMovement[]> {
  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const result = await sql`SELECT m.* FROM animal_movements m
    JOIN animals a ON m.animal_id = a.id
    WHERE a.name = ${name} AND m.moved_at >= ${start} ORDER BY m.moved_at DESC`;
  return result as AnimalMovement[];
}
