import { createPublicClient, http } from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { braga } from "@arkiv-network/sdk/chains";
import { eq } from "@arkiv-network/sdk/query";
import { config } from "dotenv";
import { createArkivWalletClient } from "../src/arkiv/client.ts";

config({ quiet: true });

const walletSecret = process.env.PRIVATE_KEY?.trim();

if (!walletSecret || !/^0x[0-9a-fA-F]{64}$/.test(walletSecret)) {
  throw new Error("PRIVATE_KEY debe ser una clave privada 0x de 64 caracteres para limpiar Arkiv.");
}

const account = privateKeyToAccount(walletSecret as `0x${string}`);
const publicClient = createPublicClient({
  chain: braga,
  transport: http(),
});
const walletClient = createArkivWalletClient();

const result = await publicClient
  .buildQuery()
  .where([eq("app", "servicios-verificables"), eq("network", "braga")])
  .createdBy(account.address)
  .withMetadata(true)
  .limit(500)
  .fetch();

console.log(`Arkiv: ${result.entities.length} entidades de prueba encontradas para ${account.address}.`);

let deleted = 0;
let failed = 0;

for (const entity of result.entities) {
  try {
    await walletClient.deleteEntity({ entityKey: entity.key });
    deleted += 1;
    console.log(`Arkiv: entidad eliminada ${entity.key}`);
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : "error desconocido";
    console.warn(`Arkiv: no se pudo eliminar ${entity.key}: ${message}`);
  }
}

console.log(`Arkiv cleanup complete: ${deleted} eliminadas, ${failed} con error.`);
