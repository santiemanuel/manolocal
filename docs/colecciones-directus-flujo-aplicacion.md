# Colecciones Directus para completar el flujo de la aplicación

Este documento baja a tierra que colecciones hay que crear en Directus para cubrir el flujo completo del MVP: cliente solicita un trabajo, prestador acepta y sube evidencia, IA revisa, Arkiv publica eventos verificables, cliente cierra y deja reseña.

Directus debe ser la base operativa editable. Arkiv debe seguir siendo la capa verificable: `entityKey`, `txHash`, payload y atributos publicados.

## Decisión de nombres

Usar los mismos modelos que el SQLite actual, pero con sufijo `_ml` en Directus para distinguir estas colecciones de otras colecciones del proyecto o de una instancia compartida. El adapter `Directus*Repository` debe mapear estos nombres físicos contra los tipos de dominio existentes sin cambiar los casos de uso:

- `users_ml`
- `services_ml`
- `provider_profiles_ml`
- `jobs_ml`
- `job_evidence_ml`
- `reviews_ml`
- `arkiv_events_ml`

Nota: `users_ml` es una colección demo de la app, no reemplaza `directus_users`.

## Resumen del modelo

| Coleccion | Para que existe | Obligatoria para MVP |
| --- | --- | --- |
| `users_ml` | Clientes, prestadores y admin demo | Sí |
| `services_ml` | Catálogo de servicios ofrecidos | Sí |
| `provider_profiles_ml` | Perfil público del prestador | Sí |
| `jobs_ml` | Solicitud, estado y cierre del trabajo | Sí |
| `job_evidence_ml` | Archivos, hash, metadata e IA de evidencia | Sí |
| `reviews_ml` | Calificacion final del trabajo | Sí |
| `arkiv_events_ml` | Bitácora local de publicaciones en Arkiv | Sí |

## 1. `users_ml`

Usuarios demo de la aplicación. No usar está colección para login productivo todavía.

Campos:

| Campo | Tipo Directus | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | Sí | Manual. Ej: `client_001`, `provider_001`, `admin_001`. |
| `name` | string | Sí | Nombre visible. |
| `role` | string select | Sí | Valores: `client`, `provider`, `admin`. |
| `avatar_url` | string | No | URL externa o asset si se decide usar media. |
| `city` | string | No | Ciudad o zona. |
| `rating` | decimal | Sí | Default `0`. Rating operativo visible. |

Relaciones:

- `jobs_ml.client_id` -> `users_ml.id`
- `jobs_ml.provider_id` -> `users_ml.id`
- `job_evidence_ml.uploaded_by` -> `users_ml.id`
- `reviews_ml.client_id` -> `users_ml.id`
- `reviews_ml.provider_id` -> `users_ml.id`

## 2. `services_ml`

Catálogo de servicios que el cliente puede contratar.

Campos:

| Campo | Tipo Directus | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | Sí | Manual. Ej: `service_plumbing`. |
| `name` | string | Sí | Ej: `Plomería`. |
| `category` | string | Sí | Ej: `hogar`, `mantenimiento`, `limpieza`. |
| `description` | text | No | Texto corto para listado. |
| `base_price` | integer | No | Precio base estimado. |
| `icon` | string | No | Nombre de icono usado por frontend. |

Relaciones:

- `jobs_ml.service_id` -> `services_ml.id`

Datos minimos recomendados:

- Plomería
- Jardinería
- Electricidad
- Limpieza
- Reparaciones
- Mantenimiento general

## 3. `provider_profiles_ml`

Perfil público de cada prestador.

Campos:

| Campo | Tipo Directus | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | Sí | Manual. Ej: `profile_provider_001`. |
| `user_id` | many-to-one -> `users_ml.id` | Sí | Debe apuntar a un usuario con `role = provider`. |
| `bio` | text | No | Presentacion breve. |
| `service_categories` | json | Sí | Array de strings. Ej: `["plomería", "reparaciones"]`. |
| `experience_years` | integer | Sí | Default `0`. |
| `verified_jobs_count` | integer | Sí | Default `0`. Se puede recalcular luego. |
| `rating_average` | decimal | Sí | Default `0`. Se puede recalcular luego. |

