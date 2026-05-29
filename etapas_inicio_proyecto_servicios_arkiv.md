# Etapas para iniciar el proyecto: Servicios Verificables con IA + Arkiv

## 1. Contexto del proyecto

**Nombre provisional:** Servicios Verificables  
**Tipo de producto:** marketplace local de servicios entre personas  
**Caso de uso principal:** contratación de oficios y servicios con evidencia verificable del trabajo realizado.  
**Track de competencia:** datos verificables + IA usando Arkiv.

La propuesta no debe ser solamente un marketplace de servicios. El diferencial competitivo es que cada trabajo tenga un historial verificable: solicitud, aceptación, avance, evidencia, análisis de IA y cierre. Ese historial debe poder auditarse, consultarse y demostrar que no fue alterado silenciosamente.

---

## 2. Lineamientos de la competencia

La competencia pide construir un prototipo donde importen los datos confiables y verificables. El proyecto debe cumplir estos puntos:

1. **Datos verificables + IA**  
   La app debe leer o escribir datos confiables y usar IA con un caso de uso claro.

2. **Arkiv como parte central del flujo**  
   Arkiv no debe aparecer solo como una integración decorativa al final. Debe estar integrado en el proceso principal del producto.

3. **Dato no editable a escondidas**  
   El usuario o jurado debe poder entender por qué un dato guardado en Arkiv tiene más valor que un dato guardado solamente en una base tradicional.

4. **Uso de entidades consultables**  
   Las entidades de Arkiv deben tener `payload`, `contentType`, `attributes`, `entityKey` y vencimiento cuando aplique.

5. **Uso de Braga durante el hackathon**  
   La red indicada para trabajar es Braga, la testnet actual de Arkiv.

6. **Prototipo Web3 + IA con caso de uso claro**  
   La IA no debe ser genérica. Debe ayudar a validar, resumir, clasificar o buscar evidencia de servicios reales.

---

## 3. Idea central adaptada al track Arkiv

El proyecto debe presentarse así:

> Plataforma de servicios donde cada trabajo genera evidencia verificable: fotos, estados, validaciones de IA y cierre del servicio. Arkiv funciona como capa de datos confiables para demostrar quién creó cada evidencia, cuándo se publicó y qué atributos tiene.

Esto convierte el proyecto en algo más fuerte que un simple “Uber de oficios”. La propuesta pasa a ser:

> Historial verificable de trabajo y reputación portable para prestadores de servicios.

---

## 4. Alcance recomendado para el MVP

### Incluir en el MVP

- Catálogo de servicios.
- Perfiles demo de prestadores.
- Creación simulada de solicitud de trabajo.
- Estados del trabajo: `requested`, `accepted`, `in_progress`, `evidence_uploaded`, `ai_reviewed`, `completed`.
- Subida de evidencia visual.
- Registro de evidencia en Directus.
- Publicación de eventos importantes en Arkiv.
- Lectura de entidad Arkiv desde la app.
- Consulta por atributos usando `arkiv_query`.
- Análisis de IA sobre la evidencia.
- Resumen del trabajo generado por IA.
- Vista de historial verificable del trabajo.
- Panel demo para cliente, prestador y administrador.

### No incluir todavía

- Pagos reales.
- Stellar real.
- Escrow real.
- Wallet real para cada usuario final.
- Matching inteligente complejo.
- Login productivo.
- Sistema completo de disputas.
- Blockchain para absolutamente todo.

---

## 5. Arquitectura inicial recomendada

```text
Frontend React / Vite / Tailwind
        |
        | lectura pública de entidades
        v
Arkiv PublicClient -------------------- Braga Testnet
        ^                                   |
        |                                   |
API Route / Script Node con WalletClient ----
        |
        v
Directus + SQLite
        |
        v
Media uploads / evidencia visual
```

### Responsabilidad de cada parte

