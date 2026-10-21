@description('Azure region.')
param location string

param name string

param environmentId string

@description('Full image reference, ideally pinned by digest.')
param image string

@description('ACR login server the image is pulled from.')
param registryServer string

@description('User-assigned identity used for ACR pulls, Key Vault references and Foundry calls.')
param identityId string

param targetPort int

@description('External ingress is public; internal is reachable only inside the environment.')
param externalIngress bool

@description('Path probed for liveness and readiness.')
param healthPath string

@description('Plain environment variables: [{ name, value }].')
param env array = []

@description('Key Vault-backed secrets: [{ name, keyVaultUrl, envName }].')
param keyVaultSecrets array = []

@description('cpu/memory pair supported by the Consumption profile, for example 0.5 / 1Gi.')
param cpu string = '0.5'

param memory string = '1Gi'

@description('1 keeps a warm replica so judges never hit a cold start.')
@minValue(0)
param minReplicas int = 1

@minValue(1)
param maxReplicas int = 2

param tags object = {}

var secretRefs = [for s in keyVaultSecrets: { name: s.envName, secretRef: s.name }]

resource app 'Microsoft.App/containerApps@2026-01-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identityId}': {} }
  }
  properties: {
    environmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: externalIngress
        targetPort: targetPort
        transport: 'http'
        allowInsecure: false
      }
      registries: [{ server: registryServer, identity: identityId }]
      secrets: [for s in keyVaultSecrets: { name: s.name, keyVaultUrl: s.keyVaultUrl, identity: identityId }]
    }
    template: {
      containers: [
        {
          name: name
          image: image
          resources: { cpu: json(cpu), memory: memory }
          env: concat(env, secretRefs)
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: healthPath, port: targetPort }
              periodSeconds: 15
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: { path: healthPath, port: targetPort }
              periodSeconds: 10
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: { minReplicas: minReplicas, maxReplicas: maxReplicas }
    }
  }
}

output name string = app.name
output fqdn string = app.properties.configuration.ingress.fqdn
