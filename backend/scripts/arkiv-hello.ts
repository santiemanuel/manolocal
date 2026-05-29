import { createPublicClient, createWalletClient, http } from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { braga } from "@arkiv-network/sdk/chains";
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils";
import { config } from "dotenv";

config({ quiet: true });

const walletSecret = process.env.PRIVATE_KEY;
const configuredWalletAddress = process.env.WALLET_ADDRESS?.trim();

if (!walletSecret) {
  throw new Error("Falta PRIVATE_KEY en .env");
}

const publicClient = createPublicClient({
  chain: braga,
  transport: http(),
});

function formatGlm(value: bigint) {
  const decimals = 10n ** 18n;
  const whole = value / decimals;
  const fractional = (value % decimals).toString().padStart(18, "0").slice(0, 6);
  return `${whole}.${fractional}`.replace(/\.?0+$/, "");
}

const chainId = await publicClient.getChainId();
const blockNumber = await publicClient.getBlockNumber();

if (chainId !== braga.id) {
  throw new Error(`Red incorrecta: se esperaba Braga (${braga.id}) y se obtuvo ${chainId}`);
}

if (/^0x[0-9a-fA-F]{40}$/.test(walletSecret)) {
  const address = walletSecret as `0x${string}`;
  const balance = await publicClient.getBalance({ address });

  console.log("Wallet:", address);
  console.log("Red:", `${braga.name} (${chainId})`);
  console.log("Bloque:", blockNumber.toString());
  console.log("Balance GLM:", formatGlm(balance));

  throw new Error(
    "PRIVATE_KEY contiene una dirección pública. Para crear entidades en Arkiv debe contener la clave privada de prueba: 0x + 64 caracteres hexadecimales.",
  );
}

if (!/^0x[0-9a-fA-F]{64}$/.test(walletSecret)) {
  throw new Error("PRIVATE_KEY debe ser una clave hexadecimal 0x de 64 caracteres");
}

if (configuredWalletAddress && !/^0x[0-9a-fA-F]{40}$/.test(configuredWalletAddress)) {
  throw new Error("WALLET_ADDRESS debe ser una dirección Ethereum 0x de 40 caracteres");
}

const account = privateKeyToAccount(walletSecret as `0x${string}`);
const walletClient = createWalletClient({
  chain: braga,
  transport: http(),
  account,
});

const balance = await publicClient.getBalance({ address: account.address });

if (configuredWalletAddress && configuredWalletAddress.toLowerCase() !== account.address.toLowerCase()) {
  const configuredBalance = await publicClient.getBalance({
    address: configuredWalletAddress as `0x${string}`,
  });

  console.log("Wallet configurada:", configuredWalletAddress);
  console.log("Balance GLM wallet configurada:", formatGlm(configuredBalance));
  console.log("Wallet derivada de PRIVATE_KEY:", account.address);
  console.log("Balance GLM wallet derivada:", formatGlm(balance));
  console.log("Red:", `${braga.name} (${chainId})`);
  console.log("Bloque:", blockNumber.toString());

  throw new Error(
    "WALLET_ADDRESS no coincide con la wallet derivada de PRIVATE_KEY. Para escribir en Arkiv, fondea la wallet derivada o usa la clave privada que corresponde a WALLET_ADDRESS.",
  );
}

console.log("Wallet:", account.address);
console.log("Red:", `${braga.name} (${chainId})`);
console.log("Bloque:", blockNumber.toString());
console.log("Balance GLM:", formatGlm(balance));

if (balance <= 0n) {
  throw new Error(`La wallet ${account.address} no tiene GLM disponible para gas`);
}

const createdAt = new Date().toISOString();
const payload = {
  eventType: "wallet_check",
  app: "servicios-verificables",
  message: "Servicios Verificables + Arkiv wallet check",
  walletAddress: account.address,
  network: "braga",
  chainId,
  createdAt,
};

const { entityKey, txHash } = await walletClient.createEntity({
  payload: jsonToPayload(payload),
  contentType: "application/json",
  attributes: [
    { key: "app", value: "servicios-verificables" },
    { key: "track", value: "arkiv" },
    { key: "entityType", value: "wallet_check" },
    { key: "network", value: "braga" },
    { key: "wallet", value: account.address },
  ],
  expiresIn: ExpirationTime.fromDays(1),
});

console.log("Entidad creada:", entityKey);
console.log("Tx:", txHash);

const entity = await publicClient.getEntity(entityKey);

console.log("Contenido:", JSON.stringify(entity.toJson(), null, 2));
