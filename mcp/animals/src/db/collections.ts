import { getDbClient } from '../../../shared/db_client';
export type Collection = {
  id: string;
  animal_id: string;
  product_type: string;
  quantity: number;
  unit: string;
  collected_on: string;
  collected_by: string | null;
  notes: string | null;
};

export async function addCollections(collections: Omit<Collection, 'id'>[]): Promise<void> {
  const sql = getDbClient();
  const queries = collections.map(c => sql`INSERT INTO collections (animal_id, product_type, quantity, unit, collected_on, collected_by, notes)
    VALUES (${c.animal_id}, ${c.product_type}, ${c.quantity}, ${c.unit}, ${c.collected_on}, ${c.collected_by}, ${c.notes})`);
  await Promise.all(queries);
}

export async function getCollectionsByAnimalName(name: string, startDate?: string): Promise<Collection[]> {
  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const result = await sql`SELECT c.* FROM collections c
    JOIN animals a ON c.animal_id = a.id
    WHERE a.name = ${name} AND c.collected_on >= ${start} ORDER BY c.collected_on DESC`;
  return result as Collection[];
}

export async function getCollectionsByAnimalId(animalId: string): Promise<Collection[]> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM collections WHERE animal_id = ${animalId} ORDER BY collected_on DESC`;
  return result as Collection[];
}


export async function listCollections(startDate?: string): Promise<Collection[]> {
  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const result = await sql`SELECT * FROM collections WHERE collected_on >= ${start} ORDER BY collected_on DESC`;
  return result as Collection[];
}

export async function listCollectionsByProduct(productType: string, startDate?: string): Promise<Collection[]> {
  const sql = getDbClient();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const result = await sql`SELECT * FROM collections WHERE product_type = ${productType} AND collected_on >= ${start} ORDER BY collected_on DESC`;
  return result as Collection[];
}