| Componente | Responsabilidad |
|---|---|
| React | Interfaz de usuario y demo navegable |
| Directus + SQLite | Datos operativos rápidos del MVP |
| Directus Media | Guardado de imágenes para demo |
| Arkiv | Evidencia verificable, auditoría y datos consultables |
| IA multimodal | Validación, clasificación y resumen de evidencia |
| API Route o Script Node | Escritura segura en Arkiv usando `PRIVATE_KEY` |

---

## 6. Modelo de datos operativo en Directus

Estas colecciones sirven para construir rápido el MVP.

### `users_demo`

Usuarios precargados.

Campos recomendados:

- `id`
- `name`
- `role`: `client`, `provider`, `admin`
- `avatar`
- `city`
- `rating`

### `services`

Catálogo de servicios.

Campos recomendados:

- `id`
- `name`
- `category`
- `description`
- `base_price`
- `icon`

Ejemplos:

- Jardinería
- Plomería
- Electricidad
- Limpieza
- Reparaciones
- Mantenimiento general

### `provider_profiles`

Perfil del prestador.

Campos recomendados:

- `id`
- `user_id`
- `bio`
- `service_categories`
- `experience_years`
- `verified_jobs_count`
- `rating_average`

### `jobs`

Solicitud y seguimiento de trabajos.

Campos recomendados:

- `id`
- `client_id`
- `provider_id`
- `service_id`
- `title`
- `description`
- `status`
- `address_area`
- `scheduled_date`
- `created_at`
- `arkiv_entity_key_created`
- `arkiv_tx_hash_created`

### `job_evidence`

Evidencia visual o documental.

Campos recomendados:

- `id`
- `job_id`
- `uploaded_by`
- `type`: `before`, `progress`, `after`, `receipt`, `issue`
- `file`
- `description`
- `sha256_hash`
- `ai_summary`
- `ai_status`: `pending`, `valid`, `warning`, `rejected`
- `arkiv_entity_key`
- `arkiv_tx_hash`
- `created_at`

### `reviews`

Calificaciones del trabajo.

Campos recomendados:

- `id`
- `job_id`
- `client_id`
- `provider_id`
- `rating`
- `comment`
- `arkiv_entity_key`
- `created_at`

---

## 7. Modelo de entidades en Arkiv

Arkiv debe guardar los eventos importantes del ciclo de vida del trabajo.

### Entidad 1: `job_created`

Se crea cuando el cliente solicita un trabajo.

#### Payload sugerido

```json
{
  "eventType": "job_created",
  "jobId": "job_001",
  "serviceType": "plomería",
  "clientId": "client_demo_001",
  "providerId": "provider_demo_003",
  "description": "Reparación de pérdida de agua debajo de la cocina",
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
  { "key": "serviceType", "value": "plomería" },
  { "key": "status", "value": "requested" }
]
```

---

### Entidad 2: `evidence_uploaded`

Se crea cuando el prestador sube evidencia.

#### Payload sugerido

```json
{
  "eventType": "evidence_uploaded",
  "jobId": "job_001",
  "evidenceId": "evidence_001",
  "evidenceType": "after",
  "fileUrl": "https://demo.directus.app/assets/example.jpg",
  "sha256Hash": "HASH_DE_LA_IMAGEN",
  "uploadedBy": "provider_demo_003",
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
  { "key": "serviceType", "value": "plomería" }
]
```

---

### Entidad 3: `ai_review_generated`

Se crea cuando la IA analiza la evidencia.

#### Payload sugerido

```json
{
  "eventType": "ai_review_generated",
  "jobId": "job_001",
  "evidenceId": "evidence_001",
  "model": "multimodal-ai-demo",
  "summary": "La imagen parece mostrar una reparación terminada en la zona inferior de una cocina. No se observan pérdidas visibles.",
  "classification": "work_completed",
  "confidence": 0.82,
  "warnings": [],
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
  { "key": "serviceType", "value": "plomería" }
]
```

