# Etapas para iniciar el proyecto: Servicios Verificables con IA + Arkiv + SQLite local

## 1. Contexto del proyecto

**Nombre provisional:** Servicios Verificables  
**Tipo de producto:** marketplace local de servicios entre personas  
**Caso de uso principal:** contratacion de oficios y servicios con evidencia verificable del trabajo realizado.  
**Track de competencia:** datos verificables + IA usando Arkiv.

Esta es una version alternativa del plan inicial. No usa Directus como base de datos durante la primera etapa. En su lugar, guarda los datos operativos en una base SQLite local para poder seguir modelando el producto hasta tener acceso a Directus.

La arquitectura queda preparada para agregar Directus despues mediante una capa de repositorios/adaptadores. La app no deberia depender directamente de SQLite ni de Directus desde las pantallas o casos de uso.

---

## 2. Decision temporal de arquitectura

### Decision

Usar **SQLite local** como base operativa del MVP mientras Directus no esta disponible.

### Motivo

- Permite avanzar con el modelado de datos.
- Permite sembrar usuarios, servicios, trabajos y evidencias iniciales.
- Evita bloquear el desarrollo por falta de Directus.
- Mantiene el foco del hackathon en Arkiv + IA.
- Facilita migrar despues a Directus si la capa de datos queda aislada.

### Regla importante

SQLite guarda datos operativos editables. Arkiv guarda eventos verificables importantes.

SQLite responde:

- que servicios mostrar;
- que usuarios existen;
- que trabajos se ven en la app;
- que archivos locales estan asociados a una evidencia;
- que `entityKey` y `txHash` quedaron asociados a cada evento.

Arkiv responde:

- que evento verificable se publico;
- quien lo creo;
- cuando se publico;
- que atributos consultables tiene;
- si el historial puede auditarse sin confiar solo en la base local.

---

## 3. Lineamientos de la competencia

La competencia pide construir un prototipo donde importen los datos confiables y verificables. El proyecto debe cumplir estos puntos:

1. **Datos verificables + IA**  
   La app debe leer o escribir datos confiables y usar IA con un caso de uso claro.

2. **Arkiv como parte central del flujo**  
   Arkiv no debe aparecer solo como una integracion decorativa al final. Debe estar integrado en el proceso principal del producto.

3. **Dato no editable a escondidas**  
   El usuario o jurado debe poder entender por que un dato guardado en Arkiv tiene mas valor que un dato guardado solamente en SQLite.

4. **Uso de entidades consultables**  
   Las entidades de Arkiv deben tener `payload`, `contentType`, `attributes`, `entityKey` y vencimiento cuando aplique.

5. **Uso de Braga durante el hackathon**  
   La red indicada para trabajar es Braga, la testnet actual de Arkiv.

6. **Prototipo Web3 + IA con caso de uso claro**  
   La IA no debe ser generica. Debe ayudar a validar, resumir, clasificar o buscar evidencia de servicios reales.

---

## 4. Idea central adaptada al track Arkiv

El proyecto debe presentarse asi:

> Plataforma de servicios donde cada trabajo genera evidencia verificable: fotos, estados, validaciones de IA y cierre del servicio. SQLite funciona como base operativa local del prototipo, mientras Arkiv funciona como capa verificable para demostrar quien creo cada evidencia, cuando se publico y que atributos tiene.

El diferencial no es la base SQLite. SQLite es una herramienta temporal de desarrollo. El diferencial competitivo sigue siendo:

> Historial verificable de trabajo y reputacion portable para prestadores de servicios.

---

## 5. Alcance recomendado para el MVP

### Incluir en el MVP

- Catalogo de servicios.
- Perfiles de prestadores.
- Creacion simulada de solicitud de trabajo.
- Estados del trabajo: `requested`, `accepted`, `in_progress`, `evidence_uploaded`, `ai_reviewed`, `completed`.
- Subida de evidencia visual a carpeta local.
- Registro de metadata de evidencia en SQLite.
- Publicacion de eventos importantes en Arkiv.
- Lectura de entidad Arkiv desde la app.
- Consulta por atributos usando `arkiv_query`.
- Analisis de IA sobre la evidencia.
- Resumen del trabajo generado por IA.
- Vista de historial verificable del trabajo.
- Panel para cliente, prestador y administrador.
- Capa de repositorios lista para reemplazar SQLite por Directus.

### No incluir todavia

- Pagos reales.
- Stellar real.
- Escrow real.
- Wallet real para cada usuario final.
- Matching inteligente complejo.
- Login productivo.
- Sistema completo de disputas.
- Directus como dependencia obligatoria.
- Blockchain para absolutamente todo.

---

## 6. Arquitectura inicial recomendada sin Directus