Relacion:

- `provider_profiles_ml.user_id` -> `users_ml.id`

Regla de demo:

- El frontend puede listar prestadores filtrando `service_categories` por la categoría del servicio elegido.

## 4. `jobs_ml`

Registro principal del trabajo. Esta colección gobierna el estado operativo del flujo.

Campos:

| Campo | Tipo Directus | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | Sí | Manual o generado por backend. Ej: `job_001`. |
| `client_id` | many-to-one -> `users_ml.id` | Sí | Usuario cliente. |
| `provider_id` | many-to-one -> `users_ml.id` | No | Prestador asignado. |
| `service_id` | many-to-one -> `services_ml.id` | Sí | Servicio contratado. |
| `title` | string | Sí | Ej: `Pérdida bajo cocina`. |
| `description` | text | Sí | Descripción del problema o trabajo. |
| `status` | string select | Sí | Ver estados permitidos abajo. |
| `address_area` | string | No | Zona aproximada, no dirección sensible. |
| `scheduled_date` | datetime | No | Fecha pactada. |
| `created_at` | datetime | Sí | Usar fecha de creacion. |
| `updated_at` | datetime | Sí | Actualizar en cada cambio. |
| `arkiv_entity_key_created` | string | No | Entity key de `job_created`. |
| `arkiv_tx_hash_created` | string | No | Tx hash de `job_created`. |

Valores de `status`:

- `requested`
- `accepted`
- `in_progress`
- `evidence_uploaded`
- `ai_reviewed`
- `completed`

Transiciones esperadas:

| Acción | Estado nuevo | Evento Arkiv |
| --- | --- | --- |
| Cliente crea solicitud | `requested` | `job_created` |
| Prestador acepta | `accepted` | Opcional para MVP |
| Prestador marca avance | `in_progress` | Opcional para MVP |
| Prestador sube evidencia | `evidence_uploaded` | `evidence_uploaded` |
| Sistema guarda revisión IA | `ai_reviewed` | `ai_review_generated` |
| Cliente aprueba cierre | `completed` | `job_completed` |

## 5. `job_evidence_ml`

Metadata de evidencias visuales o documentales. El archivo real debe guardarse en Directus Files.

Campos:

| Campo | Tipo Directus | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | Sí | Manual o generado por backend. Ej: `evidence_001`. |
| `job_id` | many-to-one -> `jobs_ml.id` | Sí | Trabajo asociado. |
| `uploaded_by` | many-to-one -> `users_ml.id` | Sí | Normalmente prestador. |
| `type` | string select | Sí | Valores: `before`, `progress`, `after`, `receipt`, `issue`. |
| `file` | file -> `directus_files.id` | Sí | Archivo subido a Directus Media Library. |
| `local_file_path` | string | No | Solo para compatibilidad con SQLite/local. |
| `public_file_url` | string | No | URL pública o generada desde Directus. |
| `description` | text | No | Descripción escrita por el prestador. |
| `sha256_hash` | string | Sí | Hash del archivo para verificar que no cambió. |
| `ai_summary` | text | No | Resumen generado por IA. |
| `ai_status` | string select | Sí | Valores: `pending`, `valid`, `warning`, `rejected`. Default `pending`. |
| `ai_classification` | string | No | Ej: `before`, `progress`, `after`, `work_completed`. |
| `ai_confidence` | decimal | No | Ej: `0.82`. |
| `ai_warnings` | json | No | Array de advertencias. Ej: `["imagen_borrosa"]`. |
| `arkiv_entity_key` | string | No | Entity key de `evidence_uploaded`. |
| `arkiv_tx_hash` | string | No | Tx hash de `evidence_uploaded`. |
| `created_at` | datetime | Sí | Fecha de carga. |

Notas de implementación:

