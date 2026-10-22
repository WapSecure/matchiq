// The four MatchIQ container apps. web and api take public ingress; worker and agents are internal only.
param location string
param names object
param environmentId string
param defaultDomain string
param registryServer string
param identityId string
param identityClientId string
param keyVaultUri string
param imageTag string
param appEnv string
param appVersion string
param logLevel string
param modelProvider string
param foundryProjectEndpoint string
param foundryModel string
param minReplicas int
param tags object

var healthPath = '/api/v1/health/live'
var webOrigin = 'https://${names.web}.${defaultDomain}'
var apiOrigin = 'https://${names.api}.${defaultDomain}'
var agentsUrl = 'https://${names.agents}.internal.${defaultDomain}'

var common = [
  { name: 'APP_ENV', value: appEnv }
  { name: 'APP_VERSION', value: appVersion }
  { name: 'LOG_LEVEL', value: logLevel }
]

func kvSecret(vaultUri string, name string, envName string) object => {
  name: name
  keyVaultUrl: '${vaultUri}secrets/${name}'
  envName: envName
}

var dataSecrets = [
  kvSecret(keyVaultUri, 'database-url', 'DATABASE_URL')
  kvSecret(keyVaultUri, 'redis-url', 'REDIS_URL')
  kvSecret(keyVaultUri, 'appinsights-connection-string', 'APPLICATIONINSIGHTS_CONNECTION_STRING')
]

var foundryEnv = modelProvider == 'foundry'
  ? [
      { name: 'FOUNDRY_PROJECT_ENDPOINT', value: foundryProjectEndpoint }
      { name: 'FOUNDRY_MODEL', value: foundryModel }
    ]
  : []

module web 'container-app.bicep' = {
  name: 'app-web'
  params: {
    location: location
    name: names.web
    environmentId: environmentId
    image: '${registryServer}/matchiq-web:${imageTag}'
    registryServer: registryServer
    identityId: identityId
    targetPort: 4200
    externalIngress: true
    healthPath: '/'
    env: [{ name: 'PORT', value: '4200' }]
    minReplicas: minReplicas
    tags: tags
  }
}

module api 'container-app.bicep' = {
  name: 'app-api'
  params: {
    location: location
    name: names.api
    environmentId: environmentId
    image: '${registryServer}/matchiq-api:${imageTag}'
    registryServer: registryServer
    identityId: identityId
    targetPort: 3000
    externalIngress: true
    healthPath: healthPath
    env: concat(common, [
      { name: 'API_PORT', value: '3000' }
      { name: 'API_PUBLIC_URL', value: apiOrigin }
      { name: 'CORS_ALLOWED_ORIGINS', value: webOrigin }
      // ADR-0015: the public demo tenant; add OIDC_ISSUER_URL and OIDC_AUDIENCE for Entra ID sign-in.
      { name: 'AUTH_ANONYMOUS_DEMO_ENABLED', value: 'true' }
      { name: 'OTEL_SERVICE_NAME', value: 'matchiq-api' }
    ])
    keyVaultSecrets: concat(dataSecrets, [kvSecret(keyVaultUri, 'stream-ticket-secret', 'STREAM_TICKET_SECRET')])
    minReplicas: minReplicas
    tags: tags
  }
}

module worker 'container-app.bicep' = {
  name: 'app-worker'
  params: {
    location: location
    name: names.worker
    environmentId: environmentId
    image: '${registryServer}/matchiq-worker:${imageTag}'
    registryServer: registryServer
    identityId: identityId
    targetPort: 3001
    externalIngress: false
    healthPath: healthPath
    env: concat(common, [
      { name: 'WORKER_PORT', value: '3001' }
      { name: 'AGENTS_SERVICE_URL', value: agentsUrl }
      { name: 'AI_ENABLED', value: string(modelProvider == 'foundry') }
      { name: 'OTEL_SERVICE_NAME', value: 'matchiq-worker' }
    ])
    keyVaultSecrets: concat(dataSecrets, [kvSecret(keyVaultUri, 'agents-service-token', 'AGENTS_SERVICE_TOKEN')])
    // The worker consumes queues continuously, so it never scales to zero.
    minReplicas: 1
    maxReplicas: 1
    tags: tags
  }
}

module agents 'container-app.bicep' = {
  name: 'app-agents'
  params: {
    location: location
    name: names.agents
    environmentId: environmentId
    image: '${registryServer}/matchiq-agents:${imageTag}'
    registryServer: registryServer
    identityId: identityId
    targetPort: 8000
    externalIngress: false
    healthPath: healthPath
    env: concat(common, foundryEnv, [
      { name: 'AGENTS_PORT', value: '8000' }
      { name: 'MODEL_PROVIDER', value: modelProvider }
      { name: 'AZURE_CLIENT_ID', value: identityClientId }
    ])
    keyVaultSecrets: [kvSecret(keyVaultUri, 'agents-service-token', 'AGENTS_SERVICE_TOKEN')]
    minReplicas: minReplicas
    tags: tags
  }
}

// Manually triggered schema migration; deploy-azure.yml starts it before traffic shifts.
resource migrate 'Microsoft.App/jobs@2026-01-01' = {
  name: names.migrate
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identityId}': {} }
  }
  properties: {
    environmentId: environmentId
    configuration: {
      triggerType: 'Manual'
      replicaTimeout: 600
      replicaRetryLimit: 1
      manualTriggerConfig: { parallelism: 1, replicaCompletionCount: 1 }
      registries: [{ server: registryServer, identity: identityId }]
      secrets: [{ name: 'database-url', keyVaultUrl: '${keyVaultUri}secrets/database-url', identity: identityId }]
    }
    template: {
      containers: [
        {
          name: 'migrate'
          image: '${registryServer}/matchiq-api:${imageTag}'
          command: ['node', 'workspace_modules/@matchiq/db/dist/cli/migrate.js']
          env: [{ name: 'DATABASE_URL', secretRef: 'database-url' }]
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
        }
      ]
    }
  }
}

output migrateJobName string = migrate.name
output webFqdn string = web.outputs.fqdn
output apiFqdn string = api.outputs.fqdn
output workerName string = worker.outputs.name
output agentsName string = agents.outputs.name
