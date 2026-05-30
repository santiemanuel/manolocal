# PRD de integración: evidencia cronológica con Gemini Flash-Lite

## 1. Resumen

Este documento define la integración entre el flujo de carga de evidencias de Mano Local y el análisis visual asistido por Gemini Flash-Lite.

La decisión de producto para esta versión es modelar el camino feliz sin pedirle al proveedor que seleccione manualmente el tipo de evidencia. El tipo se deriva del paso de la interfaz:

- primera carga obligatoria: `before`;
- cargas intermedias opcionales: `progress`;
- carga final: `after`.

El formulario de carga mantiene solo los campos visibles necesarios:

- `Archivo local`;
- `Descripción`.

El backend sigue persistiendo el campo `type` porque forma parte del modelo operativo y de los eventos verificables, pero ese valor no debe quedar a elección libre del proveedor en el camino feliz.

El objetivo es documentar de manera cronológica el estado inicial observado por el proveedor, avances opcionales y el estado final posterior a la intervención. Gemini debe analizar el conjunto completo recién cuando se recibe la evidencia final `after`, para comparar todas las imágenes disponibles en una única consulta.

---

## 2. Contexto del repositorio

El repositorio ya documenta en las etapas del proyecto que Mano Local combina:

- base operativa local en SQLite o Directus;
- evidencias visuales asociadas a trabajos;
- hash SHA-256 de cada evidencia;
- eventos verificables en Arkiv para `job_created`, `evidence_uploaded`, `ai_review_generated` y `job_completed`;
- integración de IA para describir, resumir y clasificar evidencia visual.

Implementación actual relevante:

- API de carga: `POST /api/jobs/:jobId/evidence`.
- API de estado: `POST /api/jobs/:jobId/status`.
- Modelo local: tabla `job_evidence`.
- Modelo Directus: colección `job_evidence_ml`.
- Campos reales de evidencia: `id`, `job_id`, `uploaded_by`, `type`, `local_file_path`, `public_file_url`, `description`, `sha256_hash`, `ai_summary`, `ai_status`, `arkiv_entity_key`, `arkiv_tx_hash`, `created_at`.
- Orden cronológico real: `created_at ASC, id ASC`.
- Estado de trabajo usado tras cargar evidencia: `evidence_uploaded`.
- Estado de trabajo tras análisis exitoso: `ai_reviewed`.
- El modelo configurado en el backend es `gemini-flash-lite-latest`.

No se agrega una tabla nueva para el MVP. El resultado de IA se guarda en `job_evidence.ai_summary` y `job_evidence.ai_status`, asociado a la evidencia `after` que cierra el conjunto.

---

## 3. Objetivo del producto

Permitir que el proveedor documente visualmente un trabajo siguiendo un flujo simple, ordenado y difícil de cargar incorrectamente.

El sistema debe:

1. Obligar que la primera evidencia de un trabajo sea `before`.
2. Permitir `progress` solo después de tener `before`.
3. Permitir cero, una o múltiples evidencias `progress`.
4. Permitir `after` solo después de tener `before`.
5. Tratar `after` como resultado final del trabajo.
6. Ejecutar una única consulta a Gemini cuando se guarda `after`.
7. Enviar a Gemini el conjunto completo de evidencias ordenadas cronológicamente.
8. Tratar la descripción escrita por el proveedor como contexto declarado, no como verdad verificada.
9. Guardar un resumen de análisis visual asistido, sin presentarlo como certificación técnica definitiva.

---

## 4. Alcance de esta versión

### Incluido

- Flujo cronológico `before -> progress opcional -> after`.
- Formulario sin campo visible de tipo.
- Botón inicial para subir estado inicial.
- Botón para subir progreso después de `before`.
- Botón visualmente diferenciado para subir resultado final después de `before`.
- Validación backend del orden de evidencias.
- Persistencia en SQLite o Directus usando el modelo existente.
- Publicación del evento Arkiv `evidence_uploaded` por cada evidencia guardada.
- Consulta única a Gemini al guardar `after`.
- Persistencia del análisis en la evidencia final.
- Publicación del evento Arkiv `ai_review_generated` cuando el análisis se genera correctamente.

### Excluido

