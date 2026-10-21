@description('Azure region.')
param location string

@description('Flexible server name, globally unique.')
param name string

@description('Key Vault that receives the database-url secret.')
param keyVaultName string

param administratorLogin string = 'matchiq_admin'

@secure()
@minLength(16)
param administratorPassword string

param databaseName string = 'matchiq'

@description('Compute SKU. Standard_B1ms (Burstable) is the lowest-cost tier.')
param skuName string = 'Standard_B1ms'

@allowed(['Burstable', 'GeneralPurpose', 'MemoryOptimized'])
param skuTier string = 'Burstable'

@minValue(32)
param storageSizeGB int = 32

@minValue(7)
@maxValue(35)
param backupRetentionDays int = 7

param tags object = {}

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2025-08-01' = {
  name: name
  location: location
  tags: tags
  sku: { name: skuName, tier: skuTier }
  properties: {
    version: '17'
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    // Password auth backs DATABASE_URL today; Entra auth is enabled for the managed-identity migration.
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Enabled'
      tenantId: tenant().tenantId
    }
    storage: { storageSizeGB: storageSizeGB, autoGrow: 'Enabled' }
    backup: { backupRetentionDays: backupRetentionDays, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
    network: { publicNetworkAccess: 'Enabled' }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2025-08-01' = {
  parent: server
  name: databaseName
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}

// 0.0.0.0 admits Azure-hosted callers only (the Container Apps environment has no VNet).
resource allowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2025-08-01' = {
  parent: server
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

resource vault 'Microsoft.KeyVault/vaults@2026-02-01' existing = {
  name: keyVaultName
}

resource databaseUrl 'Microsoft.KeyVault/vaults/secrets@2026-02-01' = {
  parent: vault
  name: 'database-url'
  properties: {
    value: 'postgresql://${administratorLogin}:${uriComponent(administratorPassword)}@${server.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=require'
  }
}

output name string = server.name
output fqdn string = server.properties.fullyQualifiedDomainName