---

### Entidad 4: `job_completed`

Se crea al cerrar el trabajo.

#### Payload sugerido

```json
{
  "eventType": "job_completed",
  "jobId": "job_001",
  "clientId": "client_demo_001",
  "providerId": "provider_demo_003",
  "finalStatus": "completed",
  "rating": 5,
  "review": "Trabajo terminado correctamente y con evidencia clara.",
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
  { "key": "providerId", "value": "provider_demo_003" },
  { "key": "status", "value": "completed" }
]
```

---

## 8. Etapas de inicio del proyecto

## Etapa 0: Definir el demo y el mensaje del pitch

### Objetivo

Alinear el producto con la consigna de la competencia antes de programar.

### Tareas

- Definir el nombre del proyecto.
- Definir el problema: falta de confianza en servicios entre particulares.
- Definir el diferencial: evidencia verificable + IA.
- Definir el flujo principal de demo.
- Elegir 2 o 3 servicios para mostrar: plomería, jardinería y electricidad.
- Decidir qué datos van a Arkiv.

### Entregable

Una frase clara de pitch:

> Ayudamos a clientes y prestadores a construir confianza mediante evidencia de trabajo verificable en Arkiv y análisis de IA sobre fotos del servicio.

### Criterio de aceptación

Cualquier jurado debe poder entender en menos de un minuto:

- qué problema resuelve;
- por qué la IA importa;
- por qué Arkiv es necesario;
- qué dato no puede ser editado silenciosamente.

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

Inicializar Node:

```bash
npm init -y
npm pkg set type=module
```

Instalar dependencias base de Arkiv:

```bash
npm install @arkiv-network/sdk dotenv typescript tsx
```

Crear `.env`:

```env
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI
```

Crear `.gitignore`:

```gitignore
.env
node_modules/
dist/
```

### Entregable

Repositorio con:

```text
servicios-verificables-arkiv/
├── package.json
├── .env
├── .gitignore
├── src/
└── scripts/
```

### Criterio de aceptación

El proyecto instala dependencias sin errores y la clave privada no queda versionada.

---

## Etapa 2: Configurar wallet, faucet y red Braga

### Objetivo

Poder crear entidades reales en Arkiv usando Braga.

### Parámetros de Braga

| Parámetro | Valor |
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

### Criterio de aceptación

Se puede ejecutar un script `hello.ts` que cree una entidad y devuelva:

- `entityKey`
- `txHash`

---

## Etapa 3: Crear prueba mínima de Arkiv

### Objetivo

Validar creación y lectura de entidades antes de integrar la app.

### Tareas

Crear archivo:

```text
scripts/arkiv-hello.ts
```

Contenido base:

```ts
import { createWalletClient, createPublicClient, http } from "@arkiv-network/sdk";
import { stringToPayload } from "@arkiv-network/sdk/utils";
import { braga } from "@arkiv-network/sdk/chains";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { config } from "dotenv";

config();

const privateKey = process.env.PRIVATE_KEY as `0x${string}`;

if (!privateKey) {
  throw new Error("Falta PRIVATE_KEY en .env");
}

const account = privateKeyToAccount(privateKey);

const walletClient = createWalletClient({
  chain: braga,
  transport: http(),
  account,
});

const publicClient = createPublicClient({
  chain: braga,
  transport: http(),
});

const { entityKey, txHash } = await walletClient.createEntity({
  payload: stringToPayload("Servicios Verificables + Arkiv"),
  contentType: "text/plain",
  attributes: [
    { key: "app", value: "servicios-verificables" },
    { key: "track", value: "arkiv" },
    { key: "entityType", value: "hello_world" },
  ],
  expiresIn: 86400,
});

console.log("Entidad creada:", entityKey);
console.log("Tx:", txHash);

const entity = await publicClient.getEntity(entityKey);
console.log("Contenido:", entity.toText());
```

Ejecutar:

