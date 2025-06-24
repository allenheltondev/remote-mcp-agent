import { getDbClient } from '../../../shared/db_client';

export type Animal = {
  id: string;
  tag_number: string | null;
  name: string | null;
  species: string;
  breed: string | null;
  sex: 'male' | 'female' | 'unknown';
  date_of_birth: string | null;
  date_acquired: string | null;
  is_active: boolean;
  notes: string | null;
};

export async function addAnimals(animals: Omit<Animal, 'id'>[]): Promise<void> {
  const sql = getDbClient();
  const queries = animals.map(a => sql`INSERT INTO animals (tag_number, name, species, breed, sex, date_of_birth, date_acquired, is_active, notes)
    VALUES (${a.tag_number}, ${a.name}, ${a.species}, ${a.breed}, ${a.sex}, ${a.date_of_birth}, ${a.date_acquired}, ${a.is_active}, ${a.notes})`);
  await Promise.all(queries);
}

export async function getAnimalByName(name: string): Promise<Animal | null> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM animals WHERE name ILIKE ${name}` as Animal[];
  return result[0] || null;
}

export async function listAnimals(): Promise<Animal[]> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM animals ORDER BY name`;
  return result as Animal[];
}

export async function listAnimalsBySpecies(species: string): Promise<Animal[]> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM animals WHERE species ILIKE ${species} ORDER BY name`;
  return result as Animal[];
}

export async function updateAnimalStatus(name: string, updates: { is_active?: boolean; notes?: string }): Promise<void | string> {
  const animal = await getAnimalByName(name);
  if(!animal){
    return 'Animal not found';
  }

  const newStatus = updates.is_active ?? animal.is_active;
  const newNotes = updates.notes ?? animal.notes;
  const sql = getDbClient();
  await sql`UPDATE animals SET is_active = ${newStatus}, notes = ${newNotes} WHERE name = ${name}`;
}