- Flujo de disputa.
- Carga de recibos o comprobantes.
- Tipos `receipt` e `issue` en el camino feliz.
- Certificación técnica definitiva de la reparación.
- Detección antifraude avanzada.
- Análisis legal o resolución de conflictos.
- Validación por IA en cada carga individual.
- Reemplazo, eliminación o edición de evidencias ya cargadas.
- Tabla separada `evidence_ai_analysis` para esta iteración.

---

## 5. Principio de diseño central

La evidencia debe seguir una narrativa mínima y cronológica:

```text
before -> progress opcional(es) -> after
```

El proveedor no debe elegir el tipo desde un selector porque el camino feliz ya define qué tipo corresponde en cada momento.

La evidencia `before` representa lo que el proveedor encuentra al iniciar el trabajo. Es la base de comparación para Gemini y para la revisión humana posterior.

La evidencia `after` representa el resultado final. Al recibirla, el sistema debe enviar a Gemini el conjunto completo, no solo la última imagen.

---

## 6. Actores

### Proveedor

Usuario que realiza el trabajo, sube el estado inicial, registra avances opcionales y carga el resultado final.

### Cliente

Usuario que puede consultar la evidencia y el resumen generado según los permisos del producto. Esta especificación no define en detalle la interfaz del cliente.

### Sistema

Frontend y backend encargados de derivar el tipo correcto, validar el orden, almacenar evidencias, preparar el payload para Gemini, persistir el análisis y publicar eventos Arkiv.

### Gemini Flash-Lite

Modelo multimodal utilizado para describir, comparar y emitir un veredicto visual limitado sobre el conjunto de imágenes.

---

## 7. Flujo feliz

### 7.1 Primera evidencia: `before`

Cuando el proveedor entra a un trabajo en estado `in_progress` sin evidencias:

- se muestra un botón para subir la evidencia inicial;
- el formulario no muestra campo `Tipo`;
- el backend recibe y guarda la evidencia como `before`;
- el proveedor carga una imagen del estado inicial y una descripción breve.

Ejemplo de descripción:

```text
Se observa pérdida de agua debajo de la bacha antes de iniciar el trabajo.
```

Al guardar correctamente, el trabajo queda en estado `evidence_uploaded` y se publica `evidence_uploaded` en Arkiv.

### 7.2 Evidencias de progreso: `progress`

Después de existir al menos una evidencia `before` y antes de existir `after`:

- se muestra un botón para subir progreso;
- el formulario no muestra campo `Tipo`;
- el backend guarda esas cargas como `progress`;
- se puede cargar cero, una o múltiples evidencias de progreso.

Ejemplo de descripción:

```text
Se retiró la conexión dañada y se está reemplazando el tramo afectado.
```

Estas evidencias no disparan Gemini. Quedan disponibles como contexto intermedio para el análisis final.

### 7.3 Evidencia final: `after`

Después de existir `before` y antes de existir `after`:

- se muestra un botón diferenciado para subir el resultado final;
- el formulario no muestra campo `Tipo`;
- el backend guarda la evidencia como `after`;
- el sistema ejecuta la consulta a Gemini con `before`, todos los `progress` disponibles y el `after` recién recibido.

Ejemplo de descripción:

```text
Reparación terminada sin pérdida visible.
```

Si el análisis de Gemini se completa, el sistema:

- guarda el resumen en `ai_summary`;
- actualiza `ai_status`;
- cambia el trabajo a `ai_reviewed`;
- publica `ai_review_generated` en Arkiv asociado a la evidencia `after`.

Si Gemini falla, la evidencia final debe conservarse. El trabajo puede permanecer en `evidence_uploaded` y debe permitir reintento o revisión manual.

---

## 8. Reglas funcionales

### RF-001: primera carga obligatoria como `before`

El sistema debe exigir que la primera evidencia cargada para un trabajo sea `before`.

### RF-002: sin selector visible de tipo

El formulario no debe mostrar un campo `Tipo`. El frontend debe enviar el tipo derivado de la acción usada y el backend debe validarlo.

### RF-003: bloqueo inicial de `progress` y `after`

Mientras no exista `before`, el sistema debe rechazar cargas `progress` o `after`.

### RF-004: progreso opcional y múltiple

Después de `before`, el sistema debe permitir múltiples evidencias `progress` hasta que se cargue `after`.

### RF-005: `after` como cierre del set

Después de guardar `after`, el sistema no debe permitir más evidencias para el camino feliz del MVP.

### RF-006: análisis solo al recibir `after`

Gemini debe ejecutarse recién cuando se guarda `after` y ya existe `before`.

