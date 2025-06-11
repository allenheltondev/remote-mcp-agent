import { getDbClient } from '../../../shared/db_client';
import { getAnimalByName } from './animals';
export type Weight = {
  id: string;
  animalName: string;
  weight_kg: number;
  measured_on: string;
  measured_by: string | null;
};

export async function addWeight(weight: Omit<Weight, 'id'>): Promise<void | string> {
  const animal = await getAnimalByName(weight.animalName);
  if (!animal) {
    return 'Animal not found';
  }
  const sql = getDbClient();
  await sql`INSERT INTO weights (animal_id, weight_kg, measured_on, measured_by)
    VALUES (${animal.id}, ${weight.weight_kg}, ${weight.measured_on}, ${weight.measured_by})`;
}

export async function listWeights(): Promise<Weight[]> {
  const sql = getDbClient();
  const result = await sql`
    SELECT DISTINCT ON (w.animal_id)
      w.id,
      w.animal_id,
      a.name AS animal_name,
      w.weight,
      w.measured_on
    FROM weights w
    JOIN animals a ON w.animal_id = a.id
    WHERE a.is_active = true
    ORDER BY w.animal_id, w.measured_on DESC
  `;
  return result as Weight[];
}

export async function listWeightsByAnimalName(name: string): Promise<Weight[]> {
  const sql = getDbClient();
  const result = await sql`SELECT w.* FROM weights w
    JOIN animals a ON w.animal_id = a.id
    WHERE a.name = ${name} ORDER BY w.measured_on DESC`;
  return result as Weight[];
}
