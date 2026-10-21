# MatchIQ on Azure (Bicep)

> **Status: authored, not deployed.** This template passes `az bicep build` and `az bicep lint`. No Azure subscription exists yet, so nothing here has been through `what-if` or an actual deployment. Provisioning needs the owner's approval (see `docs/engineering/SECURITY_STANDARDS.md` § Cloud).

This is the reference deployment from spec §14, §30 and §49. Every resource goes into one resource group per environment.

## What it creates

| Module                      | Resource (API version)                                                                                                                                                                                                | Notes                                                                                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/identity.bicep`    | `Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30`                                                                                                                                                         | One identity for all apps. It is the only principal that receives role assignments.                                                                                                                                   |
| `modules/keyvault.bicep`    | `Microsoft.KeyVault/vaults@2026-02-01`, `vaults/secrets`, role assignment **Key Vault Secrets User** (`4633458b-…`)                                                                                                   | RBAC mode with 7-day soft delete. Purge protection is on in prod only. Holds `operator-api-key`, `agents-service-token`, `database-url`, `redis-url` and `appinsights-connection-string`.                             |
| `modules/monitoring.bicep`  | `Microsoft.OperationalInsights/workspaces@2025-07-01`, `Microsoft.Insights/components@2020-02-02`                                                                                                                     | PerGB2018 tier, 30-day retention, 1 GB/day ingestion cap. App Insights is workspace-based.                                                                                                                            |
| `modules/registry.bicep`    | `Microsoft.ContainerRegistry/registries@2025-11-01` (Basic), role assignment **AcrPull** (`7f951dda-…`)                                                                                                               | Admin user and anonymous pull are disabled. Images are pulled with the managed identity.                                                                                                                              |
| `modules/postgres.bicep`    | `Microsoft.DBforPostgreSQL/flexibleServers@2025-08-01` (PostgreSQL 17, Burstable B1ms, 32 GB), `databases`, `firewallRules`                                                                                           | Password auth backs `DATABASE_URL`. Entra auth is also enabled, ready for a later managed-identity migration. The `0.0.0.0` firewall rule admits Azure services only.                                                 |
| `modules/redis.bicep`       | `Microsoft.Cache/redisEnterprise@2025-07-01` (Azure Managed Redis, Balanced_B0), `databases`                                                                                                                          | Azure Managed Redis replaces Azure Cache for Redis for new deployments ([overview](https://learn.microsoft.com/azure/redis/overview)). Settings: TLS on port 10000, `NoCluster`, `NoEviction`. HA is on in prod only. |
| `modules/foundry.bicep`     | `Microsoft.CognitiveServices/accounts@2026-07-01` (kind `AIServices`, `allowProjectManagement`), `accounts/projects`, `accounts/deployments`, role assignment **Foundry User** (formerly Azure AI User, `53ca6127-…`) | `disableLocalAuth: true`, so there are no API keys. Model name, version, SKU, capacity and region are all parameters. Created only when `deployFoundry` is true and `modelProvider` is `foundry`.                     |
| `modules/environment.bicep` | `Microsoft.App/managedEnvironments@2026-01-01`                                                                                                                                                                        | Consumption-only with no VNet, which is the lowest-cost option. Logs go to Log Analytics.                                                                                                                             |
| `modules/apps.bicep`        | 4 × `Microsoft.App/containerApps@2026-01-01`, 1 × `Microsoft.App/jobs@2026-01-01`                                                                                                                                     | Ingress: **web** and **api** are external; **worker** and **agents** are internal only. `migrate` is a manually triggered job. Secrets are Key Vault references resolved by the managed identity.                     |
| `modules/budget.bicep`      | `Microsoft.Consumption/budgets@2026-06-01`                                                                                                                                                                            | Monthly budget with alerts at 50% and 80% of actual spend and 100% of forecast. Skipped when no contact email is supplied.                                                                                            |

API versions are the newest stable (non-preview) versions listed on Microsoft Learn's template reference on 2026-10-21, **excluding versions less than about 60 days old**, which is why PostgreSQL uses `2025-08-01` rather than `2026-10-01`.

The role definition IDs come from the [Azure built-in roles](https://learn.microsoft.com/azure/role-based-access-control/built-in-roles) pages, checked 2026-10-21.

### Least privilege

| Principal                      | Role                                                                                                  | Scope                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------ |
| apps managed identity          | AcrPull                                                                                               | the registry only        |
| apps managed identity          | Key Vault Secrets User                                                                                | the vault only           |
| apps managed identity          | Foundry User                                                                                          | the Foundry account only |
| deploy workflow (OIDC app reg) | Contributor + Role Based Access Control Administrator (condition-restricted to the three roles above) | the resource group only  |

Nothing is granted at subscription scope except the budget, which is a resource-group-scoped resource. Model calls use Entra ID (`ManagedIdentityCredential` with `AZURE_CLIENT_ID`), matching ADR-0003.

### Runtime wiring

| App    | Ingress        | Key env (plain)                                                                                         | Secrets (Key Vault refs)                                          |
| ------ | -------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| web    | external :4200 | `PORT`. `NEXT_PUBLIC_API_BASE_URL` is a **build arg** set by the workflow from the `apiBaseUrl` output. | none                                                              |
| api    | external :3000 | `API_PUBLIC_URL`, `CORS_ALLOWED_ORIGINS` (the web origin)                                               | `DATABASE_URL`, `REDIS_URL`, `OPERATOR_API_KEY`, App Insights     |
| worker | internal :3001 | `AGENTS_SERVICE_URL=https://<agents>.internal.<domain>`, `AI_ENABLED`                                   | `DATABASE_URL`, `REDIS_URL`, `AGENTS_SERVICE_TOKEN`, App Insights |
| agents | internal :8000 | `MODEL_PROVIDER`, `FOUNDRY_PROJECT_ENDPOINT`, `FOUNDRY_MODEL`, `AZURE_CLIENT_ID`                        | `AGENTS_SERVICE_TOKEN`                                            |