### RF-007: consulta única con todas las evidencias

La consulta a Gemini debe incluir el conjunto cronológico completo, no una imagen aislada.

### RF-008: descripción como contexto

La descripción del proveedor debe enviarse a Gemini como declaración contextual. El prompt debe indicar que no es una verdad verificada.

### RF-009: orden cronológico

Gemini debe recibir evidencias ordenadas por `created_at ASC, id ASC`, que es el criterio usado por los repositorios actuales.

### RF-010: tipos fuera del camino feliz

El backend puede conservar compatibilidad de modelo con `receipt` e `issue`, pero el endpoint de carga del camino feliz debe aceptar solo `before`, `progress` y `after`.

### RF-011: resultado no definitivo

El resultado de Gemini debe presentarse como análisis visual asistido, no como certificación técnica o garantía de reparación.

---

## 9. Estados del set de evidencia

| Estado del set | Condición | Acciones disponibles |
|---|---|---|
| `empty` | No hay evidencias | Subir estado inicial (`before`). |
| `before_uploaded` | Existe `before` y no existe `after` | Subir progreso (`progress`) o subir resultado final (`after`). |
| `in_progress` | Existe `before`, existen uno o más `progress` y no existe `after` | Subir más progreso o subir resultado final. |
| `final_uploaded` | Existe `before` y existe `after` | No se cargan más evidencias del camino feliz. Se analiza con IA. |
| `analysis_completed` | Existe resultado IA persistido | Mostrar resumen/veredicto visual y permitir cierre. |

---

## 10. Comportamiento esperado del frontend

### 10.1 Acciones en detalle de trabajo

Para trabajos en `in_progress` o `evidence_uploaded`, el frontend debe calcular el estado del set de evidencias:

- si no hay evidencias: mostrar solo `Subir estado inicial`;
- si hay `before` y no hay `after`: mostrar `Subir progreso` y `Subir resultado final`;
- si hay `after`: no mostrar botones de carga de evidencia del camino feliz.

El botón de `after` debe tener un color distinto al de `progress` para comunicar que cierra el set y dispara el análisis.

### 10.2 Formulario de carga

El formulario debe mostrar:

- título de la acción: estado inicial, progreso o resultado final;
- `Archivo local`;
- `Descripción`.

No debe mostrar selector de tipo.

### 10.3 Validación al guardar

El frontend debe impedir cargas sin archivo y puede mostrar errores del backend. Los mensajes deben estar en español correcto.

Mensajes sugeridos:

```text
Seleccioná una imagen para guardar la evidencia.
Primero debés cargar la evidencia inicial.
El resultado final ya fue cargado para este trabajo.
```

---

## 11. Comportamiento esperado del backend

El backend debe ser la fuente de verdad de las reglas de orden.

### 11.1 Validación de carga

Al recibir una nueva evidencia:

1. Identificar el trabajo por `jobId`.
2. Consultar evidencias existentes con `listByJobId(jobId)`.
3. Aceptar solo `before`, `progress` y `after`.
4. Si no hay evidencias, aceptar solo `before`.
5. Si ya existe `after`, rechazar nuevas cargas del camino feliz.
6. Si se recibe `progress` o `after` sin `before`, rechazar la carga.
7. Persistir archivo, descripción, hash, tipo derivado y `created_at`.
8. Actualizar el trabajo a `evidence_uploaded`.
9. Publicar `evidence_uploaded` en Arkiv.

### 11.2 Disparo del análisis Gemini

Cuando la evidencia guardada es `after`:

1. Volver a consultar las evidencias del trabajo.
2. Validar que exista `before`.
3. Ordenar por `created_at ASC, id ASC`.
4. Construir el prompt con metadata e imágenes.
5. Ejecutar una única consulta a Gemini Flash-Lite.
6. Guardar el resumen en la evidencia `after`.
7. Actualizar el trabajo a `ai_reviewed`.
8. Publicar `ai_review_generated` en Arkiv.

No debe ejecutarse Gemini para `before` ni para `progress`.

---

## 12. Modelo de datos usado en el MVP

No se agrega un modelo nuevo. Se usan las estructuras existentes.

### 12.1 `job_evidence` / `job_evidence_ml`

