// dev parameters. No real values are committed: secrets and contacts come from the
// deploying shell or the deploy workflow environment (see infra/azure/README.md).
using '../main.bicep'

param environmentName = 'dev'
param location = readEnvironmentVariable('AZURE_LOCATION', 'swedencentral')
param imageTag = readEnvironmentVariable('IMAGE_TAG', 'bootstrap')
param deployApps = bool(readEnvironmentVariable('DEPLOY_APPS', 'true'))
param appVersion = readEnvironmentVariable('APP_VERSION', '0.0.0-dev')
// Scale to zero in dev; cold starts are acceptable here.
param minReplicas = 0

param modelProvider = 'mock'
param deployFoundry = false

param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD')
param operatorApiKey = readEnvironmentVariable('OPERATOR_API_KEY')
param agentsServiceToken = readEnvironmentVariable('AGENTS_SERVICE_TOKEN')

param budgetAmount = 50
param budgetStartDate = readEnvironmentVariable('BUDGET_START_DATE', '2026-11-01')
param budgetContactEmails = split(readEnvironmentVariable('BUDGET_CONTACT_EMAILS', ''), ',')
