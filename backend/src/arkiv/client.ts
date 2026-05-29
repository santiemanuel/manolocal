import { createWalletClient, http } from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { braga } from "@arkiv-network/sdk/chains";
import { config } from "dotenv";

config({ quiet: true });

export type ArkivWalletClient = ReturnType<typeof createArkivWalletClient>;

export function createArkivWalletClient() {
  const walletSecret = process.env.PRIVATE_KEY?.trim();

  if (!walletSecret) {
    throw new Error("Falta PRIVATE_KEY en backend/.env para publicar eventos reales en Arkiv.");
  }

  if (/^0x[0-9a-fA-F]{40}$/.test(walletSecret)) {
    throw new Error(
      "PRIVATE_KEY contiene una dirección pública. Para escribir en Arkiv debe ser una clave privada 0x de 64 caracteres.",
    );
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(walletSecret)) {
    throw new Error("PRIVATE_KEY debe ser una clave hexadecimal 0x de 64 caracteres.");
  }

  const account = privateKeyToAccount(walletSecret as `0x${string}`);

  return createWalletClient({
    chain: braga,
    transport: http(),
    account,
  });
}