- **Replicas:** web, api and agents keep `minReplicas` (1 in stage and prod, 0 in dev) so judges never hit a cold start. The worker is pinned to exactly 1 replica.
- **SSE:** Container Apps ingress closes idle HTTP connections. The API's `SSE_HEARTBEAT_MS` (15 s by default) keeps streams alive, so it must stay well below the ingress idle timeout. Verify this on first deployment.

## Parameters and secrets

`env/<dev|stage|prod>.bicepparam` read everything sensitive or account-specific from environment variables through `readEnvironmentVariable()`. **No real values are committed.**

| Variable                                               | Required                              | Purpose                                                |
| ------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------ |
| `POSTGRES_ADMIN_PASSWORD`                              | yes                                   | Flexible Server admin password (16 or more characters) |
| `OPERATOR_API_KEY`, `AGENTS_SERVICE_TOKEN`             | yes                                   | 32 or more characters (`openssl rand -hex 32`)         |
| `AZURE_LOCATION`                                       | no (`swedencentral`)                  | Region                                                 |
| `IMAGE_TAG`, `DEPLOY_APPS`, `APP_VERSION`              | set by the workflow                   | Image tag; platform-only first pass                    |
| `FOUNDRY_MODEL_NAME`, `FOUNDRY_MODEL_VERSION`          | prod (stage if `DEPLOY_FOUNDRY=true`) | Pick from the Foundry model catalog for the region     |
| `FOUNDRY_LOCATION`, `MODEL_PROVIDER`, `DEPLOY_FOUNDRY` | no                                    | Stage overrides                                        |
| `BUDGET_CONTACT_EMAILS`, `BUDGET_START_DATE`           | no (budget skipped without emails)    | Comma-separated recipients; first of a month           |

Prod forces `modelProvider = 'foundry'`, because the agents service refuses `MODEL_PROVIDER=mock` when `APP_ENV=prod`.

## Validate locally (no Azure account needed)

```bash
az bicep build --file infra/azure/main.bicep --stdout > /dev/null
az bicep lint  --file infra/azure/main.bicep
POSTGRES_ADMIN_PASSWORD=x OPERATOR_API_KEY=x AGENTS_SERVICE_TOKEN=x FOUNDRY_MODEL_NAME=x FOUNDRY_MODEL_VERSION=x \
  az bicep build-params --file infra/azure/env/prod.bicepparam --stdout > /dev/null
```

CI runs the same checks in the `infra` job of `.github/workflows/ci.yml`.

## Preview and deploy (REQUIRES OWNER APPROVAL; not run)

```bash
az login
az group create --name rg-matchiq-dev --location swedencentral
export POSTGRES_ADMIN_PASSWORD=… OPERATOR_API_KEY=… AGENTS_SERVICE_TOKEN=… BUDGET_CONTACT_EMAILS=…

# what-if: shows the changes and creates nothing
az deployment group what-if --resource-group rg-matchiq-dev --parameters infra/azure/env/dev.bicepparam

# first pass: platform only, so the registry exists before images are pushed
DEPLOY_APPS=false az deployment group create --resource-group rg-matchiq-dev --parameters infra/azure/env/dev.bicepparam
```