- `file` es el campo Directus correcto para reemplazar `uploads/`.
- `sha256_hash` debe calcularse antes o durante la subida.
- Para el MVP actual, el adapter puede poblar `publicFileUrl` usando la URL de asset de Directus.
- Los campos `ai_classification`, `ai_confidence` y `ai_warnings` no existen en SQLite inicial, pero completan el flujo de IA definido en el plan. Sí se quiere mantener paridad estricta, pueden omitirse y guardar todo en `ai_summary`.

## 6. `reviews_ml`

Reseña final del cliente una vez completado el trabajo.

Campos:

| Campo | Tipo Directus | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | Sí | Manual o generado por backend. Ej: `review_001`. |
| `job_id` | many-to-one -> `jobs_ml.id` | Sí | Trabajo cerrado. |
| `client_id` | many-to-one -> `users_ml.id` | Sí | Cliente que evalúa. |
| `provider_id` | many-to-one -> `users_ml.id` | Sí | Prestador evaluado. |
| `rating` | integer | Sí | Rango `1` a `5`. |
| `comment` | text | No | Comentario visible. |
| `arkiv_entity_key` | string | No | Si se decide publicar reseña o cierre en Arkiv. |
| `arkiv_tx_hash` | string | No | Tx hash asociado. |
| `created_at` | datetime | Sí | Fecha de reseña. |

Regla de flujo:

- Crear `reviews_ml` durante el cierre del trabajo.
- Publicar `job_completed` en Arkiv con rating y comentario resumido si existe.

## 7. `arkiv_events_ml`

Bitácora operativa de todo lo publicado en Arkiv. Es clave para el panel admin/jurado.

Campos:

| Campo | Tipo Directus | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | Sí | Manual o generado por backend. Ej: `arkiv_001`. |
| `local_subject_type` | string | Sí | Ej: `job`, `evidence`, `review`. Es tipo semantico, no nombre de colección. |
| `local_subject_id` | string | Sí | ID local relacionado. |
| `event_type` | string select | Sí | Ver eventos permitidos abajo. |
| `entity_key` | string | Sí | Entity key devuelta por Arkiv. |
| `tx_hash` | string | Sí | Tx hash devuelto por Arkiv. |
| `payload_json` | json | Sí | Payload publicado. |
| `attributes_json` | json | Sí | Attributes publicados. |
| `created_at` | datetime | Sí | Fecha local de registro. |

Valores de `event_type`:

- `job_created`
- `evidence_uploaded`
- `ai_review_generated`
- `job_completed`

Regla importante:

- Esta colección no reemplaza a Arkiv. Solo guarda referencias locales para reconstruir timeline, depurar fallos y mostrar links rápidamente.

## Relaciones a crear en Directus

| Desde | Hacia | Tipo |
| --- | --- | --- |
| `provider_profiles_ml.user_id` | `users_ml.id` | many-to-one |
| `jobs_ml.client_id` | `users_ml.id` | many-to-one |
| `jobs_ml.provider_id` | `users_ml.id` | many-to-one |
| `jobs_ml.service_id` | `services_ml.id` | many-to-one |
| `job_evidence_ml.job_id` | `jobs_ml.id` | many-to-one |
| `job_evidence_ml.uploaded_by` | `users_ml.id` | many-to-one |
| `job_evidence_ml.file` | `directus_files.id` | many-to-one/file |
| `reviews_ml.job_id` | `jobs_ml.id` | many-to-one |
| `reviews_ml.client_id` | `users_ml.id` | many-to-one |
| `reviews_ml.provider_id` | `users_ml.id` | many-to-one |

## Indices recomendados

Crear indices para consultas frecuentes:

- `users_ml.role`
- `provider_profiles_ml.user_id`
- `jobs_ml.status`
- `jobs_ml.client_id`
- `jobs_ml.provider_id`
- `jobs_ml.service_id`
- `job_evidence_ml.job_id`
- `job_evidence_ml.ai_status`
- `reviews_ml.job_id`
- `arkiv_events_ml.local_subject_type + arkiv_events_ml.local_subject_id`
- `arkiv_events_ml.event_type`
- `arkiv_events_ml.entity_key`