| Campo | Uso |
|---|---|
| `id` | Identificador de evidencia. |
| `job_id` | Trabajo asociado. |
| `uploaded_by` | Proveedor que subió la evidencia. |
| `type` | `before`, `progress` o `after` para el camino feliz. |
| `local_file_path` | Ruta local usada por SQLite y como referencia operativa. |
| `public_file_url` | URL pública local o URL de asset de Directus. |
| `description` | Descripción escrita por el proveedor. |
| `sha256_hash` | Hash SHA-256 del archivo o metadata de fallback. |
| `ai_summary` | Resumen generado por IA. En el MVP se guarda en la evidencia `after`. |
| `ai_status` | `pending`, `valid`, `warning` o `rejected`. |
| `arkiv_entity_key` | Entity key del evento `evidence_uploaded`. |
| `arkiv_tx_hash` | Tx hash del evento `evidence_uploaded`. |
| `created_at` | Orden cronológico real. |

### 12.2 `arkiv_events`

Se mantiene como bitácora local de eventos publicados en Arkiv. Para esta integración importan:

- `evidence_uploaded`: una entidad por cada evidencia;
- `ai_review_generated`: una entidad cuando Gemini genera el análisis del set.

---

## 13. Payload interno para Gemini

Gemini debe recibir metadata e imágenes en el mismo orden cronológico.

Ejemplo conceptual:

```json
{
  "job_id": "job_123",
  "model": "gemini-flash-lite-latest",
  "evidence": [
    {
      "id": "ev_001",
      "type": "before",
      "sequence": 1,
      "created_at": "2026-05-30T14:00:00.000Z",
      "sha256_hash": "abc123",
      "provider_description": "Se observa pérdida de agua debajo de la bacha antes de iniciar el trabajo."
    },
    {
      "id": "ev_002",
      "type": "progress",
      "sequence": 2,
      "created_at": "2026-05-30T14:20:00.000Z",
      "sha256_hash": "def456",
      "provider_description": "Se retiró la conexión dañada."
    },
    {
      "id": "ev_003",
      "type": "after",
      "sequence": 3,
      "created_at": "2026-05-30T14:45:00.000Z",
      "sha256_hash": "ghi789",
      "provider_description": "Reparación terminada sin pérdida visible."
    }
  ]
}
```

Las imágenes deben adjuntarse en el mismo orden que los objetos de metadata. El archivo original se conserva para visualización, hash y auditoría; Gemini recibe una copia optimizada para reducir costo.

Metadata adicional recomendada para cada imagen enviada:

```json
{
  "optimized_max_dimension_px": 384,
  "optimized_width_px": 384,
  "optimized_height_px": 288,
  "optimization_reason": "contexto_visual_general"
}
```

---

## 14. Prompt base para Gemini

```text
Analizá este conjunto de imágenes de un trabajo de reparación o mantenimiento.

Las imágenes están ordenadas cronológicamente. Cada imagen tiene metadata con:
- type: before, progress o after.
- provider_description: descripción escrita por el proveedor.
- sha256_hash: hash de auditoría del archivo original.

Reglas importantes:
- La descripción del proveedor es una declaración contextual, no una verdad confirmada.
- Usala para entender qué intenta documentar la imagen, pero contrastala con lo visible.
- No inventes causas técnicas que no sean visibles.
- No certifiques que una reparación quedó garantizada si solo se observa una mejora visual.
- Si no se puede confirmar algo visualmente, indicá la limitación.
- Compará especialmente before contra after.
- Las imágenes progress son opcionales y solo sirven como evidencia intermedia.
- Respondé en español y únicamente con JSON válido según el schema solicitado.
```

---

## 15. JSON de salida esperado

```json
{
  "case_summary": {
    "detected_service_type": "plumbing | electrical | cleaning | gardening | general_repair | unknown",
    "main_visible_issue": "string",
    "overall_evidence_quality": "low | medium | high"
  },
  "evidence_analysis": [
    {
      "id": "string",
      "type": "before | progress | after",
      "provider_description": "string",
      "visual_observation": "string",
      "description_match": "supported | partially_supported | contradicted | not_verifiable",
      "confidence": 0.0
    }
  ],
  "before_after_comparison": {
    "visible_change": true,
    "improvement_level": "none | partial | clear | strong | unknown",
    "remaining_visible_issues": ["string"]
  },
  "verdict": {
    "status": "not_enough_evidence | likely_not_fixed | partially_fixed | likely_fixed | unclear",
    "evidence_strength": "weak | moderate | strong",
    "public_summary": "string",
    "limitations": ["string"],
    "needs_human_review": true
  }
}
```

