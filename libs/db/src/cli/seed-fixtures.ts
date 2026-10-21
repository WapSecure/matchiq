import { CommonEnv, DatabaseEnv, loadEnv } from '@matchiq/config';
import { createDatabase } from '../lib/client.js';
import { PostgresTemplateStore } from '../lib/postgres/template-store.js';
import {
  findFixturesFolder,
  seedTemplates,
} from '../lib/seed/seed-templates.js';

const main = async (): Promise<void> => {
  const env = loadEnv(CommonEnv.extend(DatabaseEnv.shape));
  const handle = createDatabase({ url: env.DATABASE_URL, poolMax: 1 });
  try {
    const folder = process.argv[2] ?? findFixturesFolder();
    const results = await seedTemplates(
      new PostgresTemplateStore(handle.db),
      env.DEMO_ORG_ID,
      folder,
    );
    for (const r of results) {
      console.warn(
        `${r.outcome} ${r.templateId} (${r.eventCount} events) from ${r.file}`,
      );
    }
  } finally {
    await handle.close();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
