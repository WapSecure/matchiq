// Microsoft Foundry: AI Services account with project management, one project and one model deployment.
// Key auth is disabled; callers use Entra ID (the apps managed identity) only.
@description('Azure region. Model availability varies by region; check the Foundry model catalog first.')
param location string

@description('AI Services account name; also used as the custom subdomain.')
param accountName string

param projectName string = 'matchiq'

@description('Principal granted the Foundry User role (the apps managed identity).')
param userPrincipalId string

@description('Deployment name the agents service calls (FOUNDRY_MODEL).')
param deploymentName string

@description('Model name in the Foundry catalog.')
param modelName string

@description('Model version. Pin it so a default-version change cannot alter behaviour.')
param modelVersion string

param modelFormat string = 'OpenAI'

@description('Deployment SKU, for example GlobalStandard or DataZoneStandard.')
param deploymentSku string = 'GlobalStandard'

@description('Capacity in thousands of tokens per minute. Keep low to bound spend.')
@minValue(1)
param deploymentCapacity int = 10

param tags object = {}

// "Foundry User" (formerly "Azure AI User"): project data actions plus read on the account.
var foundryUserRoleId = '53ca6127-db72-4b80-b1b0-d745d6d5456d'

resource account 'Microsoft.CognitiveServices/accounts@2026-07-01' = {
  name: accountName
  location: location
  tags: tags
  kind: 'AIServices'
  sku: { name: 'S0' }
  identity: { type: 'SystemAssigned' }
  properties: {
    allowProjectManagement: true
    customSubDomainName: accountName
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
  }
}

resource project 'Microsoft.CognitiveServices/accounts/projects@2026-07-01' = {
  parent: account
  name: projectName
  location: location
  tags: tags
  identity: { type: 'SystemAssigned' }
  properties: {
    displayName: projectName
    description: 'MatchIQ narrative agents'
  }
}

resource deployment 'Microsoft.CognitiveServices/accounts/deployments@2026-07-01' = {
  parent: account
  name: deploymentName
  sku: { name: deploymentSku, capacity: deploymentCapacity }
  properties: {
    model: { format: modelFormat, name: modelName, version: modelVersion }
    versionUpgradeOption: 'NoAutoUpgrade'
  }
}

resource foundryUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(account.id, userPrincipalId, foundryUserRoleId)
  scope: account
  properties: {
    principalId: userPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', foundryUserRoleId)
  }
}

output accountName string = account.name
output projectEndpoint string = 'https://${accountName}.services.ai.azure.com/api/projects/${project.name}'
output deploymentName string = deployment.name