---

## 16. Interpretación del veredicto

| Estado | Significado |
|---|---|
| `likely_fixed` | La evidencia visual muestra mejora clara y no hay problemas visibles relevantes en la imagen final. |
| `partially_fixed` | Hay mejora visible, pero todavía quedan dudas o rastros del problema. |
| `likely_not_fixed` | La imagen final no muestra mejora suficiente o se ve similar al estado inicial. |
| `unclear` | La evidencia no permite concluir con claridad. |
| `not_enough_evidence` | Falta evidencia mínima o las imágenes no permiten comparar. |

Texto recomendado para la interfaz:

```text
Análisis visual asistido por IA
```

Texto no recomendado:

```text
Reparación certificada por IA
```

---

## 17. Optimización de costo

Para mantener el costo bajo:

1. No llamar a Gemini por cada imagen.
2. Ejecutar una sola llamada por trabajo cuando se recibe `after`.
3. Enviar solo `before`, `progress` y `after` del trabajo actual.
4. Conservar originales para auditoría y hash.
5. Enviar a Gemini copias optimizadas, no los originales completos.
6. Guardar el resultado en la evidencia final para no repetir consultas innecesarias.

Gemini computa 258 tokens por imagen cuando ambas dimensiones son menores o iguales a 384 px. Imágenes más grandes se dividen en tiles de 768 x 768 px, con 258 tokens por tile. Por eso el pipeline debe achicar cada imagen antes de adjuntarla al request multimodal.

Regla práctica para esta integración:

| Caso | Resolución enviada a Gemini |
|---|---|
| Limpieza, pintura, jardinería, reparación visible general | Máximo 384 px por lado |
| Plomería, electricidad, grietas, humedad, conectores, cañerías finas | Máximo 768 px por lado |
| Lectura de texto, etiqueta, medidor, número de serie | Crop específico + resolución mayor |

Para el MVP implementado, la aplicación decide entre 384 px y 768 px según el servicio y el texto del trabajo. El crop específico para lectura de texto o detalles puntuales queda como una mejora futura, porque requiere seleccionar o detectar una región de interés.

Regla del MVP:

```text
1 evidencia after recibida = 1 análisis Gemini del set completo con imágenes optimizadas
```

---

## 18. Validaciones previas a Gemini

Antes de ejecutar el análisis, el backend debe validar:

- existe al menos una evidencia `before`;
- existe una evidencia `after`;
- las evidencias tienen archivo asociado;
- las evidencias están ordenadas por `created_at ASC, id ASC`;
- los tipos pertenecen al conjunto `before`, `progress`, `after`;
- cada imagen puede transformarse a una copia optimizada para Gemini.

Validaciones opcionales:

- tipo MIME permitido;
- límite de peso del archivo;
- detección de archivo corrupto.

---

## 19. Manejo de errores

### Intento de cargar `progress` o `after` sin `before`

```json
{
  "error": "Primero debés cargar la evidencia inicial."
}
```

### Intento de cargar otra evidencia después de `after`

```json
{
  "error": "El resultado final ya fue cargado para este trabajo."
}
```

### Gemini falla

El sistema debe:

- conservar la evidencia cargada;
- dejar una señal operativa en `ai_summary` y `ai_status` cuando sea posible;
- permitir reintento o revisión manual;
- no bloquear la visualización manual de las imágenes.

Mensaje sugerido:

```json
{
  "error": "No se pudo completar el análisis automático. La evidencia quedó guardada."
}
```

---

## 20. Seguridad y privacidad

Las imágenes son evidencia sensible del trabajo.

Recomendaciones:

- No exponer URLs públicas sin control de acceso en producción.
- Registrar `uploaded_by` en cada evidencia.
- Mantener el hash SHA-256 del archivo original.
- Evitar enviar a Gemini información personal innecesaria.
- Enviar solo metadata útil para el análisis visual.
- Publicar en Arkiv metadata de auditoría y no datos personales innecesarios.

---

## 21. Métricas sugeridas

| Métrica | Utilidad |
|---|---|
| Porcentaje de trabajos con `before` cargado | Mide adopción del flujo correcto. |
| Porcentaje de trabajos con `before` + `after` | Mide completitud documental. |
| Promedio de evidencias `progress` por trabajo | Mide documentación intermedia. |
| Tasa de análisis Gemini completados | Mide estabilidad de la integración IA. |
| Tasa de análisis con `warning` o `rejected` | Mide ambigüedad o problemas de evidencia. |
| Distribución de veredictos | Ayuda a auditar calidad del flujo. |

