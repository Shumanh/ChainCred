"use client";
export const dynamic = "force-static";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { getConnection, buildMintTx } from "../../lib/solana";
import { useMemo, useEffect } from "react";
import Button from "../../components/ui/Button";

export default function MerchantMint() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [bizId, setBizId] = useState("");
  const biz = useMemo(() => businesses.find((b) => b.bizId === bizId) || businesses[0], [bizId, businesses]);
  const mintAddress = biz?.mintAddress;

  useEffect(() => {
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
          body: JSON.stringify({ recipient: customer, amount }),
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
      </div>
    </div>
  );
}


