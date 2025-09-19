// node scripts/gen-keypair.js
// Generates a Devnet keypair JSON on disk and airdrops SOL

import { Connection, Keypair, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import path from "path";

async function main() {
  const secretsDir = path.join(process.cwd(), "secrets");
  if (!fs.existsSync(secretsDir)) fs.mkdirSync(secretsDir);
  const outPath = path.join(secretsDir, "devnet-mint-authority.json");

  const kp = Keypair.generate();
  fs.writeFileSync(outPath, JSON.stringify(Array.from(kp.secretKey)));

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  try {
    const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
  } catch (e) {
    // airdrop may fail intermittently; not fatal
    console.warn("Airdrop may have failed:", e?.message || e);
  }

  console.log("Keypair file:", outPath);
  console.log("Public key:", kp.publicKey.toBase58());
  console.log("Base58 secret (paste into MINT_AUTHORITY_SECRET_KEY):", bs58.encode(kp.secretKey));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


