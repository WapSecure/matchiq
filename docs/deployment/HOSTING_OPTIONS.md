# Temporary public hosting (non-Azure)

**Status: research only. Nothing has been provisioned or paid for. Every provisioning step below REQUIRES OWNER APPROVAL.**

## Requirements

Judges must be able to reach the demo anonymously from submission (2026-10-27) through **2026-11-20**, which is about 5 weeks (1.17 months). The demo must never be asleep when a judge opens it.

The workload is web (Next.js standalone), api (NestJS with HTTP and SSE), worker (NestJS, background), agents (FastAPI), Postgres 17 and Redis 8. Traffic is low, a handful of judges. Azure remains the target architecture (`infra/azure`). This page covers the interim options while there is no subscription.

## How the numbers were collected

Prices were collected on **2026-10-21** from official pricing and docs pages, and the source is linked in each row.

- **[excerpt]** means the official page would not render. The figure comes from the vendor-domain search excerpt and must be re-checked before purchase.
- **[estimate]** means the figure is our own arithmetic, not a published price.

## Changes since earlier assumptions

These were all checked on 2026-10-21:

- **GitHub Models was retired on 2026-07-30** and now returns HTTP 410, so it is not an option for a free hosted LLM ([changelog](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)).
- **Oracle Always Free is now 2 OCPU / 12 GB on Ampere**, not 4 / 24 ([Oracle docs](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)).
- **Hetzner CX/CAX plans show as "currently unavailable"** on the official cost-optimized page ([Hetzner](https://www.hetzner.com/cloud/cost-optimized/)). Live stock is unverified.
- **Fly.io has no free allowance for new organisations.** The trial is 2 machine-hours or 7 days ([Fly pricing](https://docs.fly.io/about/pricing)).

## Comparison

| Option                                                                                                                                                                                                                                                                                   | Where each service runs                                                                                                            | Sleep / cold start                                                                                                                                                                                                | SSE / WebSocket                                                                                                                                  | Persistent Postgres / Redis                                     | Setup                                               | **~5-week cost**                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Single VPS + docker compose + Caddy**: DigitalOcean 4 GB / 2 vCPU $24/mo ([DO](https://www.digitalocean.com/pricing/droplets)); Hetzner CX23 2 vCPU / 4 GB €5.99/mo (if orderable) or CPX22 €19.99/mo ([Hetzner](https://www.hetzner.com/cloud/regular-performance/))                  | Everything on one host, using the exact `--profile app` stack verified locally, plus `infra/vps/compose.vps.yml` (Caddy, auto-TLS) | **Never sleeps**                                                                                                                                                                                                  | Yes. Caddy streams with `flush_interval -1`                                                                                                      | Yes, on local volumes. Backups are ours to run (`pg_dump` cron) | Medium: SSH, DNS, firewall, updates                 | **≈ $28 (DO)**; ≈ €7 (CX23) or ≈ €23 (CPX22)                                                                                                           |
| **Railway** Hobby: $5/mo including $5 usage; ≈ $20 per vCPU-month, ≈ $10 per GB-month ([pricing](https://railway.com/pricing))                                                                                                                                                           | Every service as its own service built from our Dockerfiles; Postgres and Redis from templates (template pages not checked)        | Off by default. The opt-in "Serverless" mode sleeps after 5 min, and the first request may 502 ([docs](https://docs.railway.com/reference/app-sleeping)). Leave it off                                            | Expected to work; not verified on a docs page                                                                                                    | Yes, on volumes at ≈ $0.15/GB-month                             | Very easy                                           | **≈ $12–18 [estimate]**, usage-based, so actual spend may differ                                                                                       |
| **Fly.io**: shared-cpu-1x 256 MB $2.19, 512 MB $3.69, 1 GB $6.70 per month; volumes $0.15/GB; dedicated IPv4 $2; Managed Postgres from $38 ([pricing](https://docs.fly.io/about/pricing))                                                                                                | 4 app Machines plus self-run Postgres and Redis on volumes                                                                         | Apps scale to zero by default. Set `auto_stop_machines = "off"` or `min_machines_running = 1` ([docs](https://docs.fly.io/launch/autostop-autostart/))                                                            | Yes, through the Fly proxy (not verified on a page)                                                                                              | Self-run on volumes, or Managed Postgres at $38+                | Medium: a `fly.toml` per app and private networking | **≈ $30 [estimate]**; ≈ $65–70 with Managed Postgres                                                                                                   |
| **Render**: 0.5 CPU / 512 MB service or worker $7/mo; Postgres 256 MB $6, 1 GB $19; Key Value 256 MB $10 ([pricing](https://render.com/pricing.md))                                                                                                                                      | web and api as web services, worker as a background worker, agents as a private service, plus managed Postgres and Key Value       | Paid plans don't sleep. **The free plan spins down after 15 min idle** (≈ 1 min to wake), and free Postgres expires after 30 days ([free tier](https://render.com/docs/free)), so the free plan doesn't work here | Expected on paid plans; not verified on a page                                                                                                   | Yes, managed                                                    | Easiest                                             | **≈ $51 [estimate]** (4 × $7 + $6 + $10 per month; proration unverified)                                                                               |
| **Google Cloud Run** + Cloud SQL / Neon + Memorystore / Upstash: free tier of 180k vCPU-s, 360k GiB-s and 2M requests per month **[excerpt]** ([pricing](https://cloud.google.com/run/pricing)); Cloud SQL db-f1-micro ≈ $7.70/mo **[excerpt]**; Memorystore 1 GB ≈ $36/mo **[excerpt]** | web, api and agents as services; the worker needs always-on CPU                                                                    | Scales to zero unless min-instances is set, and a warm instance is billed. Neon free scales to zero after 5 min **[excerpt]** ([Neon](https://neon.com/docs/introduction/plans))                                  | SSE and WebSocket supported. Requests time out after at most 60 min ([docs](https://docs.cloud.google.com/run/docs/configuring/request-timeout)) | Managed, priced separately                                      | Hardest                                             | **≈ $60–180 [estimate]**                                                                                                                               |
| **Vercel** Hobby (web only) + another host for the backends ([Hobby](https://vercel.com/docs/plans/hobby))                                                                                                                                                                               | web on Vercel; api, worker, agents and data on Railway, Fly or a VPS                                                               | Functions are serverless                                                                                                                                                                                          | Function duration max 300 s, so the browser must call the API host directly for SSE                                                              | Via the other host                                              | Medium, with two providers and CORS                 | $0 for Vercel + the backend host's cost. **Hobby is "non-commercial, personal use only"**, and whether a hackathon entry qualifies is a judgement call |
| **Oracle Cloud Always Free** ([docs](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm))                                                                                                                                                      | Everything on one Ampere VM (2 OCPU / 12 GB); needs arm64 images                                                                   | Doesn't sleep, but **idle instances may be reclaimed** when 95th-percentile CPU, network and memory stay under 20% for 7 days. A low-traffic demo looks idle                                                      | Yes, through Caddy                                                                                                                               | Yes, local                                                      | Medium. "Out of host capacity" errors are common    | $0, but **reclamation risk makes it unsuitable as the primary**                                                                                        |

### Free data add-ons

All checked on 2026-10-21:

- **Upstash Redis free:** 500k commands/month and 256 MB **[excerpt]** ([pricing](https://upstash.com/docs/redis/overall/pricing)). A polling worker can use up 500k commands in days.
- **Supabase free:** projects are **paused after 1 week of inactivity** ([pricing](https://supabase.com/pricing)).
- **Neon free:** scale-to-zero can't be turned off **[excerpt]**.

None of these is safe for a judged demo.

## LLM on a cheap host

Every option above is **CPU-only**. A 1–4B model on 2–4 vCPUs takes several seconds per response and needs 8 GB+ RAM headroom. That doesn't fit a 4 GB host next to the stack.

For the public demo:

- **Recommended:** run the agents service with deterministic templates (`MODEL_PROVIDER=mock`, labelled as such in the UI per ADR-0003 and ADR-0012). The engine, replay, overlays and publish gate don't depend on a model (ADR-0002).
- **Optional:** use a small Ollama model on an 8 GB+ VPS (for example DigitalOcean 8 GB at $48/mo, [DO](https://www.digitalocean.com/pricing/droplets)) once the agents `ollama` provider lands. Present it as local inference, not Foundry.
- **Not allowed without explicit approval:** any paid hosted model API. There is no free hosted option we could verify (GitHub Models is retired).

## Recommendation

**Primary (REQUIRES OWNER APPROVAL): a single VPS running the verified compose `app` profile behind Caddy.**

Reasons:

- It has exact parity with the stack verified locally on 2026-10-21. The images, compose file and health checks are identical.
- It never sleeps.
- SSE works.
- The cost is fixed and predictable: about $28 for 5 weeks on DigitalOcean 4 GB / 2 vCPU, or about €7 on Hetzner CX23 if that plan can be ordered.
- Teardown is a single "destroy droplet" action.

**Fallback (REQUIRES OWNER APPROVAL): Railway Hobby.**

Each service is deployed from its Dockerfile, with Postgres and Redis templates and Serverless mode left off. It costs about $12–18 for 5 weeks (our estimate, usage-based). Use it if VPS operations are unwanted or the VPS fails.

Revisit Azure Container Apps (`infra/azure`) as soon as a subscription or hackathon credits exist. That costs about $99–150 for 5 weeks at list price; see `infra/azure/README.md`.

### Provisioning steps: VPS (REQUIRES OWNER APPROVAL; nothing below has been run)

1. **Create the server.** Create an Ubuntu 24.04 LTS server: DigitalOcean Basic 4 GB / 2 vCPU, or Hetzner CX23 or CPX22, in a region near the judges. Add your SSH key and disable password login.
2. **Open the firewall.** Allow only 22/tcp (restricted to your IP), 80/tcp, 443/tcp and 443/udp.
3. **Install Docker.** Install Docker Engine and the Compose plugin from Docker's apt repository. Add a non-root deploy user to the `docker` group.
4. **Point DNS at the server.** Create an A record such as `demo.<your-domain>` for the server IP. Without a domain, `<ip-with-dashes>.sslip.io` can work. Caddy's ability to get a certificate for a shared sslip.io name under Let's Encrypt rate limits is **unverified**.
5. **Clone the repository and create the secrets.**

   ```bash
   git clone https://github.com/WapSecure/matchiq.git && cd matchiq && git checkout <release-sha>
   cat > .env <<EOF
   POSTGRES_PASSWORD=$(openssl rand -hex 24)
   OPERATOR_API_KEY=$(openssl rand -hex 32)
   AGENTS_SERVICE_TOKEN=$(openssl rand -hex 32)
   EOF
   chmod 600 .env
   ```

6. **Build and start the stack.**

   ```bash
   export MATCHIQ_DOMAIN=demo.<your-domain>
   docker compose -f docker-compose.yml -f infra/vps/compose.vps.yml --profile app up -d --build --wait
   ```

   On a 4 GB host the first build takes several minutes. You can build elsewhere and load the images with `docker save | ssh … docker load` instead.

7. **Verify the deployment.**

   ```bash
   curl -fsS https://$MATCHIQ_DOMAIN/api/v1/health/live
   curl -fsS -o /dev/null https://$MATCHIQ_DOMAIN/
   ```

   Then open the site in a private window.

8. **Set up monitoring and backups.**
   - Uptime: add a free external check on `/api/v1/health/live`.
   - Backups: add a daily cron for `docker compose exec -T postgres pg_dump -U matchiq matchiq | gzip > ~/backup-$(date +%F).sql.gz`.
9. **Tear down after 2026-11-20.** Destroy the server and delete the DNS record.

### Provisioning steps: Railway fallback (REQUIRES OWNER APPROVAL)

1. **Create the project.** Sign up, choose Hobby ($5/mo) and create a project linked to the repository. Do **not** enable Serverless.
2. **Add the data services.** Add Postgres and Redis from the template catalog.
3. **Add the four app services.** Add api, worker and web with Dockerfile paths `apps/api/Dockerfile`, `apps/worker/Dockerfile` and `apps/web/Dockerfile`, all with root context. Add agents with root directory `apps/agents`.
4. **Set the variables for each service.** Match the `environment:` blocks in `docker-compose.yml`:
   - `DATABASE_URL` and `REDIS_URL` come from the template references.
   - `AGENTS_SERVICE_URL` is the agents private domain.
   - Set the web build variable `NEXT_PUBLIC_API_BASE_URL=https://<api-domain>/api/v1`.
   - Set the api's `CORS_ALLOWED_ORIGINS` to the web domain.
5. **Run the migrations.** Run them once with a one-off command on the api service: `node workspace_modules/@matchiq/db/dist/cli/migrate.js`.
6. **Expose and secure the apps.** Generate public domains for web and api only. Set a spending limit in the workspace usage settings.