## Permisos minimos para demo

Para demo sin login productivo:

| Rol Directus | Permisos |
| --- | --- |
| Public | Leer `services_ml`, `provider_profiles_ml`, `users_ml` filtrados a datos demo seguros. |
| Backend/API token | CRUD completo sobre colecciones de la app y lectura/escritura de archivos. |
| Admin | CRUD completo para preparar datos demo. |

Recomendacion:

- Las escrituras desde frontend deben pasar por backend propio o API route.
- La `PRIVATE_KEY` de Arkiv nunca debe estar en Directus ni en el navegador.
- El backend escribe en Directus y luego publica en Arkiv.

## Orden de creacion en Directus

1. Habilitar Media Library para evidencias.
2. Crear `users_ml`.
3. Crear `services_ml`.
4. Crear `provider_profiles_ml` y relacionarla con `users_ml`.
5. Crear `jobs_ml` y relacionarla con `users_ml` y `services_ml`.
6. Crear `job_evidence_ml` y relacionarla con `jobs_ml`, `users_ml` y `directus_files`.
7. Crear `reviews_ml` y relacionarla con `jobs_ml` y `users_ml`.
8. Crear `arkiv_events_ml`.
9. Cargar seed data demo.
10. Crear token/API role para el backend.

## Datos demo minimos

Para que el flujo completo se pueda mostrar:

- 3 usuarios cliente.
- 5 usuarios prestador.
- 1 usuario admin.
- 6 servicios.
- 5 perfiles de prestador.
- 4 trabajos.
- 8 evidencias.
- 4 resenas.
- Al menos 4 eventos Arkiv reales o prearmados para fallback.

## Mapeo con repositorios del backend

| Puerto backend | Colecciones Directus usadas |
| --- | --- |
| `ServicesRepository.list()` | `services_ml` |
| `ServicesRepository.findById(id)` | `services_ml` |
| `ServicesRepository.listProviderProfiles()` | `provider_profiles_ml` + `users_ml` |
| `JobsRepository.list()` | `jobs_ml` |
| `JobsRepository.findById(id)` | `jobs_ml` |
| `JobsRepository.create(input)` | `jobs_ml` |
| `JobsRepository.updateStatus(id, status)` | `jobs_ml.status`, `jobs_ml.updated_at` |
| `JobsRepository.attachCreatedArkivEvent(id, event)` | `jobs_ml.arkiv_entity_key_created`, `jobs_ml.arkiv_tx_hash_created` |
| `EvidenceRepository.create(input)` | `job_evidence_ml` + `directus_files` |
| `EvidenceRepository.findById(id)` | `job_evidence_ml` |
| `EvidenceRepository.listByJobId(jobId)` | `job_evidence_ml` |
| `EvidenceRepository.attachArkivEvent(id, event)` | `job_evidence_ml.arkiv_entity_key`, `job_evidence_ml.arkiv_tx_hash` |
| `EvidenceRepository.attachAIReview(id, review)` | `job_evidence_ml.ai_summary`, `job_evidence_ml.ai_status` |
| `ArkivEventsRepository.create(input)` | `arkiv_events_ml` |
| `ArkivEventsRepository.list()` | `arkiv_events_ml` |
| `ArkivEventsRepository.listBySubject(type, id)` | `arkiv_events_ml` |

## Checklist de aceptación

- Se pueden listar servicios desde Directus.
- Se pueden listar prestadores con su usuario y categorías.
- Se puede crear un `job` en estado `requested`.
- Se puede guardar `arkiv_entity_key_created` y `arkiv_tx_hash_created` en `jobs_ml`.
- Se puede subir una evidencia a Directus Files y crear `job_evidence_ml`.
- Se puede guardar hash SHA-256 de la evidencia.
- Se puede guardar revisión IA en `job_evidence_ml`.
- Se puede cerrar el trabajo y crear `reviews_ml`.
- Se puede registrar cada publicación Arkiv en `arkiv_events_ml`.
- El panel admin puede reconstruir el timeline local + Arkiv por `job_id`.
