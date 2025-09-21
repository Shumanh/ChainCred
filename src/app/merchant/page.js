"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { getConnection, buildMintTx } from "../../lib/solana";
import { useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Button from "../../components/ui/Button";
import { PublicKey } from "@solana/web3.js"; // New import
import { Suspense } from "react"; // New import

function MerchantMintContent() { // Wrap the component in a new function for Suspense
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const searchParams = useSearchParams();
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState(1);
  const [referralBonusRecipientAddress, setReferralBonusRecipientAddress] = useState(""); // New state for direct referral award
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [bizId, setBizId] = useState("");
  const biz = useMemo(() => businesses.find((b) => b.bizId === bizId) || businesses[0], [bizId, businesses]);
  const mintAddress = biz?.mintAddress;

  useEffect(() => {
    const referredBy = searchParams.get("referredBy");
    const businessIdParam = searchParams.get("bizId");

    if (referredBy) {
      setReferralBonusRecipientAddress(referredBy); // Now sets the new dedicated field
    }
    if (businessIdParam) {
      setBizId(businessIdParam);
    }

    (async () => {
      try {
        const res = await fetch("/api/businesses");
        const data = await res.json();
        if (res.ok && Array.isArray(data.businesses)) {
          setBusinesses(data.businesses);
          if (!bizId && data.businesses[0]?.bizId) setBizId(data.businesses[0].bizId);
        }
      } catch (_) {}
    })();
  }, [bizId]);

  function useMyAddress() {
    if (!publicKey) return;
    setCustomer(publicKey.toBase58());
  }

  function toast({ title, message, link }) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toast", { detail: { title, message, link } }));
    }
  }

  function isValidSolanaAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function mintToCustomer() {
    if (!publicKey || !customer) return;
    setLoading(true);
    try {
      // Prefer server mint if configured
      if (process.env.NEXT_PUBLIC_USE_SERVER_MINT === "true") {
        const idem = `mint-${customer}-${Date.now()}`;
        const res = await fetch("/api/mint", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.NEXT_PUBLIC_MERCHANT_API_KEY || "",
            "idempotency-key": idem,
            "x-biz-id": bizId || "",
          },
          body: JSON.stringify({ recipient: customer, amount }), // Removed referrerWalletAddress
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "mint failed");
        toast({
          title: "Minted",
          message: data.signature,
          link: `https://explorer.solana.com/tx/${data.signature}?cluster=devnet`,
        });
      } else {
        if (!signTransaction) throw new Error("Wallet cannot sign transactions");
        const conn = connection ?? (await getConnection());
        const tx = await buildMintTx({
          connection: conn,
          mint: mintAddress,
          owner: customer,
          amount,
          mintAuthority: publicKey.toBase58(),
        });
        const signed = await signTransaction(tx);
        const sig = await conn.sendRawTransaction(signed.serialize());
        await conn.confirmTransaction(sig, "confirmed");
        toast({
          title: "Minted",
          message: "Client-signed",
          link: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
        });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Mint failed", message: e?.message || "unknown" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-36px-56px)] flex items-center justify-center px-4">{/* center between nav/footer */}
      <div className="w-full max-w-xl">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-semibold">Merchant</h1>
          <p className="text-sm opacity-70">Mint points to customer wallets</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-700 rounded p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
          <select
            className="border rounded px-2 py-1 bg-white text-black"
            value={bizId}
            onChange={(e) => setBizId(e.target.value)}
          >
            {businesses.map((b) => (
              <option key={b.bizId} value={b.bizId}>
                {b.name}
              </option>
            ))}
          </select>
          <WalletMultiButton />
        </div>
        <div className="text-xs opacity-70">Mint: {mintAddress}</div>
        <div className="flex flex-col gap-2 w-full">
          <label className="text-sm opacity-80">Customer wallet address</label>
          <div className="flex gap-2 w-full">
            <input
              type="text"
              placeholder="Enter or paste a Devnet address"
              className="flex-1 border rounded px-2 py-1 bg-white text-black"
              value={customer}
              onChange={(e) => setCustomer(e.target.value.trim())}
            />
            <Button type="button" onClick={useMyAddress} disabled={!publicKey}>
              Use my address
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80">Amount</label>
          <input
            type="number"
            min="0"
            className="border rounded px-2 py-1 w-28 text-center bg-white text-black"
            value={amount}
            onChange={(e) => {
              const v = Math.min(10, Number(e.target.value) || 0);
              setAmount(v);
            }}
          />
          <Button disabled={!publicKey || loading || !customer} className="bg-green-600" onClick={mintToCustomer}>
            Mint to Customer
          </Button>
          </div>
        </div>

        {/* New section for awarding referral bonus directly */}
        <div className="border-t border-slate-700 pt-4 mt-4">
          <div className="flex flex-col gap-2 w-full">
            <label className="text-sm opacity-80">Referral Bonus Recipient (2 points)</label>
            <div className="flex gap-2 w-full">
              <input
                type="text"
                placeholder="Enter referrer\'s Devnet address for bonus"
                className="flex-1 border rounded px-2 py-1 bg-white text-black"
                value={referralBonusRecipientAddress}
                onChange={(e) => {
                  const inputValue = e.target.value.trim();
                  const referralPattern = /^(.*?)\&bizId=(.*)$/;
                  const match = inputValue.match(referralPattern);

                  if (match) {
                    const [_, walletAddr, businessId] = match;
                    setReferralBonusRecipientAddress(walletAddr);
                    setBizId(businessId);
                  } else {
                    setReferralBonusRecipientAddress(inputValue);
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 justify-center">
            <Button
              variant="secondary"
              onClick={async () => {
                if (!publicKey || !referralBonusRecipientAddress || !isValidSolanaAddress(referralBonusRecipientAddress)) return;
                setLoading(true);
                try {
                  const idem = `referral-bonus-${referralBonusRecipientAddress}-${Date.now()}`;
                  const res = await fetch("/api/mint", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-api-key": process.env.NEXT_PUBLIC_MERCHANT_API_KEY || "",
                      "idempotency-key": idem,
                      "x-biz-id": bizId || "",
                    },
                    body: JSON.stringify({ recipient: referralBonusRecipientAddress, amount: 2, isReferralAwardMint: true, referralContextBizId: bizId }), // Fixed 2 points, set flag, add bizId
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Referral bonus mint failed");
                  toast({
                    title: "Referral Bonus Awarded!",
                    message: `2 points minted to ${referralBonusRecipientAddress}. Transaction: ${data.signature}`,
                    link: `https://explorer.solana.com/tx/${data.signature}?cluster=devnet`,
                  });
                  setReferralBonusRecipientAddress(""); // Clear after successful mint
                } catch (e) {
                  console.error(e);
                  toast({ title: "Referral Bonus Failed", message: e?.message || "unknown" });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!publicKey || loading || !referralBonusRecipientAddress || !isValidSolanaAddress(referralBonusRecipientAddress)}
            >
              Award
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MerchantMint() {
  return (
    <Suspense fallback={<div>Loading merchant page...</div>}> {/* Wrap with Suspense */}
      <MerchantMintContent />
    </Suspense>
  );
}


