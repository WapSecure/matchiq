import { sql } from 'drizzle-orm';
import type { Database, Transaction } from '../client.js';
import { TENANCY } from '../constants.js';

export class CrossTenantError extends Error {
  constructor(pinned: string, requested: string) {
    super(`transaction pinned to ${pinned} cannot touch ${requested}`);
    this.name = 'CrossTenantError';
  }
}

/**
 * Makes the rest of the transaction run as the non-owner `matchiq_app` role
 * with `app.org_id` set, so row-level security applies (ADR-0018). Both
 * settings are transaction-local and vanish at commit or rollback.
 */
export const enterTenant = async (
  tx: Transaction,
  orgId: string,
): Promise<void> => {
  await tx.execute(
    sql`select set_config(${TENANCY.orgSetting}, ${orgId}, true), set_config(${TENANCY.roleSetting}, ${TENANCY.appRole}, true)`,
  );
};

/** One transaction under RLS for one organisation. */
export const withTenant = <T>(
  db: Database,
  orgId: string,
  work: (tx: Transaction) => Promise<T>,
): Promise<T> =>
  db.transaction(async (tx) => {
    await enterTenant(tx, orgId);
    return work(tx);
  });

/**
 * Pins a transaction to the first organisation it touches and refuses any
 * other, so a unit of work can never mix tenants.
 */
export class TenantPin {
  private orgId: string | null = null;
  private entered: Promise<void> = Promise.resolve();

  constructor(private readonly tx: Transaction) {}

  get pinned(): string | null {
    return this.orgId;
  }

  to(orgId: string): Promise<void> {
    if (this.orgId === null) {
      this.orgId = orgId;
      this.entered = enterTenant(this.tx, orgId);
    } else if (this.orgId !== orgId) {
      return Promise.reject(new CrossTenantError(this.orgId, orgId));
    }
    return this.entered;
  }
}
