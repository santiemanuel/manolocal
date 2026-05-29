# Etapa 6: Flujo principal de usuario

Este mapa define la experiencia demostrable del MVP antes de construir el frontend. El objetivo es que cliente, prestador y jurado entiendan el recorrido sin tener que conocer SQLite, Arkiv ni el código interno.

## Objetivo de la demo

Mostrar un trabajo de servicio desde la solicitud hasta el cierre, con evidencia local, análisis de IA y eventos verificables publicados en Arkiv.

Caso principal recomendado para la demo:

- Servicio: Plomería.
- Trabajo: Pérdida bajo cocina.
- Cliente: Sofía Ramírez (`client_001`).
- Prestador: Martín Acosta (`provider_001`).
- Estado final esperado: `completed`.

## Roles

| Rol | Necesita ver | Necesita hacer |
| --- | --- | --- |
| Cliente | Servicios, prestadores, estado del trabajo, evidencia, resumen IA, historial verificable | Solicitar trabajo, revisar evidencia, aprobar cierre, dejar reseña |
| Prestador | Solicitudes asignadas, estado, pasos pendientes, evidencias cargadas | Aceptar trabajo, marcar avance, subir evidencia, pedir aprobación |
| Admin/Jurado | Todos los trabajos, estado operativo, eventos Arkiv, entity keys, tx hashes, alertas IA | Auditar el flujo y comparar SQLite vs Arkiv |

## Estados del trabajo

| Estado | Actor que lo dispara | Qué significa para usuario | Evento Arkiv esperado |
| --- | --- | --- | --- |
| `requested` | Cliente | El trabajo fue solicitado y espera confirmación | `job_created` |
| `accepted` | Prestador | El prestador acepto la solicitud | Pendiente para MVP, no obligatorio |
| `in_progress` | Prestador | El trabajo está en ejecución | Pendiente para MVP, no obligatorio |
| `evidence_uploaded` | Prestador | Hay evidencia cargada para revisar | `evidence_uploaded` |
| `ai_reviewed` | Sistema/IA | La evidencia ya tiene análisis de IA | `ai_review_generated` |
| `completed` | Cliente | El trabajo fue aprobado y cerrado | `job_completed` |

## Mapa de pantallas

### 1. Inicio

Propósito: ubicar rápidamente el producto como marketplace de servicios con evidencia verificable.

Contenido visible:

- Servicios destacados: Plomería, Jardinería, Electricidad.
- Acceso directo a buscar servicios.
- Acceso a panel prestador y panel admin para la demo.
- Indicador de que la reputación se basa en trabajos con evidencia.

Acciones:

- Ir a listado de servicios.
- Ir al panel prestador.
- Ir al panel admin.

### 2. Listado de servicios

Propósito: permitir al cliente elegir una categoría de servicio.

Contenido visible:

- Cards o filas de servicios desde `ServicesRepository.list()`.
- Precio base, categoría e icono.
- Filtros simples por categoría.

Acciones:

- Abrir prestadores disponibles para un servicio.

### 3. Perfil del prestador

Propósito: ayudar al cliente a decidir con datos de confianza.

Contenido visible:

- Datos del usuario proveedor desde `ProviderProfile`.
- Rating operativo.
- Trabajos verificados.
- Categorias atendidas.
- Historial resumido de evidencias anteriores.
- Indicador de reputación verificable.

Acciones:

- Solicitar trabajo con este prestador.

### 4. Crear solicitud de trabajo

Propósito: convertir la decisión del cliente en un trabajo operativo.

Contenido visible:

- Servicio seleccionado.
- Prestador seleccionado.
- Título, descripción, zona y fecha.

Acciones:

- Crear trabajo.

Resultado esperado:

1. Se crea un registro en `jobs` con estado `requested`.
2. En etapa 8 se publicará `job_created` en Arkiv.
3. La pantalla redirige al detalle del trabajo.

### 5. Detalle del trabajo

Propósito: ser la pantalla central del flujo.

Contenido visible:

- Título, servicio, cliente, prestador y estado actual.
- Timeline operativo.
- Evidencias cargadas.
- Resumen IA cuando exista.
- Bloque de verificación con `entityKey`, `txHash` y links de Arkiv cuando existan.

Acciones por estado:

| Estado actual | Acción cliente | Acción prestador | Acción sistema |
| --- | --- | --- | --- |
| `requested` | Ver solicitud | Aceptar | Ninguna |
| `accepted` | Ver estado | Marcar en progreso | Ninguna |
| `in_progress` | Ver estado | Subir evidencia | Ninguna |
| `evidence_uploaded` | Revisar evidencia | Esperar revisión | Analizar con IA |
| `ai_reviewed` | Aprobar cierre o pedir correccion | Esperar aprobación | Mostrar resumen IA |
| `completed` | Dejar reseña/ver historial | Ver cierre | Mostrar historial verificable |

### 6. Panel prestador

Propósito: que el prestador avance el trabajo sin entrar en herramientas técnicas.

Contenido visible:

- Trabajos asignados.
- Estado de cada trabajo.
- Proximo paso recomendado.
- Evidencias ya subidas.

Acciones:

- Aceptar trabajo.
- Marcar en progreso.
- Subir evidencia.
- Solicitar aprobación.

