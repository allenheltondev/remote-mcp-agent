import { getDbClient } from '../../../shared/db_client';
import { getAnimalByName } from './animals';
export type Lineage = {
  id: string;
  animalName: string;
  mother_id: string | null;
  father_id: string | null;
};

export async function addUpdateLineage(entry: Omit<Lineage, 'id'>): Promise<string | void> {
  const animal = await getAnimalByName(entry.animalName);
  if(!animal){
    return 'Animal not found';
  }
  const sql = getDbClient();
  await sql`
    INSERT INTO parentage (child_id, mother_id, father_id)
    VALUES (${animal.id}, ${entry.mother_id}, ${entry.father_id})
    ON CONFLICT (child_id)
    DO UPDATE SET
      mother_id = EXCLUDED.mother_id,
      father_id = EXCLUDED.father_id
  `;
}


export async function getLineageByChildName(name: string): Promise<Lineage | string | null> {
  const animal = await getAnimalByName(name);
  if(!animal){
    return 'Animal not found';
  }

  const sql = getDbClient();
  const result = await sql`SELECT p.* FROM parentage p
    JOIN animals a ON p.child_id = a.id
    WHERE a.name = ${name}` as Lineage[];
  return result[0] || null;
}
