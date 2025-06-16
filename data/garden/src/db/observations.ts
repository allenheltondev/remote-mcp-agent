import { getDbClient } from '../../../shared/db_client.js';
import { v4 as uuidv4 } from 'uuid';
import { getGardenBedByName } from './garden_beds.js';

type Observation = {
  id: string; // UUID
  bed_id: string; // UUID (FK to garden_beds)
  timestamp: string; // ISO timestamp string
  note: string | null;
  moisture: string | null;
  pests: string | null;
  health: string | null;
};

export async function addObservation(bedName: string, observation: any): Promise<void | string> {
  const bed = await getGardenBedByName(bedName);
  if(typeof bed === 'string') return bed;

  const sql = getDbClient();
  const id = uuidv4();
  await sql`INSERT INTO observations (id, bed_id, note, moisture, pests, health, timestamp)
     VALUES (${id}, ${bed.id}, ${observation.note}, ${observation.moisture}, ${observation.pests}, ${observation.health}, ${observation.observationDate})`;
}

export async function getObservationsByBedName(bedName: string): Promise<Observation[] | string> {
  const bed = await getGardenBedByName(bedName);
  if(typeof bed === 'string') return bed;

  const sql = getDbClient();
  const result = await sql`SELECT * FROM observations WHERE bed_id = ${bed.id} ORDER BY timestamp DESC`;
  return result as Observation[];
}

export async function getAllObservationsWithBedName(): Promise<Observation[]> {
  const sql = getDbClient();
  const result = await sql`SELECT o.*, b.name AS bed_name
     FROM observations o
     JOIN garden_beds b ON o.bed_id = b.id
     ORDER BY o.timestamp DESC`;
  return result as Observation[];
}