```bash
npx tsx scripts/arkiv-hello.ts
```

### Entregable

Primera entidad creada y legible desde Arkiv.

### Criterio de aceptación

El equipo puede mostrar el `entityKey` y el `txHash` en la demo.

---

## Etapa 4: Levantar Directus + SQLite

### Objetivo

Tener backend operativo rápido para datos de app y demo.

### Tareas

- Crear proyecto Directus.
- Configurar SQLite para velocidad de desarrollo.
- Crear colecciones principales:
  - `users_demo`
  - `services`
  - `provider_profiles`
  - `jobs`
  - `job_evidence`
  - `reviews`
- Cargar datos iniciales.
- Habilitar subida de archivos.

### Entregable

Directus funcionando con datos precargados.

### Criterio de aceptación

Desde el frontend o API se pueden listar:

- servicios;
- prestadores;
- trabajos;
- evidencias.

---

## Etapa 5: Diseñar el flujo principal de usuario

### Objetivo

Construir una experiencia simple y demostrable.

### Flujo del cliente

```text
Ver servicios
→ elegir prestador
→ solicitar trabajo
→ ver estado
→ revisar evidencia
→ aprobar finalización
→ dejar reseña
```

### Flujo del prestador

```text
Ver solicitud
→ aceptar trabajo
→ marcar avance
→ subir evidencia
→ solicitar aprobación
```

### Flujo de verificación

```text
Trabajo creado
→ entidad job_created en Arkiv
→ evidencia subida
→ entidad evidence_uploaded en Arkiv
→ IA analiza evidencia
→ entidad ai_review_generated en Arkiv
→ trabajo finalizado
→ entidad job_completed en Arkiv
```

### Entregable

Mapa de pantallas y estados.

### Criterio de aceptación

La demo se entiende sin explicar la base de datos ni el código.

---

## Etapa 6: Crear frontend navegable

### Objetivo

Tener una demo visual completa.

### Pantallas mínimas

1. **Home**
   - Explica el valor de evidencia verificable.
   - Botón para buscar servicios.

2. **Listado de servicios**
   - Categorías y filtros simples.

3. **Perfil del prestador**
   - Rating.
   - Historial de trabajos.
   - Evidencia anterior.
   - Indicador de reputación verificable.

4. **Detalle del trabajo**
   - Estado actual.
   - Timeline.
   - Evidencias.
   - Resumen IA.
   - Enlaces a Arkiv.

5. **Panel prestador**
   - Trabajos asignados.
   - Botón para subir evidencia.
   - Botón para marcar avance.

6. **Panel admin demo**
   - Lista de trabajos.
   - Estado de verificación.
   - Alertas de IA.
   - Entity keys.

### Entregable

Frontend con navegación completa.

### Criterio de aceptación

El jurado puede recorrer el caso de uso de punta a punta.

---

## Etapa 7: Integrar escritura real en Arkiv

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

Cada función debe:

1. Recibir datos desde Directus o desde la acción del usuario.
2. Construir un payload JSON.
3. Definir atributos consultables.
4. Crear entidad con `WalletClient.createEntity`.
5. Guardar `entityKey` y `txHash` de vuelta en Directus.

### Importante

Nunca exponer `PRIVATE_KEY` en el navegador.

Las escrituras deben correr en:

- script Node local;
- backend propio;
- API route;
- función server-side.

### Entregable

Eventos reales guardados en Arkiv.

### Criterio de aceptación

Al crear o actualizar un trabajo, la app muestra:

- `entityKey`;
- `txHash`;
- link al explorer;
- estado de verificación.

---

## Etapa 8: Integrar lectura y consulta desde Arkiv

### Objetivo

Mostrar que los datos pueden leerse y consultarse como capa verificable.

### Tareas

- Crear cliente público de Arkiv.
- Leer una entidad por `entityKey`.
- Mostrar payload en pantalla.
- Consultar entidades por atributos.
- Mostrar historial verificable del trabajo.

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

