# ADR-0010: Public demo access and operator protection

- Status: Accepted (2026-10-21)

## Decision

Judges use the deployed demo anonymously, with read-only access to the synthetic demo organisation and rate-limited, idempotent replay controls. Operator and admin actions require a bearer key (`OPERATOR_API_KEY`, at least 32 characters, stored in Key Vault in Azure). Entra ID replaces the key after the hackathon. The worker → agents service token stays on internal ingress only.