```text
Frontend React / Vite / Tailwind
        |
        | HTTP / acciones server-side
        v
Backend Node / API Routes
        |
        | casos de uso
        v
Repository interfaces
        |
        +--------------------+
        |                    |
        v                    v
SQLite adapter          Arkiv service
        |                    |
        v                    v
data/app.db         Braga Testnet
        |
        v
uploads/ evidencia visual local
```

### Capa preparada para Directus despues

```text
Repository interfaces
        |
        +--------------------+--------------------+
        |                    |                    |
        v                    v                    v
SQLite adapter         Directus adapter       Test adapter
actual                 futuro                 pruebas
```

El frontend y los casos de uso deben hablar con interfaces como `JobsRepository`, `EvidenceRepository` y `ServicesRepository`. La implementacion concreta puede ser SQLite ahora y Directus despues.

### Responsabilidad de cada parte

| Componente | Responsabilidad |
|---|---|
| React | Interfaz de usuario y flujo navegable |
| Backend Node / API Routes | Casos de uso, validacion, escritura segura en Arkiv |
| SQLite local | Datos operativos rapidos del MVP |
| Carpeta `uploads/` | Evidencia visual local |
| Arkiv | Evidencia verificable, auditoria y datos consultables |
| IA multimodal | Validacion, clasificacion y resumen de evidencia |
| Repository interfaces | Contrato estable para cambiar SQLite por Directus despues |
| Directus adapter futuro | Implementacion futura de los mismos repositorios |

---

## 7. Estructura sugerida del proyecto

```text
servicios-verificables-arkiv/
├── backend/
│   ├── data/
│   │   └── app.db
│   ├── db/
│   │   ├── migrations/
│   │   │   └── 001_initial.sql
│   │   └── seed.ts
│   ├── src/
│   │   ├── arkiv/
│   │   │   ├── client.ts
│   │   │   └── events.ts
│   │   ├── repositories/
│   │   │   ├── ports.ts
│   │   │   ├── sqlite/
│   │   │   │   ├── db.ts
│   │   │   │   ├── jobs.repository.ts
│   │   │   │   ├── evidence.repository.ts
│   │   │   │   └── services.repository.ts
│   │   │   └── directus/
│   │   │       └── README.md
│   │   ├── use-cases/
│   │   │   ├── create-job.ts
│   │   │   ├── upload-evidence.ts
│   │   │   ├── generate-ai-review.ts
│   │   │   └── complete-job.ts
│   │   └── uploads/
│   ├── scripts/
│   │   └── arkiv-hello.ts
│   ├── .env
│   └── package.json
└── frontend/
```

La carpeta `directus/` puede existir desde el inicio solo como placeholder documental. No debe usarse hasta tener acceso a Directus.

---

## 8. Modelo de datos operativo en SQLite

Estas tablas reemplazan temporalmente las colecciones de Directus.

### `users`

Usuarios del sistema.

Campos recomendados:

- `id TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `role TEXT NOT NULL CHECK(role IN ('client', 'provider', 'admin'))`
- `avatar_url TEXT`
- `city TEXT`
- `rating REAL DEFAULT 0`

### `services`

Catalogo de servicios.

Campos recomendados:

- `id TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `category TEXT NOT NULL`
- `description TEXT`
- `base_price INTEGER`
- `icon TEXT`

Ejemplos:

- Jardineria
- Plomeria
- Electricidad
- Limpieza
- Reparaciones
- Mantenimiento general

### `provider_profiles`

Perfil del prestador.

Campos recomendados:

- `id TEXT PRIMARY KEY`
- `user_id TEXT NOT NULL REFERENCES users(id)`
- `bio TEXT`
- `service_categories TEXT NOT NULL`
- `experience_years INTEGER DEFAULT 0`
- `verified_jobs_count INTEGER DEFAULT 0`
- `rating_average REAL DEFAULT 0`

`service_categories` puede guardarse como JSON string mientras el modelo sea local.

### `jobs`

Solicitud y seguimiento de trabajos.

Campos recomendados:

