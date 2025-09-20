import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getEndpoint() {
  return process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
}

export async function POST(request) {
  try {
    const { recipient, lamports } = await request.json();
    if (!recipient || !lamports) return NextResponse.json({ error: "recipient and lamports required" }, { status: 400 });

    const { Connection, PublicKey, SystemProgram, Keypair } = await import("@solana/web3.js");
    const connection = new Connection(getEndpoint(), "confirmed");
    const to = new PublicKey(recipient);

    try {
      const sig = await connection.requestAirdrop(to, Number(lamports));
      await connection.confirmTransaction(sig, "confirmed");
      return NextResponse.json({ signature: sig, source: "airdrop" });
    } catch (airdropErr) {
      // Fallback: fund from server key if available (devnet only)
      const secret = process.env.MINT_AUTHORITY_SECRET_KEY;
      if (!secret) throw airdropErr;
      const bs58 = (await import("bs58")).default;
      const from = Keypair.fromSecretKey(bs58.decode(secret));
      const tx = new (await import("@solana/web3.js")).Transaction().add(
        SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: to, lamports: Number(lamports) })
      );
      tx.feePayer = from.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const sig = await (await import("@solana/web3.js")).sendAndConfirmTransaction(connection, tx, [from]);
      return NextResponse.json({ signature: sig, source: "server-transfer" });
    }
  } catch (e) {
    console.error(e);
    // If body or airdrop failed, return JSON error so client json() won’t crash
    const message = e?.message || "unknown";
    const status = /429|Too Many Requests/i.test(message) ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}


