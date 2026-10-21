@description('Azure region.')
param location string

@description('Key Vault name: 3-24 characters, globally unique.')
@minLength(3)
@maxLength(24)
param name string

@description('Principal granted read access to secret values (the apps managed identity).')
param readerPrincipalId string

@description('Enable purge protection. Irreversible once on; use for prod only.')
param enablePurgeProtection bool = false

@secure()
@minLength(32)
@description('Bearer secret for operator endpoints (OPERATOR_API_KEY).')
param operatorApiKey string

@secure()
@minLength(32)
@description('Shared worker-to-agents token (AGENTS_SERVICE_TOKEN).')
param agentsServiceToken string

param tags object = {}

// Built-in role "Key Vault Secrets User".
var vaultReaderRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource vault 'Microsoft.KeyVault/vaults@2026-02-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    tenantId: tenant().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: enablePurgeProtection ? true : null
    publicNetworkAccess: 'Enabled'
  }
}

resource secretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(vault.id, readerPrincipalId, vaultReaderRoleId)
  scope: vault
  properties: {
    principalId: readerPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', vaultReaderRoleId)
  }
}

resource operatorKeySecret 'Microsoft.KeyVault/vaults/secrets@2026-02-01' = {
  parent: vault
  name: 'operator-api-key'
  properties: { value: operatorApiKey }
}

resource agentsTokenSecret 'Microsoft.KeyVault/vaults/secrets@2026-02-01' = {
  parent: vault
  name: 'agents-service-token'
  properties: { value: agentsServiceToken }
}

output name string = vault.name
output uri string = vault.properties.vaultUri