- `id TEXT PRIMARY KEY`
- `client_id TEXT NOT NULL REFERENCES users(id)`
- `provider_id TEXT REFERENCES users(id)`
- `service_id TEXT NOT NULL REFERENCES services(id)`
- `title TEXT NOT NULL`
- `description TEXT NOT NULL`
- `status TEXT NOT NULL`
- `address_area TEXT`
- `scheduled_date TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `arkiv_entity_key_created TEXT`
- `arkiv_tx_hash_created TEXT`

### `job_evidence`

Evidencia visual o documental.

Campos recomendados:

- `id TEXT PRIMARY KEY`
- `job_id TEXT NOT NULL REFERENCES jobs(id)`
- `uploaded_by TEXT NOT NULL REFERENCES users(id)`
- `type TEXT NOT NULL CHECK(type IN ('before', 'progress', 'after', 'receipt', 'issue'))`
- `local_file_path TEXT NOT NULL`
- `public_file_url TEXT`
- `description TEXT`
- `sha256_hash TEXT NOT NULL`
- `ai_summary TEXT`
- `ai_status TEXT DEFAULT 'pending'`
- `arkiv_entity_key TEXT`
- `arkiv_tx_hash TEXT`
- `created_at TEXT NOT NULL`

### `reviews`

Calificaciones del trabajo.

Campos recomendados:

- `id TEXT PRIMARY KEY`
- `job_id TEXT NOT NULL REFERENCES jobs(id)`
- `client_id TEXT NOT NULL REFERENCES users(id)`
- `provider_id TEXT NOT NULL REFERENCES users(id)`
- `rating INTEGER NOT NULL`
- `comment TEXT`
- `arkiv_entity_key TEXT`
- `arkiv_tx_hash TEXT`
- `created_at TEXT NOT NULL`

### `arkiv_events`

Bitacora local de publicaciones en Arkiv. Esta tabla facilita depurar el flujo y reconstruir timelines.

Campos recomendados:

- `id TEXT PRIMARY KEY`
- `local_subject_type TEXT NOT NULL`
- `local_subject_id TEXT NOT NULL`
- `event_type TEXT NOT NULL`
- `entity_key TEXT NOT NULL`
- `tx_hash TEXT NOT NULL`
- `payload_json TEXT NOT NULL`
- `attributes_json TEXT NOT NULL`
- `created_at TEXT NOT NULL`

---

## 9. SQL inicial sugerido

Crear `backend/db/migrations/001_initial.sql`:

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('client', 'provider', 'admin')),
  avatar_url TEXT,
  city TEXT,
  rating REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  base_price INTEGER,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS provider_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  bio TEXT,
  service_categories TEXT NOT NULL,
  experience_years INTEGER DEFAULT 0,
  verified_jobs_count INTEGER DEFAULT 0,
  rating_average REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES users(id),
  provider_id TEXT REFERENCES users(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  address_area TEXT,
  scheduled_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  arkiv_entity_key_created TEXT,
  arkiv_tx_hash_created TEXT
);

CREATE TABLE IF NOT EXISTS job_evidence (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK(type IN ('before', 'progress', 'after', 'receipt', 'issue')),
  local_file_path TEXT NOT NULL,
  public_file_url TEXT,
  description TEXT,
  sha256_hash TEXT NOT NULL,
  ai_summary TEXT,
  ai_status TEXT DEFAULT 'pending',
  arkiv_entity_key TEXT,
  arkiv_tx_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  client_id TEXT NOT NULL REFERENCES users(id),
  provider_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  arkiv_entity_key TEXT,
  arkiv_tx_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS arkiv_events (
  id TEXT PRIMARY KEY,
  local_subject_type TEXT NOT NULL,
  local_subject_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  attributes_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

---

## 10. Contratos de repositorio

Crear una capa de puertos para que los casos de uso no dependan de SQLite.

Ejemplo `src/repositories/ports.ts`:

```ts
export type JobStatus =
  | "requested"
  | "accepted"
  | "in_progress"
  | "evidence_uploaded"
  | "ai_reviewed"
  | "completed";

export type Job = {
  id: string;
  clientId: string;
  providerId: string | null;
  serviceId: string;
  title: string;
  description: string;
  status: JobStatus;
  addressArea: string | null;
  scheduledDate: string | null;
  createdAt: string;
  updatedAt: string;
  arkivEntityKeyCreated: string | null;
  arkivTxHashCreated: string | null;
};

export type CreateJobInput = {
  clientId: string;
  providerId?: string | null;
  serviceId: string;
  title: string;
  description: string;
  addressArea?: string | null;
  scheduledDate?: string | null;
};

export interface JobsRepository {
  create(input: CreateJobInput): Promise<Job>;
  findById(id: string): Promise<Job | null>;
  list(): Promise<Job[]>;
  updateStatus(id: string, status: JobStatus): Promise<void>;
  attachCreatedArkivEvent(id: string, event: { entityKey: string; txHash: string }): Promise<void>;
}

export interface EvidenceRepository {
  create(input: {
    jobId: string;
    uploadedBy: string;
    type: "before" | "progress" | "after" | "receipt" | "issue";
    localFilePath: string;
    publicFileUrl?: string | null;
    description?: string | null;
    sha256Hash: string;
  }): Promise<{ id: string }>;

  attachArkivEvent(id: string, event: { entityKey: string; txHash: string }): Promise<void>;
  attachAIReview(id: string, review: { summary: string; status: string }): Promise<void>;
}

