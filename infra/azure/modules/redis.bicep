// Azure Managed Redis (Microsoft.Cache/redisEnterprise). Azure Cache for Redis is on a retirement path,
// so new deployments use Managed Redis: https://learn.microsoft.com/azure/redis/overview
@description('Azure region.')
param location string

@description('Cache name, globally unique.')
param name string

@description('Key Vault that receives the redis-url secret.')
param keyVaultName string

@description('Balanced_B0 is the smallest SKU (0.5 GB).')
param skuName string = 'Balanced_B0'

@description('Disabling HA halves cost but drops replication. Acceptable for dev and demo.')
@allowed(['Enabled', 'Disabled'])
param highAvailability string = 'Disabled'

param tags object = {}

resource cluster 'Microsoft.Cache/redisEnterprise@2025-07-01' = {
  name: name
  location: location
  tags: tags
  sku: { name: skuName }
  properties: {
    minimumTlsVersion: '1.2'
    highAvailability: highAvailability
    publicNetworkAccess: 'Enabled'
  }
}

resource database 'Microsoft.Cache/redisEnterprise/databases@2025-07-01' = {
  parent: cluster
  name: 'default'
  properties: {
    clientProtocol: 'Encrypted'
    port: 10000
    // Queue workloads need non-clustered keyspace and no eviction.
    clusteringPolicy: 'NoCluster'
    evictionPolicy: 'NoEviction'
    // The apps authenticate with REDIS_URL today; the key lives only in Key Vault.
    accessKeysAuthentication: 'Enabled'
  }
}

resource vault 'Microsoft.KeyVault/vaults@2026-02-01' existing = {
  name: keyVaultName
}

resource redisUrl 'Microsoft.KeyVault/vaults/secrets@2026-02-01' = {
  parent: vault
  name: 'redis-url'
  properties: {
    value: 'rediss://:${uriComponent(database.listKeys().primaryKey)}@${cluster.properties.hostName}:10000'
  }
}

output name string = cluster.name
output hostName string = cluster.properties.hostName
