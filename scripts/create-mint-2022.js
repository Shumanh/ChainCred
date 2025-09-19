// node scripts/create-mint-2022.js
// Creates a Token-2022 mint with optional InterestBearingMint extension on Devnet

import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
  LENGTH_SIZE,
  ExtensionType,
  getMintLen,
  createInitializeMintInstruction,
  createInitializeInterestBearingMintInstruction,
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
  const apr = Number(process.env.INTEREST_APR || 0); // e.g. 0.1 for 10% APR

  const extensions = apr > 0 ? [ExtensionType.InterestBearingConfig] : [];
  const mintLen = getMintLen(extensions);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  const mint = Keypair.generate();

  const tx = new (await import("@solana/web3.js")).Transaction();

  // Allocate account for mint with extensions
  tx.add(
    (await import("@solana/web3.js")).SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      lamports,
      space: mintLen,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  if (apr > 0) {
    tx.add(
      createInitializeInterestBearingMintInstruction(
        mint.publicKey,
        payer.publicKey,
        apr,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  tx.add(
    createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );

  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const sig = await (await import("@solana/web3.js")).sendAndConfirmTransaction(
    connection,
    tx,
    [payer, mint]
  );

  console.log("Mint (Token-2022):", mint.publicKey.toBase58());
  console.log("APR:", apr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


