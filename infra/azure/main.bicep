// MatchIQ Azure reference deployment (spec §14, §30, §49). Resource-group scope.
// Authored and validated with `az bicep build`/`lint` only; not deployed. See README.md.
targetScope = 'resourceGroup'

@allowed(['dev', 'stage', 'prod'])
param environmentName string

param location string = resourceGroup().location

@description('Short prefix for resource names.')
@maxLength(8)
param namePrefix string = 'matchiq'

@description('false creates the platform only (registry, data, secrets, monitoring) so images can be pushed before apps exist.')
param deployApps bool = true

@description('Image tag pushed by deploy-azure.yml (the commit SHA).')
param imageTag string = 'bootstrap'

param appVersion string = '0.0.0-dev'

@allowed(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
param logLevel string = 'info'

@description('mock uses deterministic templates; the agents service rejects mock when APP_ENV=prod.')
@allowed(['mock', 'foundry'])
param modelProvider string = 'mock'

@description('Create the Foundry account, project and model deployment.')
param deployFoundry bool = false

param foundryModelName string = ''
param foundryModelVersion string = ''
param foundryDeploymentName string = 'narrator'
param foundryDeploymentSku string = 'GlobalStandard'
param foundryDeploymentCapacity int = 10

@description('Region for Foundry when the model is unavailable in the main region.')
param foundryLocation string = location

@secure()
param postgresAdminPassword string

@secure()
param streamTicketSecret string

@secure()
param agentsServiceToken string

@description('Monthly budget in the billing currency. 0, or no contacts, skips the budget.')
param budgetAmount int = 0

@description('Budget start date, first of a month (yyyy-MM-01).')
param budgetStartDate string = ''

param budgetContactEmails array = []

@description('Keep one warm replica of web and api so judges never wait for a cold start.')
param minReplicas int = 1

var suffix = take(uniqueString(resourceGroup().id), 6)
var base = '${namePrefix}-${environmentName}'
var tags = { app: 'matchiq', environment: environmentName, managedBy: 'bicep' }
var names = {
  identity: 'id-${base}'
  logs: 'log-${base}'
  appInsights: 'appi-${base}'
  registry: replace('cr${namePrefix}${environmentName}${suffix}', '-', '')
  keyVault: 'kv-${base}-${suffix}'
  postgres: 'psql-${base}-${suffix}'
  redis: 'redis-${base}-${suffix}'
  foundry: 'ais-${base}-${suffix}'
  environment: 'cae-${base}'
  web: 'ca-${base}-web'
  api: 'ca-${base}-api'
  worker: 'ca-${base}-worker'
  agents: 'ca-${base}-agents'
  migrate: 'caj-${base}-migrate'
  budget: 'budget-${base}'
}
var foundryEnabled = deployFoundry && modelProvider == 'foundry'
var budgetEmails = filter(budgetContactEmails, e => !empty(e))

module identity 'modules/identity.bicep' = {
  name: 'identity'
  params: { location: location, name: names.identity, tags: tags }
}

module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    location: location
    name: names.keyVault
    readerPrincipalId: identity.outputs.principalId
    enablePurgeProtection: environmentName == 'prod'
    streamTicketSecret: streamTicketSecret
    agentsServiceToken: agentsServiceToken
    tags: tags
  }
}

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    logAnalyticsName: names.logs
    appInsightsName: names.appInsights
    keyVaultName: keyVault.outputs.name
    tags: tags
  }
}

module registry 'modules/registry.bicep' = {
  name: 'registry'
  params: {
    location: location
    name: names.registry
    pullPrincipalId: identity.outputs.principalId
    tags: tags
  }
}

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    location: location
    name: names.postgres
    keyVaultName: keyVault.outputs.name
    administratorPassword: postgresAdminPassword
    tags: tags
  }
}

module redis 'modules/redis.bicep' = {
  name: 'redis'
  params: {
    location: location
    name: names.redis
    keyVaultName: keyVault.outputs.name
    highAvailability: environmentName == 'prod' ? 'Enabled' : 'Disabled'
    tags: tags
  }
}

module foundry 'modules/foundry.bicep' = if (foundryEnabled) {
  name: 'foundry'
  params: {
    location: foundryLocation
    accountName: names.foundry
    userPrincipalId: identity.outputs.principalId
    deploymentName: foundryDeploymentName
    modelName: foundryModelName
    modelVersion: foundryModelVersion
    deploymentSku: foundryDeploymentSku
    deploymentCapacity: foundryDeploymentCapacity
    tags: tags
  }
}

module budget 'modules/budget.bicep' = if (budgetAmount > 0 && !empty(budgetEmails)) {
  name: 'budget'
  params: {
    name: names.budget
    amount: budgetAmount
    startDate: budgetStartDate
    contactEmails: budgetEmails
  }
}

module environment 'modules/environment.bicep' = {
  name: 'environment'
  params: {
    location: location
    name: names.environment
    logAnalyticsName: monitoring.outputs.workspaceName
    tags: tags
  }
}

module apps 'modules/apps.bicep' = if (deployApps) {
  name: 'apps'
  dependsOn: [postgres, redis]
  params: {
    location: location
    names: names
    environmentId: environment.outputs.id
    defaultDomain: environment.outputs.defaultDomain
    registryServer: registry.outputs.loginServer
    identityId: identity.outputs.id
    identityClientId: identity.outputs.clientId
    keyVaultUri: keyVault.outputs.uri
    imageTag: imageTag
    appEnv: environmentName
    appVersion: appVersion
    logLevel: logLevel
    modelProvider: modelProvider
    foundryProjectEndpoint: foundryEnabled ? foundry!.outputs.projectEndpoint : ''
    foundryModel: foundryEnabled ? foundry!.outputs.deploymentName : ''
    minReplicas: minReplicas
    tags: tags
  }
}

output registryName string = registry.outputs.name
output registryLoginServer string = registry.outputs.loginServer
output keyVaultName string = keyVault.outputs.name
output webUrl string = 'https://${names.web}.${environment.outputs.defaultDomain}'
output migrateJobName string = names.migrate
output apiBaseUrl string = 'https://${names.api}.${environment.outputs.defaultDomain}/api/v1'
