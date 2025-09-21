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
    const { ApiKey, Issuance, Business, RateLimit, Idempotency, Customer } = await import("../../../lib/models");
    await dbConnect();
    const spl = await import("@solana/spl-token"); // Moved this import to the top
    const rawKey = request.headers.get("x-api-key") || "";
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const apiKeyDoc = await ApiKey.findOne({ keyHash, active: true });
    if (!apiKeyDoc) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { recipient, amount, referrerWalletAddress, isReferralAwardMint, referralContextBizId } = await request.json();
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

    let recipientCustomerDoc = await Customer.findOne({ walletAddress: recipient });
    if (!recipientCustomerDoc) {
      recipientCustomerDoc = await Customer.create({ walletAddress: recipient });
    }

    // Helper to ensure referralCounts is a Map instance
    const ensureReferralCountsIsMap = (doc) => {
      if (!doc.referralCounts || !(doc.referralCounts instanceof Map)) {
        doc.referralCounts = new Map(Object.entries(doc.referralCounts || {}));
      }
    };
    ensureReferralCountsIsMap(recipientCustomerDoc);

    let referralMintIx = null;
    // Logic for when a NEW customer is being referred by an existing one
    if (referrerWalletAddress && referrerWalletAddress !== recipient && !isReferralAwardMint) {
      const referrerCustomerDoc = await Customer.findOne({ walletAddress: referrerWalletAddress });

      if (referrerCustomerDoc) {
        ensureReferralCountsIsMap(referrerCustomerDoc);

        if (!recipientCustomerDoc.hasMadeFirstPurchase && !recipientCustomerDoc.referredByWalletAddress) {
          // Valid referral - update documents and prepare bonus mint

          // Update recipient's document to mark who referred them
          recipientCustomerDoc.referredByWalletAddress = referrerWalletAddress;
          await recipientCustomerDoc.save();

          // Update referrer's document - increment referral count for the specific business
          referrerCustomerDoc.referralCounts.set(business.bizId, (referrerCustomerDoc.referralCounts.get(business.bizId) || 0) + 1);
          await referrerCustomerDoc.save();

          // Prepare bonus mint instruction for referrer (this is the secondary mint)
          const referrerOwner = new PublicKey(referrerWalletAddress);
          const referrerAta = isToken2022
            ? spl.getAssociatedTokenAddressSync(mint, referrerOwner, false, TOKEN_2022_PROGRAM_ID)
            : await spl.getAssociatedTokenAddress(mint, referrerOwner);

          // Ensure referrer ATA exists
          try {
            await spl.getAccount(connection, referrerAta); // Check if ATA already exists
          } catch (_) {
            // If not, add instruction to create it
            ixs.push(isToken2022
              ? spl.createAssociatedTokenAccountIdempotentInstruction(authority.publicKey, referrerAta, referrerOwner, mint, TOKEN_2022_PROGRAM_ID)
              : spl.createAssociatedTokenAccountInstruction(authority.publicKey, referrerAta, referrerOwner, mint));
          }

          const rawReferralAmount = Math.round(referralBonusAmount * 10 ** decimals);
          referralMintIx = isToken2022
            ? spl.createMintToCheckedInstruction(mint, referrerAta, authority.publicKey, rawReferralAmount, decimals, [], TOKEN_2022_PROGRAM_ID)
            : spl.createMintToCheckedInstruction(mint, referrerAta, authority.publicKey, rawReferralAmount, decimals);

          // Log the referral bonus issuance (optional, but good for auditing)
          await Issuance.create({
            businessId: apiKeyDoc.businessId,
            customer: referrerWalletAddress,
            amount: referralBonusAmount,
            signature: "pending_referral_bonus", // Will update with actual signature later
          });
        }
      }
    }

    // Logic for when a merchant directly awards referral points to a referrer
    if (isReferralAwardMint) {
      // Validate that the business context for the referral award matches the requested business
      if (referralContextBizId && referralContextBizId !== business.bizId) {
        return NextResponse.json({ error: "Referral bonus can only be awarded for the business specified in the referral context." }, { status: 400 });
      }
      // The recipient of this mint is the referrer themselves. Increment their count for the specific business.
      recipientCustomerDoc.referralCounts.set(business.bizId, (recipientCustomerDoc.referralCounts.get(business.bizId) || 0) + 1);
      await recipientCustomerDoc.save();
    }

    // Ensure recipient ATA
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
    const referralBonusAmount = Number(process.env.REFERRAL_BONUS_AMOUNT || 2); // Changed default to 2 for demo
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
    if (referralMintIx) {
      tx.add(referralMintIx);
    }
    tx.feePayer = authority.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const sig = await (await import("@solana/web3.js")).sendAndConfirmTransaction(connection, tx, [authority]);

    // Persist issuance log for recipient
    await Issuance.create({
      businessId: apiKeyDoc.businessId,
      customer: recipient,
      amount: uiAmount,
      signature: sig,
    });

    // Update recipient's first purchase status ONLY if it was a new customer getting points
    // This ensures we only set hasMadeFirstPurchase to true for actual new customers receiving their first points
    if (!isReferralAwardMint) {
      recipientCustomerDoc.hasMadeFirstPurchase = true;
      await recipientCustomerDoc.save();
    }

    // Update referral bonus issuance signature if applicable (from the primary referral flow)
    if (referralMintIx) {
      await Issuance.findOneAndUpdate(
        { businessId: apiKeyDoc.businessId, customer: referrerWalletAddress, signature: "pending_referral_bonus" },
        { $set: { signature: sig } }
      );
    }

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


