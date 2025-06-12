import { getDbClient } from '../../../shared/db_client';
import { getAnimalByName } from './animals';
export type Collection = {
  id: string;
  animalName: string | null;
  product_type: string;
  quantity: number;
  unit: string;
  collected_on: string;
  collected_by: string | null;
  notes: string | null;
};

export async function addCollection(collection: Omit<Collection, 'id'>): Promise<void | string> {
  let animalId;
  if (collection.animalName) {
    const animal = await getAnimalByName(collection.animalName);
    if (!animal) {
      return 'Animal not found';
    }
    animalId = animal.id;
  }

  const sql = getDbClient();
  await sql`INSERT INTO collections (animal_id, product_type, quantity, unit, collected_on, collected_by, notes)
    VALUES (${animalId}, ${collection.product_type}, ${collection.quantity}, ${collection.unit}, ${collection.collected_on}, ${collection.collected_by}, ${collection.notes})`;
}

export async function getCollectionsByAnimalName(name: string, startDate?: string): Promise<Collection[] | string> {
  const animal = await getAnimalByName(name);
  if (!animal) {
    return 'Animal not found';
  }

  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const result = await sql`SELECT * FROM collections WHERE animal_id = ${animal.id} AND collected_on >= ${start} ORDER BY collected_on DESC`;
  return result as Collection[];
}

export async function listCollections(startDate?: string): Promise<Collection[]> {
  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const result = await sql`SELECT * FROM collections WHERE collected_on >= ${start} ORDER BY collected_on DESC`;
  return result as Collection[];
}

export async function listCollectionsByProduct(productType: string, startDate?: string): Promise<(Collection & { animal_name: string | null; })[]> {
  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;

  const result = await sql`
    SELECT c.*, a.name AS animal_name
    FROM collections c
    LEFT JOIN animals a ON c.animal_id = a.id
    WHERE c.product_type = ${productType} AND c.collected_on >= ${start}
    ORDER BY c.collected_on DESC
  `;

  return result as (Collection & { animal_name: string | null; })[];
}