### Criterio de aceptación

Se puede consultar todo el historial de un trabajo usando atributos.

---

## Etapa 9: Integrar IA sobre evidencia

### Objetivo

Usar IA para aportar valor real al flujo de confianza.

### Casos de uso recomendados

1. **Resumen automático**
   - La IA describe qué se ve en la evidencia.

2. **Clasificación contextual**
   - La IA clasifica si la imagen parece `before`, `progress` o `after`.

3. **Validación básica**
   - La IA indica si la imagen parece coherente con el servicio.

4. **Advertencias**
   - Imagen borrosa.
   - Imagen irrelevante.
   - Posible duplicado.
   - No se observa el trabajo descrito.

5. **Resumen final del trabajo**
   - La IA genera una explicación breve del historial completo.

### Resultado esperado de IA

```json
{
  "summary": "La imagen muestra una reparación terminada en una zona de cocina.",
  "classification": "after",
  "matchesServiceType": true,
  "confidence": 0.82,
  "warnings": []
}
```

### Integración con Arkiv

El resultado de IA debe guardarse como una entidad `ai_review_generated`.

### Entregable

Evidencia con análisis de IA verificable.

### Criterio de aceptación

La demo muestra una foto, el análisis IA y el `entityKey` del análisis guardado en Arkiv.

---

## Etapa 10: Preparar datos demo

### Objetivo

Evitar depender de datos improvisados durante la presentación.

### Datos mínimos

- 3 clientes demo.
- 5 prestadores demo.
- 6 servicios.
- 4 trabajos de ejemplo.
- 8 evidencias visuales.
- 4 análisis IA ya generados.
- 4 entidades Arkiv creadas previamente.

### Trabajos sugeridos

| Trabajo | Servicio | Estado | Evidencia | IA |
|---|---|---|---|---|
| Pérdida bajo cocina | Plomería | Completado | Antes/después | Válida |
| Corte de césped | Jardinería | Completado | Antes/después | Válida |
| Cambio de toma | Electricidad | En progreso | Progreso | Advertencia |
| Limpieza profunda | Limpieza | Completado | Después | Válida |

### Entregable

Seed data lista para demo.

### Criterio de aceptación

Aunque falle una integración en vivo, la demo puede mostrarse con datos prearmados.

---

## Etapa 11: Armar el guion de presentación

### Objetivo

Contar el producto en forma clara, no solo mostrar pantallas.

### Guion sugerido

1. **Problema**
   - En servicios entre particulares hay poca confianza.
   - Las reseñas pueden ser manipulables o incompletas.
   - Las fotos pueden perder contexto.

2. **Solución**
   - Cada trabajo genera un historial verificable.
   - La evidencia queda asociada a eventos publicados en Arkiv.
   - La IA ayuda a interpretar y validar esa evidencia.

3. **Demo**
   - Cliente solicita trabajo.
   - Prestador sube evidencia.
   - IA analiza evidencia.
   - Arkiv guarda el evento verificable.
   - Cliente ve historial y aprueba.

4. **Por qué Arkiv**
   - Permite publicar entidades consultables.
   - Evita cambios silenciosos.
   - Permite verificar quién creó datos y cuándo.
   - Permite buscar por atributos como una base de datos.

5. **Futuro**
   - Reputación portable.
   - Escrow.
   - Pagos por hitos.
   - Disputas con evidencia verificable.
   - Integración futura con Stellar.

### Entregable

Pitch de 3 a 5 minutos.

### Criterio de aceptación

La presentación responde de forma directa:

- qué hace la app;
- qué dato se verifica;
- cómo participa la IA;
- cómo participa Arkiv;
- por qué esto no sería igual con una base centralizada común.

---

## 9. Checklist técnico para competencia

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
- [ ] Explicar por qué Arkiv es central al flujo.

### IA

