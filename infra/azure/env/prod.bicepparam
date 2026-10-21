// prod parameters. The agents service rejects MODEL_PROVIDER=mock when APP_ENV=prod, so Foundry is
// required here. No real values are committed: secrets, model and contacts come from the deploying
// shell or the deploy workflow environment (see infra/azure/README.md).
using '../main.bicep'

param environmentName = 'prod'
param location = readEnvironmentVariable('AZURE_LOCATION', 'swedencentral')
param imageTag = readEnvironmentVariable('IMAGE_TAG', 'bootstrap')
param deployApps = bool(readEnvironmentVariable('DEPLOY_APPS', 'true'))
param appVersion = readEnvironmentVariable('APP_VERSION', '0.0.0-dev')
param minReplicas = 1

param modelProvider = 'foundry'
param deployFoundry = true
param foundryLocation = readEnvironmentVariable('FOUNDRY_LOCATION', 'swedencentral')
param foundryModelName = readEnvironmentVariable('FOUNDRY_MODEL_NAME')
param foundryModelVersion = readEnvironmentVariable('FOUNDRY_MODEL_VERSION')

param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD')
param operatorApiKey = readEnvironmentVariable('OPERATOR_API_KEY')
param agentsServiceToken = readEnvironmentVariable('AGENTS_SERVICE_TOKEN')

param budgetAmount = 150
param budgetStartDate = readEnvironmentVariable('BUDGET_START_DATE', '2026-11-01')
param budgetContactEmails = split(readEnvironmentVariable('BUDGET_CONTACT_EMAILS', ''), ',')
