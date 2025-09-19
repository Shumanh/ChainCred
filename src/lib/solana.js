import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMint,
  getAccount,
  createMintToInstruction,
  createBurnInstruction,
  createTransferInstruction,
} from "@solana/spl-token";
import { TOKEN_2022_PROGRAM_ID, getMint as getMint2022, createBurnCheckedInstruction as createBurnChecked2022, createMintToCheckedInstruction as createMintToChecked2022, createTransferCheckedInstruction as createTransferChecked2022, getAssociatedTokenAddressSync as getAtaSync2022, createAssociatedTokenAccountIdempotentInstruction as createAtaIdem2022 } from "@solana/spl-token";

export async function getConnection() {
  const endpoint = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
  return new Connection(endpoint, "confirmed");
}

function isToken2022Enabled() {
  return process.env.NEXT_PUBLIC_TOKEN_2022 === "true";
}

export async function findOrCreateAta({
  connection,
  mint,
  owner,
  payer,
}) {
  const mintKey = new PublicKey(mint);
  const ownerKey = new PublicKey(owner);
  const ata = await getAssociatedTokenAddress(mintKey, ownerKey, undefined, isToken2022Enabled() ? TOKEN_2022_PROGRAM_ID : undefined);

  try {
    await getAccount(connection, ata);
    return { ata, ixs: [] };
  } catch (_) {
    const ix = isToken2022Enabled()
      ? createAtaIdem2022(payer, ata, ownerKey, mintKey, TOKEN_2022_PROGRAM_ID)
      : createAssociatedTokenAccountInstruction(payer, ata, ownerKey, mintKey);
    return { ata, ixs: [ix] };
  }
}

export async function fetchTokenBalance({ connection, mint, owner }) {
  const { ata } = await findOrCreateAta({
    connection,
    mint,
    owner,
    payer: new PublicKey(owner),
  });
  const info = await connection.getTokenAccountBalance(ata).catch(() => null);
  // Prefer string to avoid floating point precision issues, then coerce to number safely
  const uiAmountString = info?.value?.uiAmountString;
  if (!uiAmountString) return 0;
  const numeric = Number(uiAmountString);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function buildMintTx({ connection, mint, owner, amount, mintAuthority }) {
  const payer = new PublicKey(owner);
  const { ata, ixs } = await findOrCreateAta({
    connection,
    mint,
    owner,
    payer,
  });
  const decimals = (isToken2022Enabled()
    ? (await getMint2022(connection, new PublicKey(mint), undefined, TOKEN_2022_PROGRAM_ID)).decimals
    : (await getMint(connection, new PublicKey(mint))).decimals);
  const mintIx = isToken2022Enabled()
    ? createMintToChecked2022(new PublicKey(mint), ata, new PublicKey(mintAuthority), Math.round(amount * 10 ** decimals), decimals, [], TOKEN_2022_PROGRAM_ID)
    : createMintToInstruction(new PublicKey(mint), ata, new PublicKey(mintAuthority), Math.round(amount * 10 ** decimals));
  const tx = new Transaction().add(...ixs, mintIx);
  tx.feePayer = payer;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}

export async function buildBurnTx({ connection, mint, owner, amount }) {
  const payer = new PublicKey(owner);
  const { ata, ixs } = await findOrCreateAta({
    connection,
    mint,
    owner,
    payer,
  });
  const decimals = (isToken2022Enabled()
    ? (await getMint2022(connection, new PublicKey(mint), undefined, TOKEN_2022_PROGRAM_ID)).decimals
    : (await getMint(connection, new PublicKey(mint))).decimals);
  const burnIx = isToken2022Enabled()
    ? createBurnChecked2022(ata, new PublicKey(mint), payer, Math.round(amount * 10 ** decimals), decimals, [], TOKEN_2022_PROGRAM_ID)
    : createBurnInstruction(ata, new PublicKey(mint), payer, Math.round(amount * 10 ** decimals));
  const tx = new Transaction().add(...ixs, burnIx);
  tx.feePayer = payer;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}

export async function buildTransferTx({
  connection,
  mint,
  from,
  to,
  amount,
}) {
  const fromKey = new PublicKey(from);
  const toKey = new PublicKey(to);
  const payer = fromKey;
  const { ata: fromAta } = await findOrCreateAta({
    connection,
    mint,
    owner: from,
    payer,
  });
  const { ata: toAta, ixs } = await findOrCreateAta({
    connection,
    mint,
    owner: to,
    payer,
  });
  const decimals = (isToken2022Enabled()
    ? (await getMint2022(connection, new PublicKey(mint), undefined, TOKEN_2022_PROGRAM_ID)).decimals
    : (await getMint(connection, new PublicKey(mint))).decimals);
  const transferIx = isToken2022Enabled()
    ? createTransferChecked2022(fromAta, new PublicKey(mint), toAta, fromKey, Math.round(amount * 10 ** decimals), decimals, [], TOKEN_2022_PROGRAM_ID)
    : createTransferInstruction(fromAta, toAta, fromKey, Math.round(amount * 10 ** decimals));
  const tx = new Transaction().add(...ixs, transferIx);
  tx.feePayer = payer;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}


