import type { Fixture, Team } from '@matchiq/contracts';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import type { Database } from '../client.js';
import type {
  FixtureTemplate,
  FixtureTemplateSummary,
  TeamSummary,
  TemplateInput,
  TemplateStore,
  TemplateUpsertOutcome,
} from '../intelligence-types.js';
import { fixtureTemplates } from '../schema/intelligence-tables.js';

const t = fixtureTemplates;

const teamSummary = (team: Team): TeamSummary => ({
  teamId: team.teamId,
  name: team.name,
  shortName: team.shortName,
  colors: team.colors,
});

type SummaryRow = Pick<
  typeof t.$inferSelect,
  | 'templateId'
  | 'title'
  | 'scenario'
  | 'seed'
  | 'eventCount'
  | 'eventsHash'
  | 'finalScore'
  | 'fixture'
>;

const toSummary = (row: SummaryRow): FixtureTemplateSummary => ({
  templateId: row.templateId,
  title: row.title,
  competitionLabel: row.fixture.competitionLabel,
  scenario: row.scenario,
  seed: row.seed,
  eventCount: row.eventCount,
  eventsHash: row.eventsHash,
  finalScore: row.finalScore,
  home: teamSummary(row.fixture.home),
  away: teamSummary(row.fixture.away),
});

const summaryColumns = {
  templateId: t.templateId,
  title: t.title,
  scenario: t.scenario,
  seed: t.seed,
  eventCount: t.eventCount,
  eventsHash: t.eventsHash,
  finalScore: t.finalScore,
  fixture: t.fixture,
};

const changesOf = (input: TemplateInput) => {
  const fixture: Fixture = input.fixture;
  return {
    title: fixture.title,
    scenario: fixture.provenance.scenario,
    seed: fixture.provenance.seed,
    fixture,
    events: [...input.events],
    eventCount: input.events.length,
    eventsHash: input.eventsHash,
    finalScore: input.finalScore,
  };
};

export class PostgresTemplateStore implements TemplateStore {
  constructor(private readonly db: Database) {}

  /** Idempotent: an unchanged events hash leaves the row untouched. */
  async upsert(
    orgId: string,
    input: TemplateInput,
  ): Promise<TemplateUpsertOutcome> {
    const templateId = input.fixture.fixtureId;
    const changes = changesOf(input);
    const existing = await this.db
      .select({ hash: t.eventsHash })
      .from(t)
      .where(and(eq(t.orgId, orgId), eq(t.templateId, templateId)));
    const rows = await this.db
      .insert(t)
      .values({ orgId, templateId, ...changes })
      .onConflictDoUpdate({
        target: [t.orgId, t.templateId],
        set: { ...changes, updatedAt: sql`now()` },
        setWhere: ne(t.eventsHash, changes.eventsHash),
      })
      .returning({ templateId: t.templateId });
    if (rows.length === 0) return 'unchanged';
    return existing.length === 0 ? 'inserted' : 'updated';
  }

  async get(
    orgId: string,
    templateId: string,
  ): Promise<FixtureTemplate | null> {
    const [row] = await this.db
      .select({ ...summaryColumns, events: t.events })
      .from(t)
      .where(and(eq(t.orgId, orgId), eq(t.templateId, templateId)));
    if (!row) return null;
    return { ...toSummary(row), fixture: row.fixture, events: row.events };
  }

  async list(orgId: string): Promise<FixtureTemplateSummary[]> {
    const rows = await this.db
      .select(summaryColumns)
      .from(t)
      .where(eq(t.orgId, orgId))
      .orderBy(asc(t.templateId));
    return rows.map(toSummary);
  }
}