### 7. Subir evidencia

Propósito: capturar la prueba visual o documental del trabajo.

Contenido visible:

- Trabajo asociado.
- Tipo de evidencia: `before`, `progress`, `after`, `receipt`, `issue`.
- Archivo local.
- Descripción opcional.

Acciones:

- Guardar evidencia.

Resultado esperado:

1. Archivo guardado en `uploads/`.
2. Metadata guardada en `job_evidence`.
3. Hash SHA-256 calculado.
4. Trabajo pasa a `evidence_uploaded`.
5. En etapa 8 se publicará `evidence_uploaded` en Arkiv.

### 8. Revisión IA

Propósito: convertir evidencia visual en una explicación útil y auditable.

Contenido visible:

- Evidencia seleccionada.
- Resumen generado.
- Clasificacion sugerida.
- Estado: `valid`, `warning` o `rejected`.
- Advertencias, si existen.

Acciones:

- Guardar revisión IA.

Resultado esperado:

1. `job_evidence.ai_summary` se actualiza.
2. `job_evidence.ai_status` se actualiza.
3. Trabajo pasa a `ai_reviewed`.
4. En etapa 8 se publicará `ai_review_generated` en Arkiv.

### 9. Cierre y reseña

Propósito: cerrar el trabajo con aprobación del cliente.

Contenido visible:

- Resumen final del trabajo.
- Evidencias relevantes.
- Resultado IA.
- Historial verificable disponible.

Acciones:

- Aprobar finalizacion.
- Dejar rating y comentario.

Resultado esperado:

1. Trabajo pasa a `completed`.
2. Se crea registro en `reviews`.
3. En etapa 8 se publicará `job_completed` en Arkiv.

### 10. Panel admin / jurado

Propósito: demostrar que Arkiv es parte central del flujo y no un agregado cosmético.

Contenido visible:

- Lista de trabajos.
- Estado local de cada trabajo.
- Cantidad de evidencias.
- Eventos Arkiv asociados.
- `entityKey` y `txHash`.
- Estado IA y alertas.

Acciones:

- Abrir detalle de trabajo.
- Abrir entidad Arkiv.
- Consultar historial por `jobId`.

## Timeline verificable

El detalle del trabajo debe mostrar dos capas en una sola linea temporal:

| Paso | Capa operativa local | Capa verificable Arkiv |
| --- | --- | --- |
| Solicitud creada | `jobs` | `job_created` |
| Evidencia subida | `job_evidence` + `uploads/` | `evidence_uploaded` |
| Revisión IA generada | `job_evidence.ai_summary` + `ai_status` | `ai_review_generated` |
| Trabajo completado | `jobs.status` + `reviews` | `job_completed` |

Regla para la UI: si un evento todavía no tiene `entityKey`, mostrarlo como pendiente de publicación, no como verificado.

## Contratos de datos necesarios para etapa 7

La etapa 7 puede construirse contra estos metodos existentes:

- Servicios: `services.list()`, `services.findById(id)`.
- Prestadores: `services.listProviderProfiles()`.
- Trabajos: `jobs.list()`, `jobs.findById(id)`, `jobs.create(input)`, `jobs.updateStatus(id, status)`.
- Evidencias: `evidence.listByJobId(jobId)`, `evidence.create(input)`, `evidence.attachAIReview(id, review)`.
- Eventos Arkiv locales: `arkivEvents.list()`, `arkivEvents.listBySubject(type, id)`.

## Rutas sugeridas para frontend

| Ruta | Pantalla | Rol principal |
| --- | --- | --- |
| `/` | Inicio | Todos |
| `/services` | Listado de servicios | Cliente |
| `/services/:serviceId/providers` | Prestadores por servicio | Cliente |
| `/providers/:providerId` | Perfil prestador | Cliente |
| `/jobs/new` | Crear solicitud | Cliente |
| `/jobs/:jobId` | Detalle del trabajo | Cliente/Prestador/Admin |
| `/provider` | Panel prestador | Prestador |
| `/provider/jobs/:jobId/evidence/new` | Subir evidencia | Prestador |
| `/admin` | Panel admin | Admin/Jurado |

## Guion de demo recomendado

1. Cliente entra a servicios y elige Plomería.
2. Cliente abre el perfil de Martín Acosta y revisa reputación verificable.
3. Cliente solicita "Pérdida bajo cocina".
4. Prestador acepta, marca avance y sube evidencia `before`/`after`.
5. Sistema calcula hash y muestra evidencia pendiente de verificación.
6. IA resume la evidencia y marca estado `valid`.
7. Cliente aprueba el cierre y deja reseña.
8. Admin abre el historial y muestra eventos Arkiv con `entityKey` y `txHash`.

## Criterios de aceptación de la etapa 6

- El flujo se puede explicar mirando solo las pantallas y estados.
- Cada pantalla tiene rol, propósito, contenido y acción principal.
- El cambio de estados coincide con `JobStatus` en `ports.ts`.
- La evidencia diferencia claramente archivo local, metadata local y evento verificable.
- Arkiv aparece en el timeline principal desde la solicitud, evidencia, IA y cierre.
- La etapa 7 ya tiene rutas sugeridas y contratos de datos para empezar frontend.