After the first pass, push the four images tagged `$IMAGE_TAG` (see `.github/workflows/deploy-azure.yml`). Then run the full pass and start the migration job:

```bash
IMAGE_TAG=<sha> az deployment group create --resource-group rg-matchiq-dev --parameters infra/azure/env/dev.bicepparam
az containerapp job start --resource-group rg-matchiq-dev --name caj-matchiq-dev-migrate
```

`deploy-azure.yml` automates this. It runs only on `workflow_dispatch` and uses OIDC with no stored Azure secrets. Its `plan` job runs `what-if` in the `<env>-plan` environment. The `deploy` job runs in the `<env>` environment, which must have **required reviewers**. It deploys the platform, pushes the images, deploys the apps, runs migrations and smoke-tests the health endpoints.

GitHub setup the owner must do:

1. Create an app registration.
2. Add federated credentials for `repo:WapSecure/matchiq:environment:<env>-plan` and `repo:WapSecure/matchiq:environment:<env>`.
3. Assign the app registration roles on the resource group only.
4. Set environment variables: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `AZURE_LOCATION`, `BUDGET_CONTACT_EMAILS` and `FOUNDRY_MODEL_*`.
5. Set environment secrets: `POSTGRES_ADMIN_PASSWORD`, `OPERATOR_API_KEY` and `AGENTS_SERVICE_TOKEN`.

## Teardown

```bash
az group delete --name rg-matchiq-dev --yes --no-wait
# Key Vault and the Foundry account are soft-deleted; purge them to release the names and stop any residual billing:
az keyvault purge --name <kv-name> --location swedencentral
az cognitiveservices account purge --name <ais-name> --resource-group rg-matchiq-dev --location swedencentral
```

Prod enables purge protection, so a prod vault cannot be purged until its retention period ends.

## Estimated cost (list price, USD, Sweden Central)

The unit prices come from the official [Azure Retail Prices API](https://prices.azure.com/api/retail/prices) (`armRegionName eq 'swedencentral'`), accessed 2026-10-21. These are list prices with no credits or discounts. Usage volumes are assumptions.

| Item                                                                 | Unit price                                                                                                                                                                                                  | Monthly estimate                                                |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Container Apps: 4 apps × 0.5 vCPU / 1 GiB, 1 replica each, ~95% idle | vCPU $0.000024/s active, $0.000003/s idle; memory $0.000003/GiB-s; free grant of 180k vCPU-s, 360k GiB-s and 2M requests per month ([pricing](https://azure.microsoft.com/pricing/details/container-apps/)) | **$47–51** (about $90 more if the worker is never idle)         |
| PostgreSQL Flexible B1ms + 32 GB                                     | $0.0199/h compute; $0.1369/GB-month storage                                                                                                                                                                 | **$19**                                                         |
| Azure Managed Redis Balanced B0                                      | $0.017/h per node                                                                                                                                                                                           | **$12** without HA; about **$25** with HA (two nodes, inferred) |
| Container Registry Basic                                             | $0.1666/day                                                                                                                                                                                                 | **$5**                                                          |
| Key Vault Standard                                                   | $0.03 per 10k operations                                                                                                                                                                                    | **< $1**                                                        |
| Log Analytics / App Insights                                         | $2.99/GB after 5 GB free                                                                                                                                                                                    | **$0–15**                                                       |
| Foundry model (for example gpt-5-mini, Global Standard)              | $0.25 per 1M input tokens, $2.00 per 1M output tokens; no idle cost                                                                                                                                         | **$2–15**                                                       |
| Budget alerts                                                        | free ([pricing](https://azure.microsoft.com/pricing/details/cost-management/))                                                                                                                              | $0                                                              |
| **Total**                                                            |                                                                                                                                                                                                             | **about $86–131 per month; about $99–150 for 5 weeks**          |

Unverified:

- Whether the free tier of PostgreSQL backup storage equals 100% of provisioned storage.
- The price of the Managed Redis HA meter.
- Whether the 5 GB Log Analytics allowance applies per workspace or per billing account.

The dev profile uses `minReplicas = 0`, which cuts the Container Apps line to near zero when nothing is running.
