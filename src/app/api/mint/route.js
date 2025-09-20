import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Removed env-based toggle; we will use per-business tokenProgram instead

function getEndpoint() {
  return process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
}

export async function POST(request) {
  try {
    const { dbConnect } = await import("../../../lib/mongo");
    const { ApiKey, Issuance, Business, RateLimit, Idempotency } = await import("../../../lib/models");
    await dbConnect();
    const rawKey = request.headers.get("x-api-key") || "";
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const apiKeyDoc = await ApiKey.findOne({ keyHash, active: true });
    if (!apiKeyDoc) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { recipient, amount } = await request.json();
    if (!recipient || amount == null) {
      return NextResponse.json({ error: "recipient and amount required" }, { status: 400 });
    }

    const secret = process.env.MINT_AUTHORITY_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Server not configured (MINT_AUTHORITY_SECRET_KEY)" }, { status: 500 });
    }

    const { Connection, Keypair, PublicKey } = await import("@solana/web3.js");
    const bs58 = (await import("bs58")).default;
    const authority = Keypair.fromSecretKey(bs58.decode(secret));
    const connection = new Connection(getEndpoint(), "confirmed");

    // Enforce business scoping (allow explicit bizId header to select business in MVP)
    const requestedBizId = request.headers.get("x-biz-id");
    const business = requestedBizId
      ? await Business.findOne({ bizId: requestedBizId })
      : await Business.findById(apiKeyDoc.businessId);
    if (!business) return NextResponse.json({ error: "Business not found for API key" }, { status: 401 });
    const mint = new PublicKey(business.mintAddress);
    const isToken2022 = (business.tokenProgram || "").toLowerCase() === "token2022";
    const owner = new PublicKey(recipient);

    // Ensure recipient ATA
    const spl = await import("@solana/spl-token");
    const TOKEN_2022_PROGRAM_ID = new (await import("@solana/web3.js")).PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
    const ata = isToken2022
      ? spl.getAssociatedTokenAddressSync(mint, owner, false, TOKEN_2022_PROGRAM_ID)
      : await spl.getAssociatedTokenAddress(mint, owner);

    let ixs = [];
    if (isToken2022) {
      ixs.push(spl.createAssociatedTokenAccountIdempotentInstruction(authority.publicKey, ata, owner, mint, TOKEN_2022_PROGRAM_ID));
    } else {
      try {
        await spl.getAccount(connection, ata);
      } catch (_) {
        ixs.push(spl.createAssociatedTokenAccountInstruction(authority.publicKey, ata, owner, mint));
      }
    }

    // Fetch decimals
    const decimals = isToken2022
      ? (await spl.getMint(connection, mint, undefined, TOKEN_2022_PROGRAM_ID)).decimals
      : (await spl.getMint(connection, mint)).decimals;

    const maxPerTx = Number(process.env.MINT_MAX_PER_TX || 10);
    const maxPerDay = Number(process.env.MINT_MAX_PER_DAY || 100);
    const uiAmount = Number(amount);
    if (uiAmount <= 0 || uiAmount > maxPerTx) {
      return NextResponse.json({ error: `amount must be between 1 and ${maxPerTx}` }, { status: 400 });
    }

    // naive per-day limiter by recipient using local memory (stateless fallback)
    // For production, replace with a real store (KV/DB). Here we just enforce per request scope.

    const rawAmount = Math.round(uiAmount * 10 ** decimals);

    // Idempotency (optional header)
    const idemKey = request.headers.get("idempotency-key");
    if (idemKey) {
      const existing = await Idempotency.findOne({ businessId: business._id, key: idemKey });
      if (existing?.signature) {
        return NextResponse.json({ signature: existing.signature, idempotent: true });
      }
    }

    // Basic rate limits per business: 1m and 1d
    async function checkAndInc(window, limit) {
      const now = new Date();
      const resetAt = new Date(window === "1m" ? now.getTime() + 60 * 1000 : now.getTime() + 24 * 60 * 60 * 1000);
      const doc = await RateLimit.findOne({ subject: business._id.toString(), window });
      if (!doc || (doc.resetAt && doc.resetAt < new Date())) {
        await RateLimit.findOneAndUpdate(
          { subject: business._id.toString(), window },
          { $set: { count: 1, resetAt } },
          { upsert: true }
        );
        return;
      }
      if (doc.count >= limit) throw new Error(`Rate limit exceeded (${window})`);
      await RateLimit.updateOne({ _id: doc._id }, { $inc: { count: 1 } });
    }
    await checkAndInc("1m", Number(process.env.MINT_PER_MINUTE || 30));
    await checkAndInc("1d", Number(process.env.MINT_PER_DAY || 1000));

    const mintIx = isToken2022
      ? spl.createMintToCheckedInstruction(mint, ata, authority.publicKey, rawAmount, decimals, [], TOKEN_2022_PROGRAM_ID)
      : spl.createMintToCheckedInstruction(mint, ata, authority.publicKey, rawAmount, decimals);

    const tx = new (await import("@solana/web3.js")).Transaction().add(...ixs, mintIx);
    tx.feePayer = authority.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const sig = await (await import("@solana/web3.js")).sendAndConfirmTransaction(connection, tx, [authority]);

    // persist issuance log
    await Issuance.create({
      businessId: apiKeyDoc.businessId,
      customer: recipient,
      amount: uiAmount,
      signature: sig,
    });

    if (idemKey) {
      await Idempotency.findOneAndUpdate(
        { businessId: business._id, key: idemKey },
        { $set: { signature: sig } },
        { upsert: true }
      );
    }

    return NextResponse.json({ signature: sig });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "unknown" }, { status: 500 });
  }
}


