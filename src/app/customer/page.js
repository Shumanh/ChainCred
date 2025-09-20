"use client";
export const dynamic = "force-static";

import { useEffect, useMemo, useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { getConnection, fetchTokenBalance, buildMintTx, buildBurnTx, buildTransferTx } from "../../lib/solana";
import Button from "../../components/ui/Button";
import { Card, CardBody, CardTitle } from "../../components/ui/Card";

export default function CustomerHome() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [businesses, setBusinesses] = useState([]);
  const [bizId, setBizId] = useState("");
  const biz = useMemo(() => businesses.find((b) => b.bizId === bizId) || businesses[0], [bizId, businesses]);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [firstSeen, setFirstSeen] = useState(null);
  const mintAddress = biz?.mintAddress;
  const mintAuthority = biz?.mintAuthority;
  const merchantRedemption = biz?.merchantRedemption;

  const ready = useMemo(() => publicKey && mintAddress, [publicKey, mintAddress]);

  function toast({ title, message, link }) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toast", { detail: { title, message, link } }));
    }
  }

  // Load businesses and rewards from API
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

  useEffect(() => {
    (async () => {
      if (!ready) return;
      const conn = connection ?? (await getConnection());
      const bal = await fetchTokenBalance({ connection: conn, mint: mintAddress, owner: publicKey.toBase58() });
      setBalance(bal);
      const key = `firstSeen:${publicKey.toBase58()}:${mintAddress}`;
      const existing = localStorage.getItem(key);
      if (existing) setFirstSeen(Number(existing));
      else {
        const now = Date.now();
        localStorage.setItem(key, String(now));
        setFirstSeen(now);
      }
    })();
  }, [ready, connection, publicKey, mintAddress]);

  async function submit(txBuilder) {
    if (!publicKey || !signTransaction) return;
    setLoading(true);
    try {
      const conn = connection ?? (await getConnection());
      const tx = await txBuilder(conn);
      const signed = await signTransaction(tx);
      let sig;
      try {
        sig = await conn.sendRawTransaction(signed.serialize());
      } catch (err) {
        const logs = err?.getLogs ? await err.getLogs() : undefined;
        const isInsufficient =
          /insufficient funds/i.test(err?.message || "") ||
          (Array.isArray(logs) && logs.some((l) => /insufficient funds/i.test(l)));
        if (isInsufficient) {
          toast({ title: "Redeem", message: "Not enough points" });
          return;
        }
        throw err;
      }
      await conn.confirmTransaction(sig, "confirmed");
      toast({ title: "Transaction confirmed", message: sig, link: `https://explorer.solana.com/tx/${sig}?cluster=devnet` });
      const bal = await fetchTokenBalance({ connection: conn, mint: mintAddress, owner: publicKey.toBase58() });
      setBalance(bal);
    } catch (e) {
      console.error(e);
      toast({ title: "Transaction failed", message: e?.message || "unknown" });
    } finally {
      setLoading(false);
    }
  }

  const canMint = useMemo(() => {
    if (!mintAuthority || !publicKey) return false;
    return publicKey.toBase58() === mintAuthority;
  }, [mintAuthority, publicKey]);

  async function serverMintOne() {
    if (!publicKey || !mintAddress) return;
    setLoading(true);
    try {
      const idem = `mint-${publicKey.toBase58()}-${Date.now()}`;
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.NEXT_PUBLIC_MERCHANT_API_KEY || "", "idempotency-key": idem },
        body: JSON.stringify({ recipient: publicKey.toBase58(), amount: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "mint failed");
      const conn = connection ?? (await getConnection());
      const bal = await fetchTokenBalance({ connection: conn, mint: mintAddress, owner: publicKey.toBase58() });
      setBalance(bal);
      toast({ title: "Minted", message: data.signature, link: `https://explorer.solana.com/tx/${data.signature}?cluster=devnet` });
    } catch (e) {
      console.error(e);
      toast({ title: "Server mint failed", message: e?.message || "unknown" });
    } finally {
      setLoading(false);
    }
  }

  async function airdropOneSol() {
    if (!publicKey) return;
    setLoading(true);
    try {
      const conn = connection ?? (await getConnection());
      const sig = await conn.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      await conn.confirmTransaction(sig, "confirmed");
      toast({ title: "Airdrop", message: "Airdropped 1 SOL (Devnet)" });
    } catch (e) {
      console.error(e);
      toast({ title: "Airdrop failed", message: e?.message || "unknown" });
    } finally {
      setLoading(false);
    }
  }

  async function fundFromServer() {
    if (!publicKey) return;
    setLoading(true);
    try {
      const res = await fetch("/api/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: publicKey.toBase58(), lamports: 2000000 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "fund failed");
      toast({ title: "Funded", message: "0.002 SOL", link: `https://explorer.solana.com/tx/${data.signature}?cluster=devnet` });
    } catch (e) {
      console.error(e);
      toast({ title: "Funding failed", message: e?.message || "unknown" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-6 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Customer</h1>
          <p className="text-sm opacity-70 mt-1">Earn, hold, and redeem points</p>
        </div>
        <div className="w-full flex items-center justify-center gap-3">
          <select
            className="border border-slate-700 rounded px-2 py-1 bg-white text-black"
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

        {mintAddress ? (
          <p className="text-xs opacity-70">Mint: {mintAddress}</p>
        ) : (
          <p className="text-sm text-red-500">Set NEXT_PUBLIC_LOYALTY_MINT in .env.local</p>
        )}

        {publicKey && (
          <div className="w-full flex flex-col items-center gap-6">
            <div className="text-xl font-medium">Balance: {balance}</div>
            {firstSeen && <Growth balance={balance} firstSeen={firstSeen} />}
            <MyAddressQR address={publicKey.toBase58()} />

            <Card className="w-full">
              <CardBody className="flex flex-col gap-4">
                <div className="flex items-center gap-3 justify-center">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(Math.min(10, Number(e.target.value) || 0))}
                    type="number"
                    min="0"
                    className="border border-slate-700 bg-white text-black rounded px-2 py-1 w-24 text-center"
                  />
                  <Button
                    variant="success"
                    disabled={!ready || loading || !canMint}
                    onClick={() =>
                      submit((conn) =>
                        buildMintTx({ connection: conn, mint: mintAddress, owner: publicKey.toBase58(), amount, mintAuthority: publicKey.toBase58() })
                      )
                    }
                  >
                    Mint
                  </Button>
                  <Button
                    variant="danger"
                    disabled={!ready || loading}
                    onClick={() =>
                      submit((conn) =>
                        buildBurnTx({ connection: conn, mint: mintAddress, owner: publicKey.toBase58(), amount })
                      )
                    }
                  >
                    Burn
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button variant="warning" onClick={airdropOneSol} disabled={!ready || loading}>Airdrop 1 SOL (Devnet)</Button>
                  <Button variant="warning" onClick={fundFromServer} disabled={!ready || loading}>Fund 0.002 SOL (Server)</Button>
                  <Button variant="primary" onClick={serverMintOne} disabled={!ready || loading}>Server Mint 1</Button>
                  <Button
                    variant="info"
                    onClick={() => {
                      if (amount > balance) {
                        toast({ title: "Redeem", message: "Not enough points" });
                        return;
                      }
                      submit((conn) =>
                        buildTransferTx({ connection: conn, mint: mintAddress, from: publicKey.toBase58(), to: merchantRedemption, amount })
                      );
                    }}
                    disabled={!ready || loading || !merchantRedemption || amount > balance}
                  >
                    Redeem (Transfer to Merchant)
                  </Button>
                </div>
              </CardBody>
            </Card>

            <RewardShop
              bizId={bizId}
              balance={balance}
              canRedeem={!!merchantRedemption}
              onRedeem={async (reward) => {
                let notified = false;
                if (!merchantRedemption) return toast({ title: "Redeem", message: "No merchant redemption wallet set" });
                setLoading(true);
                try {
                  const conn = connection ?? (await getConnection());
                  const latestBal = await fetchTokenBalance({ connection: conn, mint: mintAddress, owner: publicKey.toBase58() });
                  if (latestBal < reward.cost) {
                    toast({ title: "Redeem", message: "Not enough points" });
                    notified = true;
                    setLoading(false);
                    return;
                  }
                  const tx = await buildTransferTx({ connection: conn, mint: mintAddress, from: publicKey.toBase58(), to: merchantRedemption, amount: reward.cost });
                  const signed = await signTransaction(tx);
                  let sig;
                  try {
                    sig = await conn.sendRawTransaction(signed.serialize());
                  } catch (err) {
                    const logs = err?.getLogs ? await err.getLogs() : undefined;
                    const isInsufficient =
                      /insufficient funds/i.test(err?.message || "") ||
                      (Array.isArray(logs) && logs.some((l) => /insufficient funds/i.test(l)));
                    if (isInsufficient) {
                      if (!notified) {
                        toast({ title: "Redeem", message: "Not enough points" });
                        notified = true;
                      }
                      return;
                    }
                    throw err;
                  }
                  await conn.confirmTransaction(sig, "confirmed");
                  const bal = await fetchTokenBalance({ connection: conn, mint: mintAddress, owner: publicKey.toBase58() });
                  setBalance(bal);
                  await fetch("/api/redeem-log", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-api-key": process.env.NEXT_PUBLIC_MERCHANT_API_KEY || "" },
                    body: JSON.stringify({ bizId, customer: publicKey.toBase58(), rewardId: reward.id, rewardName: reward.name, cost: reward.cost, signature: sig }),
                  }).catch(() => {});
                  toast({ title: "Redeemed", message: reward.name, link: `https://explorer.solana.com/tx/${sig}?cluster=devnet` });
                } catch (e) {
                  console.error(e);
                  if (!notified) {
                    toast({ title: "Redeem failed", message: e?.message || "unknown" });
                    notified = true;
                  }
                } finally {
                  setLoading(false);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Growth({ balance, firstSeen }) {
  const rate = Number(process.env.NEXT_PUBLIC_GROWTH_RATE || 0);
  if (!rate) return null;
  const days = Math.max(0, (Date.now() - firstSeen) / (1000 * 60 * 60 * 24));
  const projected = Number((balance * Math.pow(1 + rate, days)).toFixed(2));
  return <div className="text-sm opacity-80">Growth sim (+{rate * 100}%/day): {projected}</div>;
}

function MyAddressQR({ address }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(address)}`;
  return (
    <div className="flex flex-col items-center gap-1 opacity-80">
      <img src={url} alt="QR" className="rounded" />
      <div className="text-xs">Your address (scan at POS)</div>
    </div>
  );
}

function RewardShop({ bizId, balance, canRedeem, onRedeem }) {
  const [rewards, setRewards] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        if (!bizId) return setRewards([]);
        const res = await fetch(`/api/rewards?bizId=${encodeURIComponent(bizId)}`);
        const data = await res.json();
        if (res.ok) setRewards(data.rewards || []);
      } catch (_) {
        setRewards([]);
      }
    })();
  }, [bizId]);
  if (!rewards || rewards.length === 0) return null;
  return (
    <Card className="w-full">
      <CardBody>
        <CardTitle>Rewards</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rewards.map((r) => (
            <Card key={r.id}>
              <CardBody className="flex flex-col gap-2">
                <div className="font-medium">{r.name}</div>
                <div className="text-sm opacity-80">Cost: {r.cost} pts</div>
                <Button variant="info" disabled={!canRedeem || balance < r.cost} onClick={() => onRedeem(r)}>
                  Redeem
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}


