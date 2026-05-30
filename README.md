# Mano Local - Servicios Verificables con Arkiv

Mano Local es un prototipo de marketplace local de servicios donde cada trabajo genera evidencia verificable: solicitud, fotos del prestador, revisión de IA y cierre del servicio. La app usa Directus o SQLite como base operativa, pero la capa de confianza está en Arkiv: cada paso importante publica una entidad real en la red de prueba Braga y guarda su `entityKey` y `txHash` para auditoría.

## Idea Principal

El problema que resuelve es simple: en servicios del hogar o mantenimiento suele ser difícil probar que un trabajo fue pedido, realizado, validado y cerrado correctamente. Mano Local arma un historial verificable por trabajo:

- el cliente crea una solicitud;
- el prestador sube evidencia antes, durante o después del trabajo;
- la app guarda hash SHA-256 del archivo;
- la revisión de IA resume y clasifica la evidencia;
- Arkiv publica eventos verificables para `job_created`, `evidence_uploaded`, `ai_review_generated` y `job_completed`;
- el frontend muestra los IDs de Arkiv como links clickeables al explorer.

SQLite o Directus pueden cambiar o corregirse; Arkiv queda como registro verificable del flujo.

## Arquitectura

```text
Frontend React / Vite
        |
        | HTTP
        v
Backend Node / TSX
        |
        +--> Repository interfaces
        |       |
        |       +--> Directus adapter
        |       +--> SQLite adapter local
        |
        +--> Arkiv publishers
                |
                v
        Arkiv Braga testnet
```

Componentes principales:

- `frontend/`: interfaz React con vistas de cliente, prestador, detalle de trabajo y auditoría.
- `backend/src/api/server.ts`: API local para estado, trabajos, evidencia y cambios de estado.
- `backend/src/repositories/ports.ts`: contratos de repositorios para no acoplar la app a Directus o SQLite.
- `backend/src/repositories/directus/`: adapter Directus.
- `backend/src/repositories/sqlite/`: adapter SQLite local.
- `backend/src/arkiv/`: cliente Arkiv, atributos comunes y publishers de eventos.
- `backend/db/directus-seed.ts`: seed completo para Directus, incluyendo publicaciones reales en Arkiv.
- `backend/db/seed.ts`: seed completo para SQLite local, también con publicaciones reales en Arkiv.

## Estado Actual

El MVP ya tiene:

- frontend navegable con catálogo, prestadores, detalle de trabajo, subida de evidencia y panel admin;
- backend API local;
- adapter SQLite y adapter Directus;
- seed de datos operativos;
- subida de assets de evidencia a Directus Files;
- hash SHA-256 de evidencias;
- publicación real en Arkiv Braga durante el seed y durante acciones del backend;
- guardado de `entityKey` y `txHash` en la base operativa;
- links clickeables al explorer de entidades y transacciones.

El seed actual deja 4 trabajos, 8 evidencias y 24 eventos Arkiv.

## Wallet y Private Key

Para escribir en Arkiv se necesita una `PRIVATE_KEY`. Esa private key deriva una wallet GLM/EVM que se usa sobre la red de prueba Braga. No se debe commitear la clave privada.

Flujo recomendado:

1. Crear o elegir una private key de prueba con formato `0x` + 64 caracteres hexadecimales.
2. Derivar/identificar la wallet pública correspondiente.
3. Fondear esa wallet en la red de prueba Braga si hace falta.
4. Guardar la clave en `backend/.env` como `PRIVATE_KEY`.
5. Opcionalmente guardar la dirección pública como `WALLET_ADDRESS` para validaciones humanas.

Script de prueba:

```bash
cd backend
npm run arkiv:hello
```

Ese script crea una entidad real en Arkiv y devuelve `entityKey` y `txHash`.

## Instalación

Requisitos:

- Node.js 20 o superior recomendado.
- npm.
- Una instancia Directus configurada si se usa `DATA_ADAPTER=directus`.
- Una private key de prueba para Arkiv Braga.

Instalar dependencias:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Crear configuracion del backend:

```bash
cd backend
cp .env.example .env
```

Configurar `backend/.env`:

```env
PRIVATE_KEY=0x...
WALLET_ADDRESS=0x...
API_PORT=3030
DATABASE_URL=./data/app.db
UPLOADS_DIR=./uploads
DATA_ADAPTER=directus
DIRECTUS_URL=https://tu-directus.example.com
DIRECTUS_TOKEN=tu-token
```

Notas:

- El frontend está proxyeando `/api` y `/uploads` hacia `http://127.0.0.1:3030`.
- Si se usa SQLite local, cambiar `DATA_ADAPTER=sqlite`.
- `GOOGLE_GEN_AI` está reservado para integración de IA real; el flujo actual puede usar resumen/estado simulado en el backend.

## Ejecutar con Directus

Directus es la base operativa editable del prototipo. A grandes rasgos se necesita:

- Crear las colecciones `users_ml`, `services_ml`, `provider_profiles_ml`, `jobs_ml`, `job_evidence_ml`, `reviews_ml` y `arkiv_events_ml`.
- Crear relaciones entre usuarios, servicios, trabajos, evidencias y resenas.
- Crear el campo `file` en `job_evidence_ml` apuntando a Directus Files.
- Crear campos para referencias Arkiv: `arkiv_entity_key_created`, `arkiv_tx_hash_created`, `arkiv_entity_key`, `arkiv_tx_hash`, `entity_key`, `tx_hash`.
- Permitir al token de API hacer CRUD sobre esas colecciones y subir/leer archivos en Directus Files.
- Guardar `DIRECTUS_URL` y `DIRECTUS_TOKEN` en `backend/.env`.

El detalle de campos y relaciones está en:

```text
docs/colecciones-directus-flujo-aplicacion.md
```

Sembrar Directus y publicar el flujo real en Arkiv:

```bash
cd backend
npm run directus:seed
```

Ese comando:

- limpia las colecciones demo `*_ml`;
- sube evidencias PNG a Directus Files;
- crea usuarios, servicios, perfiles, trabajos, evidencias y resenas;
- publica los eventos reales en Arkiv Braga;
- guarda `entityKey` y `txHash` en Directus.

Levantar backend:

```bash
cd backend
npm run dev
```

Levantar frontend:

```bash
cd frontend
npm run dev
```

Abrir:

```text
http://127.0.0.1:5173
```

## Ejecutar con SQLite Local

SQLite sirve para desarrollo local sin depender de Directus.

Configurar:

```env
DATA_ADAPTER=sqlite
API_PORT=3030
DATABASE_URL=./data/app.db
UPLOADS_DIR=./uploads
```

Migrar y sembrar:

```bash
cd backend
npm run db:migrate
npm run db:seed
```

Levantar backend y frontend igual que en el flujo Directus.

## Scripts Utiles

Backend:

```bash
npm run dev                  # API local
npm run arkiv:hello          # prueba mínima de escritura en Arkiv
npm run db:migrate           # migraciones SQLite
npm run db:seed              # seed SQLite + Arkiv real
npm run directus:seed        # seed Directus + Arkiv real
npm run repositories:inspect # inspeccion del adapter activo
npm run typecheck            # TypeScript backend
```

Frontend:

```bash
npm run dev
npm run build
npm run typecheck
```

## Flujo Verificable

Cada trabajo queda representado por eventos Arkiv:

| Paso | Evento Arkiv | Referencia local |
| --- | --- | --- |
| Solicitud creada | `job_created` | `jobs_ml` o `jobs` |
| Evidencia subida | `evidence_uploaded` | `job_evidence_ml` o `job_evidence` |
| Revisión IA generada | `ai_review_generated` | evidencia revisada |
| Trabajo completado | `job_completed` | trabajo cerrado |

La app muestra:

- `entityKey` para abrir el explorer de entidades;
- `txHash` para abrir el explorer de bloques Braga;
- hash SHA-256 de evidencias;
- timeline verificable por trabajo;
- panel admin con eventos publicados.

## Notas de Seguridad

- No subir `backend/.env`.
- Usar wallets de prueba para Braga.
- No guardar información sensible del cliente en Arkiv.
- Publicar en Arkiv solo payloads y atributos útiles para auditoría: IDs locales, estado, hash, resumen y metadata no sensible.