- [ ] Analizar evidencia visual.
- [ ] Generar resumen del trabajo.
- [ ] Clasificar evidencia.
- [ ] Detectar advertencias básicas.
- [ ] Guardar resultado de IA en Arkiv.
- [ ] Mostrar análisis IA en pantalla.

### Producto

- [ ] Home clara.
- [ ] Flujo cliente completo.
- [ ] Flujo prestador completo.
- [ ] Timeline de trabajo.
- [ ] Evidencia antes/después.
- [ ] Reputación del prestador.
- [ ] Panel admin demo.
- [ ] Datos precargados.

### Presentación

- [ ] Problema claro.
- [ ] Caso de uso real.
- [ ] Demo sin pasos innecesarios.
- [ ] Explicación simple de Arkiv.
- [ ] Explicación simple de IA.
- [ ] Cierre con roadmap.

---

## 10. Orden recomendado de trabajo para el hackathon

## Bloque 1: Base técnica

1. Crear repo.
2. Instalar SDK Arkiv.
3. Configurar `.env`.
4. Conseguir GLM en faucet.
5. Ejecutar `arkiv-hello.ts`.
6. Confirmar entidad en explorer.

## Bloque 2: Backend rápido

1. Levantar Directus.
2. Crear colecciones.
3. Cargar servicios y usuarios demo.
4. Habilitar media uploads.
5. Crear trabajos demo.

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

1. Al crear trabajo, crear entidad `job_created`.
2. Al subir evidencia, crear entidad `evidence_uploaded`.
3. Al analizar con IA, crear entidad `ai_review_generated`.
4. Al finalizar, crear entidad `job_completed`.
5. Mostrar `entityKey` y `txHash`.

## Bloque 5: IA

1. Enviar imagen a modelo multimodal.
2. Recibir resumen.
3. Recibir clasificación.
4. Recibir advertencias.
5. Guardar respuesta en Directus.
6. Publicar respuesta en Arkiv.

## Bloque 6: Pulido final

1. Mejorar textos.
2. Agregar badges de verificación.
3. Preparar pitch.
4. Probar demo completa.
5. Tener capturas o datos fallback.
6. Ensayar presentación.

---

## 11. Definición de éxito del MVP

El MVP está listo cuando se puede demostrar este flujo:

```text
Cliente crea trabajo
→ se crea entidad en Arkiv
→ prestador sube evidencia
→ se crea entidad de evidencia en Arkiv
→ IA analiza la evidencia
→ se crea entidad de análisis IA en Arkiv
→ cliente ve historial verificable
→ trabajo se completa
→ se crea entidad final en Arkiv
```

El punto más importante para la competencia es que Arkiv no sea un agregado cosmético. Debe ser el registro verificable del historial de confianza del servicio.

---

## 12. Riesgos y decisiones para no perder tiempo

### Riesgo 1: querer hacer pagos reales

**Decisión:** dejar pagos y escrow fuera del MVP.

### Riesgo 2: hacer login real

**Decisión:** usar usuarios demo precargados.

### Riesgo 3: guardar demasiada información en Arkiv

**Decisión:** guardar solo eventos importantes y evidencia verificable.

### Riesgo 4: que la IA sea superficial

**Decisión:** hacer que la IA analice evidencia del trabajo y guarde su resultado verificable.

### Riesgo 5: que Directus parezca más importante que Arkiv

**Decisión:** Directus es operativo; Arkiv es la capa de prueba y auditoría.

---

## 13. Próxima tarea inmediata

La primera tarea concreta debería ser:

```bash
mkdir servicios-verificables-arkiv
cd servicios-verificables-arkiv
npm init -y
npm pkg set type=module
npm install @arkiv-network/sdk dotenv typescript tsx
```

Luego crear:

```text
scripts/arkiv-hello.ts
```

y confirmar que se puede crear una entidad en Braga.

Si eso funciona, el proyecto ya tiene la base técnica más importante para competir.
