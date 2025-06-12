import { getDbClient } from '../../../shared/db_client';
import { getAnimalByName } from './animals';
export type Treatment = {
  id: string;
  animalName: string;
  treatment_type: string;
  product_used: string | null;
  dosage: string | null;
  administered_on: string;
  administered_by: string | null;
  notes: string | null;
};

export async function addTreatment(treatment: Omit<Treatment, 'id'>): Promise<string | void> {
  const animal = await getAnimalByName(treatment.animalName);
  if (!animal) {
    return 'Animal not found';
  }

  const sql = getDbClient();
  await sql`INSERT INTO treatments (animal_id, treatment_type, product_used, dosage, administered_on, administered_by, notes)
    VALUES (${animal.id}, ${treatment.treatment_type}, ${treatment.product_used}, ${treatment.dosage}, ${treatment.administered_on}, ${treatment.administered_by}, ${treatment.notes})`;
}

export async function listTreatments(): Promise<Treatment[]> {
  const sql = getDbClient();
  const result = await sql`
    SELECT t.*, a.name
    FROM treatments t
    JOIN animals a ON t.animal_id = a.id
    WHERE a.is_active = true
    ORDER BY t.administered_on DESC
  `;
  return result as Treatment[];
}

export async function listTreatmentsByAnimalName(name: string): Promise<Treatment[] | string> {
  const animal = await getAnimalByName(name);
  if (!animal) {
    return 'Animal not found';
  }

  const sql = getDbClient();
  const result = await sql`SELECT t.* FROM treatments t
    JOIN animals a ON t.animal_id = a.id
    WHERE a.name = ${name} ORDER BY t.administered_on DESC`;
  return result as Treatment[];
}