---

## 22. Criterios de aceptación

### CA-001

Dado un trabajo sin evidencias, cuando el proveedor abre el detalle, entonces solo ve la acción para subir estado inicial.

### CA-002

Dado un trabajo sin `before`, cuando se intenta guardar `progress` o `after`, entonces el backend rechaza la carga.

### CA-003

Dado un trabajo con `before` y sin `after`, cuando el proveedor abre el detalle, entonces ve los botones `Subir progreso` y `Subir resultado final`.

### CA-004

Dado un trabajo con `before`, cuando el proveedor sube `progress`, entonces se guarda la evidencia y no se ejecuta Gemini.

### CA-005

Dado un trabajo con `before`, cuando el proveedor sube `after`, entonces se guarda la evidencia final y se ejecuta Gemini con todas las evidencias ordenadas.

### CA-006

Dado un análisis exitoso, cuando Gemini responde, entonces el sistema guarda el resumen en la evidencia `after`, cambia el trabajo a `ai_reviewed` y publica `ai_review_generated`.

### CA-007

Dado un trabajo con `after`, cuando el proveedor vuelve al detalle, entonces no ve acciones para seguir cargando evidencias del camino feliz.

### CA-008

Dado un análisis exitoso, cuando se muestra el resultado al usuario, entonces no se presenta como certificación técnica definitiva.

---

## 23. Casos de prueba principales

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Primer upload correcto | Botón inicial + imagen + descripción | Evidencia `before` guardada. |
| Primer upload incorrecto | `progress` o `after` sin `before` | Rechazo. |
| Progreso posterior | `before` existente + botón progreso | Evidencia `progress` guardada sin Gemini. |
| Resultado final | `before` existente + botón resultado final | Evidencia `after` guardada y análisis Gemini iniciado. |
| Análisis completo | `before` + `progress` opcional + `after` | Gemini recibe payload ordenado. |
| Carga posterior al final | Existe `after` + nueva evidencia | Rechazo. |
| Falla de Gemini | Error del proveedor IA | Evidencias quedan guardadas y el sistema permite revisión o reintento. |

---

## 24. Puntos no definidos para iteraciones futuras

1. Cantidad máxima de evidencias `progress`.
2. Tamaño máximo de archivo.
3. Crop específico automático para lectura de texto, medidores, etiquetas o números de serie.
4. Política de retención de imágenes originales.
5. Permisos exactos de visualización para cliente y proveedor.
6. Reemplazo o eliminación de evidencias cargadas por error.
7. Tabla dedicada para guardar JSON completo de análisis por trabajo.
8. Visibilidad del resultado Gemini para cliente, proveedor o solo administración.
9. Reintento explícito de análisis cuando Gemini falla.

---

## 25. Implementación mínima recomendada

Para el camino feliz del MVP:

1. Derivar el tipo desde el botón de frontend.
2. Quitar el selector de tipo del formulario.
3. Validar en backend que la primera carga sea `before`.
4. Validar que no se suban más evidencias después de `after`.
5. Publicar `evidence_uploaded` por cada evidencia.
6. Ejecutar Gemini solo cuando se guarda `after`.
7. Optimizar imágenes a 384 px o 768 px antes de enviarlas a Gemini.
8. Enviar a Gemini todo el set cronológico optimizado.
9. Guardar el resultado en `ai_summary` y `ai_status` de la evidencia `after`.
10. Publicar `ai_review_generated` solo cuando el análisis se genera correctamente.

---

## 26. Resultado esperado para MVP

Al finalizar esta integración, el proveedor debe poder documentar un trabajo con esta secuencia:

```text
1. Subo el estado inicial.
2. Opcionalmente subo uno o más avances.
3. Subo el resultado final.
4. El sistema analiza todas las evidencias juntas con Gemini Flash-Lite.
5. El producto conserva un resumen estructurado del estado inicial, avances, resultado final y limitaciones visibles.
```

Este enfoque reduce errores de carga, elimina una decisión innecesaria del formulario, baja el costo de IA al evitar análisis por imagen individual y produce una evidencia más confiable para comparar el estado inicial con el resultado final.
