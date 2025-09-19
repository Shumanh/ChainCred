// "use client";

// import { useEffect, useMemo, useState } from "react";
// import {
//   ConnectionProvider,
//   WalletProvider,
//   useWallet,
// } from "@solana/wallet-adapter-react";
// import { WalletModalProvider, useWalletModal } from "@solana/wallet-adapter-react-ui";
// import {
//   PhantomWalletAdapter,
//   SolflareWalletAdapter,
//   UnsafeBurnerWalletAdapter,
// } from "@solana/wallet-adapter-wallets";
// import { clusterApiUrl } from "@solana/web3.js";
// import "@solana/wallet-adapter-react-ui/styles.css";

// export default function Providers({ children }) {
//   const endpoint = useMemo(() => {
//     return process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet");
//   }, []);

//   const [wallets, setWallets] = useState([]);

//   useEffect(() => {
//     if (typeof window === "undefined") return;
//     const list = [];
//     // Always include Phantom so the modal can prompt install if not detected
//     list.push(new PhantomWalletAdapter());
//     list.push(new SolflareWalletAdapter({ network: "devnet" }));
//     if (process.env.NEXT_PUBLIC_ENABLE_BURNER === "true") {
//       list.push(new UnsafeBurnerWalletAdapter());
//     }
//     setWallets(list);
//   }, []);

//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       const isPhantom = !!window?.phantom?.solana || !!window?.solana?.isPhantom;
//       const origin = window.location.origin;
//       // Helpful diagnostics for Phantom connection issues
//       console.log("Wallet debug:", {
//         origin,
//         isPhantom,
//         hasWindowSolana: !!window?.solana,
//         networkEndpoint: endpoint,
//       });
//     }
//   }, [endpoint]);

//   return (
//     <ConnectionProvider endpoint={endpoint}>
//       <WalletProvider
//         wallets={wallets}
//         autoConnect={false}
//         localStorageKey="dapPerksWallet"
//         onError={(error) => {
//           // Surface adapter errors in dev console for easier debugging
//           console.error("Wallet adapter error:", error?.name || error, error?.message || "");
//         }}
//       >
//         <WalletModalProvider>
//           <AutoOpenWalletModal />
//           {children}
//         </WalletModalProvider>
//       </WalletProvider>
//     </ConnectionProvider>
//   );
// }

// function AutoOpenWalletModal() {
//   const { connected } = useWallet();
//   const { setVisible } = useWalletModal();

//   useEffect(() => {
//     if (!connected) setVisible(true);
//   }, [connected, setVisible]);

//   return null;
// }



"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider, useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { UnsafeBurnerWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function Providers({ children }) {
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet");
  }, []);

  // ✅ UseMemo instead of useEffect + state
  const wallets = useMemo(() => {
    const list = [];
    list.push(new PhantomWalletAdapter());
    list.push(new SolflareWalletAdapter({ network: "devnet" }));
    if (process.env.NEXT_PUBLIC_ENABLE_BURNER === "true") {
      list.push(new UnsafeBurnerWalletAdapter());
    }
    return list;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key = "dapPerksWallet";
      const stored = window.localStorage.getItem(key);
      if (!stored) return;
      const selected = wallets.find((w) => w?.name === stored);
      const ready = selected && (selected.readyState === "Installed" || selected.readyState === "Loadable");
      if (!ready) {
        window.localStorage.removeItem(key);
      }
    } catch (_) {}
  }, [wallets]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={(error) => {
          console.error(
            "Wallet adapter error:",
            error?.name || error,
            error?.message || ""
          );
          if (typeof window !== "undefined" && (error?.name === "WalletNotReadyError" || error?.name === "WalletConnectionError")) {
            try {
              window.localStorage.removeItem("dapPerksWallet");
            } catch (_) {}
            window.dispatchEvent(new CustomEvent("wallet-not-ready"));
          }
        }}
      >
        <WalletModalProvider>
          <AutoOpenWalletModal />
          <WalletNotReadyHandler />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function AutoOpenWalletModal() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const pathname = usePathname();

  useEffect(() => {
    // Open the wallet modal on customer/merchant pages when not connected
    const allow = (pathname || "/").startsWith("/customer") || (pathname || "/").startsWith("/merchant");
    if (!connected && allow) {
      const id = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(id);
    }
  }, [connected, setVisible, pathname]);

  return null;
}

function WalletNotReadyHandler() {
  const { setVisible } = useWalletModal();
  useEffect(() => {
    function onNotReady() {
      setTimeout(() => setVisible(true), 800);
    }
    window.addEventListener("wallet-not-ready", onNotReady);
    return () => window.removeEventListener("wallet-not-ready", onNotReady);
  }, [setVisible]);
  return null;
}
