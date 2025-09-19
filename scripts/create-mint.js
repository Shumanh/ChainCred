// node scripts/create-mint.js
// Creates an SPL mint on Devnet using a keypair file path from env.

import {
  Connection,
  Keypair,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMint,
  getMint,
  setAuthority,
  AuthorityType,
} from "@solana/spl-token";
import fs from "fs";

async function main() {
  const endpoint = process.env.RPC_URL || clusterApiUrl("devnet");
  const payerPath = process.env.KEYPAIR_PATH;
  if (!payerPath) throw new Error("Set KEYPAIR_PATH to a JSON keypair file");
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(payerPath, "utf-8")))
  );
  const connection = new Connection(endpoint, "confirmed");

  const decimals = Number(process.env.DECIMALS || 0);
  const mint = await createMint(connection, payer, payer.publicKey, null, decimals);
  console.log("Mint:", mint.toBase58());

  // Optionally freeze/revoke mint authority for fixed supply later
  if (process.env.REVOKE_MINT === "true") {
    await setAuthority(
      connection,
      payer,
      mint,
      payer.publicKey,
      AuthorityType.MintTokens,
      null
    );
    console.log("Mint authority revoked");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


