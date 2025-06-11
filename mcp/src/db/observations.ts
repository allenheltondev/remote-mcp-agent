import { getDbClient } from '../../shared/db_client.js';
import { v4 as uuidv4 } from 'uuid';

type Observation = {
  id: string; // UUID
  bed_id: string; // UUID (FK to garden_beds)
  timestamp: string; // ISO timestamp string
  note: string | null;
  moisture: string | null;
  pests: string | null;
  health: string | null;
};

export async function addObservation(bedId: string, observation: any): Promise<Observation> {
  const sql = getDbClient();
  const id = uuidv4();
  await sql`INSERT INTO observations (id, bed_id, note, moisture, pests, health, timestamp)
     VALUES (${id}, ${bedId}, ${observation.note}, ${observation.moisture}, ${observation.pests}, ${observation.health}, ${observation.observationDate})`;
  return { id, bedId, ...observation };
}

export async function getObservationsByBedId(bedId: string): Promise<Observation[]> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM observations WHERE bed_id = ${bedId} ORDER BY timestamp DESC`;
  return result as Observation[];
}

export async function getAllObservations(): Promise<Observation[]> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM observations ORDER BY timestamp DESC`;
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
