# Directus adapter futuro

Esta carpeta queda reservada para implementar los mismos puertos definidos en
`src/repositories/ports.ts` cuando Directus este disponible.

La regla de migracion es simple: los casos de uso deben recibir un
`RepositorySet` desde `createRepositories()` o por inyeccion explicita. No deben
importar `better-sqlite3`, SQL ni SDKs de Directus.

## Implementaciones esperadas

- `DirectusJobsRepository`
- `DirectusEvidenceRepository`
- `DirectusServicesRepository`
- `DirectusArkivEventsRepository`

## Mapeo inicial

| Puerto | SQLite actual | Directus futuro |
| --- | --- | --- |
| `JobsRepository` | `jobs` | `jobs` collection |
| `EvidenceRepository` | `job_evidence` + `uploads/` | `job_evidence` + Directus Files |
| `ServicesRepository` | `services`, `provider_profiles`, `users` | colecciones equivalentes |
| `ArkivEventsRepository` | `arkiv_events` | `arkiv_events` collection |

Para activar Directus más adelante, la factory puede cambiar a:

```ts
const repositories =
  process.env.DATA_ADAPTER === "directus"
    ? createDirectusRepositories()
    : createSqliteRepositories();
```
