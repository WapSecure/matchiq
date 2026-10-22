# Security policy

MatchIQ is a hackathon project that runs on synthetic data only. We still want to hear about any vulnerability.

## Reporting a vulnerability

- Report it privately through GitHub's **Report a vulnerability** button on the repository's Security tab (private vulnerability reporting). Do not open a public issue, pull request or discussion.
- If that button is not shown, open an issue titled "Security contact request" with no details, and a maintainer will give you a private channel.
- Include the affected component (web, api, worker, agents, infra or CI), the commit or URL, steps to reproduce, and the impact you expect.
- Never include real personal data, credentials or licensed match data in a report.

## What to expect

| Step                         | Target                        |
| ---------------------------- | ----------------------------- |
| Acknowledgement              | 3 working days                |
| Triage and severity decision | 7 days                        |
| Fix or mitigation            | 30 days for high and critical |

We credit reporters in the advisory unless they ask us not to.

## Scope

In scope: this repository's code, its CI workflows and its container images, plus any MatchIQ demo deployment linked from the README.

Out of scope: denial of service by volume, social engineering, findings in third-party services (identity providers, model providers, GitHub), and reports from automated scanners that have no demonstrated impact.

## Safe harbour

We will not pursue good-faith research that respects this policy, avoids privacy violations and service disruption, and gives us reasonable time to fix the issue before disclosure.

## Supported versions

Only the latest `main` (production) and `dev` branches receive fixes.

See [`docs/security/THREAT_MODEL.md`](docs/security/THREAT_MODEL.md) and [`docs/engineering/SECURITY_STANDARDS.md`](docs/engineering/SECURITY_STANDARDS.md).
