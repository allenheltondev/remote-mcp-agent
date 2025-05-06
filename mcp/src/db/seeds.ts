import { getDbClient } from './client.js';

export type Seed = {
  id?: string;
  name: string;
  variety?: string | null;
  species?: string | null;
  source?: string | null;
  purchase_date?: string | null;
  quantity?: number | null;

  days_to_germinate?: number | null;
  days_to_maturity?: number | null;
  planting_depth_inches?: number | null;
  spacing_inches?: number | null;
  sun_requirements?: string | null;
  hardiness_zone_range?: string | null;

  notes?: string | null;
  tags?: string[] | null;

  preferred_soil_ph?: string | null;
  fertilization_needs?: string | null;
  companion_plants?: string[] | null;
  avoid_near?: string[] | null;

  created_at?: string;
  updated_at?: string;
};

export async function addSeeds(seeds: Seed[]): Promise<void> {
  const sql = getDbClient();
  const queries = seeds.map((s) =>
    sql`
      INSERT INTO seeds (
        name, variety, species, source, purchase_date, quantity,
        days_to_germinate, days_to_maturity, planting_depth_inches, spacing_inches,
        sun_requirements, hardiness_zone_range, notes, tags,
        preferred_soil_ph, fertilization_needs, companion_plants, avoid_near
      ) VALUES (
        ${s.name}, ${s.variety}, ${s.species}, ${s.source}, ${s.purchase_date}, ${s.quantity},
        ${s.days_to_germinate}, ${s.days_to_maturity}, ${s.planting_depth_inches}, ${s.spacing_inches},
        ${s.sun_requirements}, ${s.hardiness_zone_range}, ${s.notes}, ${s.tags},
        ${s.preferred_soil_ph}, ${s.fertilization_needs}, ${s.companion_plants}, ${s.avoid_near}
      )
    `
  );
  await Promise.all(queries);
}

export async function removeSeeds(seedNames: string[]): Promise<void> {
  const sql = getDbClient();
  await sql`DELETE FROM seeds WHERE name = ANY(${seedNames})`;
}

export async function listSeeds(includeEmpty: boolean): Promise<Seed[]> {
  const sql = getDbClient();
  const result = await sql`
    SELECT name, variety, species, quantity FROM seeds
    ${!includeEmpty ? sql`WHERE quantity > 0` : sql``}
  `;
  return result as Seed[];
}

export async function getSeedDetail(seedName: string): Promise<Seed> {
  const sql = getDbClient();
  const result = await sql`SELECT * FROM seeds WHERE name = ${seedName}` as Seed[];
  return result[0] as Seed;
}

export async function useSeeds(seedName: string, amount: number): Promise<number> {
  const sql = getDbClient();
  const result = await sql`
    UPDATE seeds
    SET quantity = quantity - ${amount}
    WHERE name = ${seedName} AND quantity >= ${amount}
    RETURNING quantity
  ` as { quantity: number}[];

  return result[0]?.quantity ?? 0;
}
