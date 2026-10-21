@description('Azure region.')
param location string

@description('Container Apps environment name.')
param name string

@description('Log Analytics workspace that receives container logs.')
param logAnalyticsName string

param tags object = {}

resource workspace 'Microsoft.OperationalInsights/workspaces@2025-07-01' existing = {
  name: logAnalyticsName
}

// Consumption-only environment (no workload profiles, no VNet): lowest cost, public ingress managed by Azure.
resource environment 'Microsoft.App/managedEnvironments@2026-01-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: workspace.properties.customerId
        sharedKey: workspace.listKeys().primarySharedKey
      }
    }
    zoneRedundant: false
  }
}

output id string = environment.id
output name string = environment.name
output defaultDomain string = environment.properties.defaultDomain
