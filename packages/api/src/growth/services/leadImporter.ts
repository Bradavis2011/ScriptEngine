/**
 * Lead importer — parses CSV exports from Vibe Prospecting (or other sources)
 * into the generic Lead model.
 *
 * Vibe CSV columns (flexible — uses header names):
 *   email, first_name / firstName, last_name / lastName, company
 *
 * Deduplicates on [source, sourceId] so re-importing is safe.
 */

import { prisma } from '../../lib/prisma';

export interface ImportedLead {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  sourceId: string;
}

/**
 * Parse a raw CSV string into an array of ImportedLead objects.
 * Very lightweight — handles standard comma-delimited with a header row.
 */
export function parseCsv(raw: string): ImportedLead[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header row
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, '_'));

  const col = (row: string[], name: string): string | undefined => {
    const aliases: Record<string, string[]> = {
      email: ['email'],
      firstName: ['first_name', 'firstname'],
      lastName: ['last_name', 'lastname'],
      company: ['company', 'organization', 'business'],
    };
    const names = aliases[name] ?? [name];
    for (const n of names) {
      const idx = header.indexOf(n);
      if (idx >= 0) return row[idx]?.trim();
    }
    return undefined;
  };

  const leads: ImportedLead[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const email = col(row, 'email');
    if (!email || !email.includes('@')) continue;

    leads.push({
      email,
      firstName: col(row, 'firstName'),
      lastName: col(row, 'lastName'),
      company: col(row, 'company'),
      sourceId: `row_${i}_${email}`,
    });
  }

  return leads;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: number;
}

/**
 * Import leads from a parsed list into the Lead table.
 * Uses upsert on [source, sourceId] to avoid duplicates.
 */
export async function importLeads(
  leads: ImportedLead[],
  source: string,
): Promise<ImportResult> {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const lead of leads) {
    // Check unsubscribe list first
    const unsub = await prisma.unsubscribeList.findUnique({
      where: { email: lead.email },
    });
    if (unsub) {
      skipped++;
      continue;
    }

    // Check if lead already exists (reliable, no timing heuristic)
    const existing = await prisma.lead.findUnique({
      where: { source_sourceId: { source, sourceId: lead.sourceId } },
      select: { id: true },
    });

    try {
      if (existing) {
        await prisma.lead.update({
          where: { source_sourceId: { source, sourceId: lead.sourceId } },
          data: {
            firstName: lead.firstName,
            lastName: lead.lastName,
            company: lead.company,
          },
        });
        skipped++; // already existed
      } else {
        await prisma.lead.create({
          data: {
            email: lead.email,
            firstName: lead.firstName,
            lastName: lead.lastName,
            company: lead.company,
            source,
            sourceId: lead.sourceId,
            status: 'new',
          },
        });
        created++;
      }
    } catch (err) {
      console.error(`[leadImporter] Failed to import ${lead.email}:`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  return { created, skipped, errors };
}

/**
 * Full pipeline: parse CSV and import.
 */
export async function importFromCsv(
  csvContent: string,
  source: string = 'vibe',
): Promise<ImportResult> {
  const leads = parseCsv(csvContent);
  console.log(`[leadImporter] Parsed ${leads.length} leads from CSV (source: ${source})`);
  return importLeads(leads, source);
}
