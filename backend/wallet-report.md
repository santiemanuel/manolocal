# Wallet Report - Arkiv Braga

Fecha de verificación: 2026-05-28
Proyecto: Servicios Verificables
Red objetivo: Braga

## Resultado

La prueba de wallet, red Braga y escritura real en Arkiv finalizó correctamente.

El script `backend/scripts/arkiv-hello.ts` pudo:

- cargar `PRIVATE_KEY` desde `.env`;
- derivar la wallet firmante;
- confirmar que la red activa es Braga;
- verificar saldo GLM disponible;
- crear una entidad real en Arkiv;
- leer la entidad creada con `PublicClient`.

## Checks ejecutados

Comando:

```bash
npm.cmd run arkiv:hello
```

Resultado observado:

```text
Wallet: 0x85311B1159459704856Cbfddc5903563A9d4d6Bd
Red: Braga (60138453102)
Bloque: 1002291
Balance GLM: 0.001
Entidad creada: 0x54a6a9327fe121e21b8f0467c1b8c1e6c3330e5f8488604b79367827b5d80df0
Tx: 0x0aa7bdd409ae36215f18558c1fd00b2856618ec2859b7d10e26420ebc087863a
```

Contenido leido desde Arkiv:

```json
{
  "eventType": "wallet_check",
  "app": "servicios-verificables",
  "message": "Servicios Verificables + Arkiv wallet check",
  "walletAddress": "0x85311B1159459704856Cbfddc5903563A9d4d6Bd",
  "network": "braga",
  "chainId": 60138453102,
  "createdAt": "2026-05-28T16:34:28.043Z"
}
```

## Artefactos de la prueba

Entity key:

```text
0x54a6a9327fe121e21b8f0467c1b8c1e6c3330e5f8488604b79367827b5d80df0
```

Transaction hash:

```text
0x0aa7bdd409ae36215f18558c1fd00b2856618ec2859b7d10e26420ebc087863a
```

## Validaciones correctas

- `.env` existe y contiene `PRIVATE_KEY`.
- `.env` contiene `WALLET_ADDRESS` alineada con la wallet derivada.
- `PRIVATE_KEY` tiene formato de clave privada compatible: `0x` + 64 caracteres hexadecimales.
- La red detectada es Braga, chain ID `60138453102`.
- La wallet firmante tiene GLM disponible para gas.
- El SDK instalado es `@arkiv-network/sdk` `0.6.8`, compatible con Braga.
- La entidad fue creada con payload JSON y atributos consultables.
- La entidad fue leída exitosamente después de crearla.

## Estado de Etapa 2

Estado: completada.

El criterio de aceptación queda cumplido porque el script creó una entidad real en Arkiv y devolvió:

- `entityKey`
- `txHash`

La base técnica ya está lista para continuar con la prueba mínima de Arkiv y luego integrar los eventos reales del MVP.