export interface ArkivEventsRepository {
  create(input: {
    localSubjectType: string;
    localSubjectId: string;
    eventType: string;
    entityKey: string;
    txHash: string;
    payloadJson: string;
    attributesJson: string;
  }): Promise<void>;
}
```

Cuando Directus este disponible, se crea `DirectusJobsRepository` con el mismo contrato. Los casos de uso no cambian.

---

## 11. Modelo de entidades en Arkiv

Arkiv debe guardar los eventos importantes del ciclo de vida del trabajo. En todos los eventos se recomienda incluir un atributo de proyecto unico y filtrar siempre por el.

### Atributo de proyecto

```ts
export const PROJECT_ATTRIBUTE = {
  key: "app",
  value: "servicios-verificables",
} as const;
```

Para mayor confianza en lectura, combinar el filtro de proyecto con `.createdBy()` usando la wallet backend que publica datos confiables.

### Entidad 1: `job_created`

Se crea cuando el cliente solicita un trabajo.

#### Payload sugerido

```json
{
  "eventType": "job_created",
  "jobId": "job_001",
  "serviceType": "plomeria",
  "clientId": "client_001",
  "providerId": "provider_003",
  "description": "Reparacion de perdida de agua debajo de la cocina",
  "source": "sqlite_local",
  "createdAt": "2026-05-28T10:00:00Z"
}
```

#### Attributes sugeridos

```json
[
  { "key": "app", "value": "servicios-verificables" },
  { "key": "track", "value": "arkiv" },
  { "key": "entityType", "value": "job_created" },
  { "key": "jobId", "value": "job_001" },
  { "key": "serviceType", "value": "plomeria" },
  { "key": "status", "value": "requested" }
]
```

### Entidad 2: `evidence_uploaded`

Se crea cuando el prestador sube evidencia.

#### Payload sugerido

```json
{
  "eventType": "evidence_uploaded",
  "jobId": "job_001",
  "evidenceId": "evidence_001",
  "evidenceType": "after",
  "fileUrl": "/uploads/job_001_after.jpg",
  "sha256Hash": "HASH_DE_LA_IMAGEN",
  "uploadedBy": "provider_003",
  "source": "sqlite_local",
  "uploadedAt": "2026-05-28T12:30:00Z"
}
```

#### Attributes sugeridos

```json
[
  { "key": "app", "value": "servicios-verificables" },
  { "key": "track", "value": "arkiv" },
  { "key": "entityType", "value": "evidence_uploaded" },
  { "key": "jobId", "value": "job_001" },
  { "key": "evidenceType", "value": "after" },
  { "key": "serviceType", "value": "plomeria" }
]
```

### Entidad 3: `ai_review_generated`

Se crea cuando la IA analiza la evidencia.

#### Payload sugerido

```json
{
  "eventType": "ai_review_generated",
  "jobId": "job_001",
  "evidenceId": "evidence_001",
  "model": "multimodal-ai",
  "summary": "La imagen parece mostrar una reparacion terminada en la zona inferior de una cocina. No se observan perdidas visibles.",
  "classification": "work_completed",
  "confidence": 0.82,
  "warnings": [],
  "source": "sqlite_local",
  "createdAt": "2026-05-28T12:35:00Z"
}
```

#### Attributes sugeridos

```json
[
  { "key": "app", "value": "servicios-verificables" },
  { "key": "track", "value": "arkiv" },
  { "key": "entityType", "value": "ai_review_generated" },
  { "key": "jobId", "value": "job_001" },
  { "key": "aiStatus", "value": "valid" },
  { "key": "serviceType", "value": "plomeria" }
]
```

### Entidad 4: `job_completed`

Se crea al cerrar el trabajo.

#### Payload sugerido

```json
{
  "eventType": "job_completed",
  "jobId": "job_001",
  "clientId": "client_001",
  "providerId": "provider_003",
  "finalStatus": "completed",
  "rating": 5,
  "review": "Trabajo terminado correctamente y con evidencia clara.",
  "source": "sqlite_local",
  "completedAt": "2026-05-28T13:00:00Z"
}
```

#### Attributes sugeridos

```json
[
  { "key": "app", "value": "servicios-verificables" },
  { "key": "track", "value": "arkiv" },
  { "key": "entityType", "value": "job_completed" },
  { "key": "jobId", "value": "job_001" },
  { "key": "providerId", "value": "provider_003" },
  { "key": "status", "value": "completed" }
]
```

---

## 12. Etapas de inicio del proyecto

## Etapa 0: Definir el flujo y el mensaje del pitch

### Objetivo

Alinear el producto con la consigna de la competencia antes de programar.

### Tareas

- Definir el nombre del proyecto.
- Definir el problema: falta de confianza en servicios entre particulares.
- Definir el diferencial: evidencia verificable + IA.
- Definir el flujo principal del producto.
- Elegir 2 o 3 servicios para mostrar: plomeria, jardineria y electricidad.
- Decidir que datos van a SQLite y que eventos van a Arkiv.

### Entregable

Una frase clara de pitch:

> Ayudamos a clientes y prestadores a construir confianza mediante evidencia de trabajo verificable en Arkiv y analisis de IA sobre fotos del servicio. SQLite se usa solo como base operativa local del prototipo.

### Criterio de aceptacion

Cualquier jurado debe poder entender en menos de un minuto:

- que problema resuelve;
- por que la IA importa;
- por que Arkiv es necesario;
- que dato no puede ser editado silenciosamente;
- por que SQLite no reemplaza la capa verificable.

---

## Etapa 1: Crear repositorio y preparar entorno

### Objetivo

Tener el proyecto base funcionando localmente.

### Tareas

Crear carpeta del proyecto:

```bash
mkdir servicios-verificables-arkiv
cd servicios-verificables-arkiv
```

Inicializar backend Node:

```bash
mkdir backend
cd backend
npm init -y
npm pkg set type=module
```

Instalar dependencias base:

```bash
npm install @arkiv-network/sdk dotenv typescript tsx better-sqlite3
npm install -D @types/better-sqlite3
```

Crear `.env`:

```env
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI
DATABASE_URL=./data/app.db
UPLOADS_DIR=./uploads
```

Crear `.gitignore`:

```gitignore
.env
node_modules/
dist/
data/*.db
data/*.db-shm
data/*.db-wal
uploads/*
!uploads/.gitkeep
```

### Entregable

Repositorio con backend listo para ejecutar scripts.

### Criterio de aceptacion

El proyecto instala dependencias sin errores, la clave privada no queda versionada y la base SQLite local queda fuera de git.

---

## Etapa 2: Configurar wallet, faucet y red Braga

### Objetivo

Poder crear entidades reales en Arkiv usando Braga.

### Parametros de Braga

| Parametro | Valor |
|---|---|
| Network ID | `60138453102` |
| HTTP RPC | `https://braga.hoodi.arkiv.network/rpc` |
| WebSocket | `wss://braga.hoodi.arkiv.network/rpc/ws` |
| Gas token | `GLM` |
| Faucet | `braga.hoodi.arkiv.network/faucet` |
| Block explorer | `explorer.braga.hoodi.arkiv.network` |
| Entity explorer | `data.arkiv.network` |

### Tareas

- Crear o usar una wallet Ethereum de prueba.
- Cargar la clave privada en `.env`.
- Pedir GLM en el faucet.
- Confirmar que la wallet puede pagar gas.

### Entregable

Wallet lista para escribir entidades en Arkiv.

### Criterio de aceptacion

Se puede ejecutar un script `arkiv-hello.ts` que cree una entidad y devuelva:

- `entityKey`
- `txHash`

---

## Etapa 3: Crear prueba minima de Arkiv

### Objetivo

Validar creacion y lectura de entidades antes de integrar la app.

### Tareas

Usar o crear:

```text
backend/scripts/arkiv-hello.ts
```

El script debe:

- validar `PRIVATE_KEY`;
- confirmar que la red es Braga;
- revisar balance GLM;
- crear una entidad JSON;
- leer la entidad creada con `PublicClient`.

### Entregable

Primera entidad creada y legible desde Arkiv.

### Criterio de aceptacion

El equipo puede mostrar el `entityKey` y el `txHash` en la presentacion.

---

## Etapa 4: Levantar SQLite local

### Objetivo

Tener backend operativo rapido para datos de app sin depender de Directus.

### Tareas

- Crear carpeta `backend/data`.
- Crear migracion `backend/db/migrations/001_initial.sql`.
- Crear script `backend/db/seed.ts`.
- Crear tablas principales:
  - `users`
  - `services`
  - `provider_profiles`
  - `jobs`
  - `job_evidence`
  - `reviews`
  - `arkiv_events`
- Cargar datos iniciales.
- Crear carpeta local `backend/uploads`.
- Calcular `sha256_hash` al guardar evidencia.

### Entregable

SQLite funcionando con datos precargados.

### Criterio de aceptacion

Desde el backend se pueden listar:

- servicios;
- prestadores;
- trabajos;
- evidencias;
- eventos Arkiv asociados.

---

## Etapa 5: Crear capa de repositorios

### Objetivo

Evitar que el proyecto quede acoplado a SQLite.

### Tareas

- Crear `src/repositories/ports.ts`.
- Crear implementaciones SQLite:
  - `SqliteJobsRepository`
  - `SqliteEvidenceRepository`
  - `SqliteServicesRepository`
  - `SqliteArkivEventsRepository`
- Crear `src/repositories/directus/README.md` explicando el adapter futuro.
- Asegurar que los casos de uso reciban repositorios por parametro o factory.

### Entregable

Casos de uso desacoplados de la base concreta.

### Criterio de aceptacion

Para migrar a Directus no hay que cambiar el flujo de negocio, solo implementar nuevos repositorios.

---

## Etapa 6: Diseñar el flujo principal de usuario

### Objetivo

Construir una experiencia simple y demostrable.

### Flujo del cliente

```text
Ver servicios
-> elegir prestador
-> solicitar trabajo
-> ver estado
-> revisar evidencia
-> aprobar finalizacion
-> dejar reseña
```

### Flujo del prestador

```text
Ver solicitud
-> aceptar trabajo
-> marcar avance
-> subir evidencia
-> solicitar aprobacion
```

### Flujo de verificacion

```text
Trabajo creado en SQLite
-> entidad job_created en Arkiv
-> entityKey guardado en SQLite
-> evidencia subida a uploads/
-> metadata guardada en SQLite
-> entidad evidence_uploaded en Arkiv
-> IA analiza evidencia
-> resultado guardado en SQLite
-> entidad ai_review_generated en Arkiv
-> trabajo finalizado
-> entidad job_completed en Arkiv
```

### Entregable

Mapa de pantallas y estados.

### Criterio de aceptacion

El flujo se entiende sin explicar la base de datos ni el codigo.

---

## Etapa 7: Crear frontend navegable

### Objetivo

Tener una experiencia visual completa.

### Pantallas minimas

1. **Home**
   - Explica el valor de evidencia verificable.
   - Boton para buscar servicios.

2. **Listado de servicios**
   - Categorias y filtros simples.

3. **Perfil del prestador**
   - Rating.
   - Historial de trabajos.
   - Evidencia anterior.
   - Indicador de reputacion verificable.

4. **Detalle del trabajo**
   - Estado actual.
   - Timeline.
   - Evidencias.
   - Resumen IA.
   - Enlaces a Arkiv.

5. **Panel prestador**
   - Trabajos asignados.
   - Boton para subir evidencia.
   - Boton para marcar avance.

6. **Panel admin**
   - Lista de trabajos.
   - Estado de verificacion.
   - Alertas de IA.
   - Entity keys.

### Entregable

Frontend con navegacion completa.

### Criterio de aceptacion

El jurado puede recorrer el caso de uso de punta a punta.

---

## Etapa 8: Integrar escritura real en Arkiv

### Objetivo

Hacer que los eventos importantes del MVP escriban entidades reales.

### Tareas

Crear funciones:

```text
createJobCreatedEntity()
createEvidenceUploadedEntity()
createAIReviewGeneratedEntity()
createJobCompletedEntity()
```

Cada funcion debe:

1. Recibir datos desde los casos de uso.
2. Construir un payload JSON.
3. Definir atributos consultables.
4. Crear entidad con `WalletClient.createEntity`.
5. Guardar `entityKey` y `txHash` de vuelta en SQLite.
6. Registrar el evento en `arkiv_events`.

### Importante

Nunca exponer `PRIVATE_KEY` en el navegador.

Las escrituras deben correr en:

- script Node local;
- backend propio;
- API route;
- funcion server-side.

### Entregable

Eventos reales guardados en Arkiv y referenciados en SQLite.

### Criterio de aceptacion

Al crear o actualizar un trabajo, la app muestra:

- `entityKey`;
- `txHash`;
- link al explorer;
- estado de verificacion.

---

## Etapa 9: Integrar lectura y consulta desde Arkiv

### Objetivo

Mostrar que los datos pueden leerse y consultarse como capa verificable.

### Tareas

- Crear cliente publico de Arkiv.
- Leer una entidad por `entityKey`.
- Mostrar payload en pantalla.
- Consultar entidades por atributos.
- Mostrar historial verificable del trabajo.
- Comparar el timeline local de SQLite con el timeline verificable de Arkiv.

### Ejemplo de consulta por `jobId`

```bash
curl https://braga.hoodi.arkiv.network/rpc \
  -H "content-type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"arkiv_query",
    "params":[
      "app = \"servicios-verificables\" && jobId = \"job_001\"",
      {"resultsPerPage":"0xa"}
    ]
  }'
```

### Entregable

Vista de historial verificable.

### Criterio de aceptacion

Se puede consultar todo el historial de un trabajo usando atributos de Arkiv, aunque SQLite sea la base operativa local.

---

## Etapa 10: Integrar IA sobre evidencia

### Objetivo

Usar IA para aportar valor real al flujo de confianza.

### Casos de uso recomendados

1. **Resumen automatico**
   - La IA describe que se ve en la evidencia.

2. **Clasificacion contextual**
   - La IA clasifica si la imagen parece `before`, `progress` o `after`.

3. **Validacion basica**
   - La IA indica si la imagen parece coherente con el servicio.

4. **Advertencias**
   - Imagen borrosa.
   - Imagen irrelevante.
   - Posible duplicado.
   - No se observa el trabajo descrito.

5. **Resumen final del trabajo**
   - La IA genera una explicacion breve del historial completo.

### Resultado esperado de IA

```json
{
  "summary": "La imagen muestra una reparacion terminada en una zona de cocina.",
  "classification": "after",
  "matchesServiceType": true,
  "confidence": 0.82,
  "warnings": []
}
```

### Integracion con SQLite y Arkiv

1. Guardar resultado operativo en `job_evidence.ai_summary` y `job_evidence.ai_status`.
2. Publicar resultado verificable en Arkiv como `ai_review_generated`.
3. Guardar `entityKey` y `txHash` del analisis en SQLite.

### Entregable

Evidencia con analisis de IA verificable.

### Criterio de aceptacion

La presentacion muestra una foto, el analisis IA y el `entityKey` del analisis guardado en Arkiv.

---

## Etapa 11: Preparar datos iniciales

### Objetivo

Evitar depender de datos improvisados durante la presentacion.

### Datos minimos

- 3 clientes.
- 5 prestadores.
- 6 servicios.
- 4 trabajos de ejemplo.
- 8 evidencias visuales locales.
- 4 analisis IA ya generados.
- 4 entidades Arkiv creadas previamente.

### Trabajos sugeridos

| Trabajo | Servicio | Estado | Evidencia | IA |
|---|---|---|---|---|
| Perdida bajo cocina | Plomeria | Completado | Antes/despues | Valida |
| Corte de cesped | Jardineria | Completado | Antes/despues | Valida |
| Cambio de toma | Electricidad | En progreso | Progreso | Advertencia |
| Limpieza profunda | Limpieza | Completado | Despues | Valida |

### Entregable

Datos iniciales listos.

### Criterio de aceptacion

Aunque falle una integracion en vivo, el flujo puede mostrarse con datos prearmados.

---

## Etapa 12: Preparar migracion futura a Directus

### Objetivo

Dejar claro como se reemplaza SQLite por Directus cuando este disponible.

### Principio

Directus no debe entrar en el dominio. Debe entrar como adaptador.

### Tareas futuras

- Crear colecciones Directus equivalentes a las tablas SQLite.
- Crear `DirectusJobsRepository`.
- Crear `DirectusEvidenceRepository`.
- Crear `DirectusServicesRepository`.
- Crear `DirectusArkivEventsRepository`.
- Crear script de migracion SQLite -> Directus.
- Cambiar la factory de repositorios:

```ts
const repositories =
  process.env.DATA_ADAPTER === "directus"
    ? createDirectusRepositories()
    : createSqliteRepositories();
```

### Mapeo SQLite -> Directus

| SQLite | Directus futuro |
|---|---|
| `users` | `users` collection |
| `services` | `services` collection |
| `provider_profiles` | `provider_profiles` collection |
| `jobs` | `jobs` collection |
| `job_evidence` | `job_evidence` collection + Directus Files |
| `reviews` | `reviews` collection |
| `arkiv_events` | `arkiv_events` collection |
| `uploads/` | Directus Media Library |

### Criterio de aceptacion

La migracion a Directus requiere agregar adaptadores y mover datos, no reescribir la app.

---

## 13. Checklist tecnico para competencia

### Arkiv

- [ ] Usar Braga, no Kaolin.
- [ ] Tener GLM desde el faucet.
- [ ] Crear al menos una entidad real.
- [ ] Guardar payload JSON estructurado.
- [ ] Usar attributes consultables.
- [ ] Mostrar `entityKey` en la UI.
- [ ] Mostrar `txHash` en la UI.
- [ ] Leer entidad con `PublicClient`.
- [ ] Consultar entidades con `arkiv_query`.
- [ ] Explicar por que Arkiv es central al flujo.

### SQLite local

- [ ] Crear `data/app.db`.
- [ ] Crear migracion inicial.
- [ ] Crear datos iniciales.
- [ ] Guardar servicios y usuarios.
- [ ] Guardar trabajos y evidencias.
- [ ] Guardar referencias a `entityKey` y `txHash`.
- [ ] Mantener SQLite fuera de git.

### Arquitectura preparada para Directus

- [ ] Definir interfaces de repositorio.
- [ ] Usar casos de uso desacoplados de la base.
- [ ] Implementar repositorios SQLite.
- [ ] Documentar repositorios Directus futuros.
- [ ] Agregar `DATA_ADAPTER=sqlite`.
- [ ] Evitar consultas SQL directas desde la UI.

### IA

- [ ] Analizar evidencia visual.
- [ ] Generar resumen del trabajo.
- [ ] Clasificar evidencia.
- [ ] Detectar advertencias basicas.
- [ ] Guardar resultado de IA en SQLite.
- [ ] Guardar resultado de IA en Arkiv.
- [ ] Mostrar analisis IA en pantalla.

### Producto

- [ ] Home clara.
- [ ] Flujo cliente completo.
- [ ] Flujo prestador completo.
- [ ] Timeline de trabajo.
- [ ] Evidencia antes/despues.
- [ ] Reputacion del prestador.
- [ ] Panel admin.
- [ ] Datos precargados.

---

## 14. Orden recomendado de trabajo para el hackathon

## Bloque 1: Base tecnica

1. Crear repo.
2. Instalar SDK Arkiv.
3. Configurar `.env`.
4. Conseguir GLM en faucet.
5. Ejecutar `arkiv-hello.ts`.
6. Confirmar entidad en explorer.

## Bloque 2: SQLite local

1. Instalar `better-sqlite3`.
2. Crear migracion inicial.
3. Crear `data/app.db`.
4. Crear datos iniciales.
5. Crear repositorios SQLite.
6. Crear factory `DATA_ADAPTER=sqlite`.

## Bloque 3: Frontend

1. Crear layout.
2. Crear home.
3. Crear listado de servicios.
4. Crear perfil prestador.
5. Crear detalle de trabajo.
6. Crear timeline.
7. Crear panel prestador.
8. Crear panel admin.

## Bloque 4: Flujo verificable

1. Al crear trabajo, guardar en SQLite.
2. Al crear trabajo, crear entidad `job_created`.
3. Al subir evidencia, guardar archivo local y metadata.
4. Al subir evidencia, crear entidad `evidence_uploaded`.
5. Al analizar con IA, guardar resultado local.
6. Al analizar con IA, crear entidad `ai_review_generated`.
7. Al finalizar, crear entidad `job_completed`.
8. Mostrar `entityKey` y `txHash`.

## Bloque 5: IA

1. Enviar imagen a modelo multimodal.
2. Recibir resumen.
3. Recibir clasificacion.
4. Recibir advertencias.
5. Guardar respuesta en SQLite.
6. Publicar respuesta en Arkiv.

## Bloque 6: Preparacion para Directus

1. Mantener interfaces limpias.
2. Documentar mapeo SQLite -> Directus.
3. Evitar dependencias directas de SQLite en UI.
4. Preparar variable `DATA_ADAPTER`.
5. Definir colecciones futuras.

---

## 15. Definicion de exito del MVP

El MVP esta listo cuando se puede demostrar este flujo:

```text
Cliente crea trabajo
-> se guarda trabajo en SQLite
-> se crea entidad en Arkiv
-> prestador sube evidencia local
-> se guarda metadata en SQLite
-> se crea entidad de evidencia en Arkiv
-> IA analiza la evidencia
-> se guarda resultado en SQLite
-> se crea entidad de analisis IA en Arkiv
-> cliente ve historial verificable
-> trabajo se completa
-> se crea entidad final en Arkiv
```

El punto mas importante para la competencia es que Arkiv no sea un agregado cosmetico. SQLite puede cambiar despues por Directus, pero Arkiv debe seguir siendo el registro verificable del historial de confianza del servicio.

---

## 16. Riesgos y decisiones para no perder tiempo

### Riesgo 1: que SQLite se vuelva arquitectura final por accidente

**Decision:** usar SQLite solo detras de repositorios. Preparar `DirectusRepository` como reemplazo futuro.

### Riesgo 2: querer hacer pagos reales

**Decision:** dejar pagos y escrow fuera del MVP.

### Riesgo 3: hacer login real

**Decision:** usar usuarios precargados.

### Riesgo 4: guardar demasiada informacion en Arkiv

**Decision:** guardar solo eventos importantes y evidencia verificable.

### Riesgo 5: que la IA sea superficial

**Decision:** hacer que la IA analice evidencia del trabajo y guarde su resultado verificable.

### Riesgo 6: que SQLite parezca mas importante que Arkiv

**Decision:** SQLite es operativo y temporal; Arkiv es la capa de prueba y auditoria.

---

## 17. Proxima tarea inmediata

La primera tarea concreta deberia ser:

```bash
cd backend
npm install better-sqlite3
npm install -D @types/better-sqlite3
mkdir data db db/migrations src src/repositories src/repositories/sqlite src/repositories/directus uploads
```

Luego crear:

```text
db/migrations/001_initial.sql
db/seed.ts
src/repositories/ports.ts
src/repositories/sqlite/db.ts
src/repositories/directus/README.md
```

Despues confirmar que:

1. `arkiv-hello.ts` crea una entidad en Braga.
2. SQLite puede cargar datos iniciales.
3. Un caso de uso puede crear un trabajo local y publicar `job_created` en Arkiv.

Si eso funciona, el proyecto ya tiene la base tecnica mas importante para competir y no queda bloqueado por Directus.
