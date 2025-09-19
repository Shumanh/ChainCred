import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Link from "next/link";
import ToastContainer from "../components/ui/Toast";
import Footer from "../components/Footer";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Solana Loyalty",
  description: "Multi-business loyalty on Solana (Devnet)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Providers>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
        <ToastContainer />
      </body>
    </html>
  );
}

function Nav() {
  return (
    <div className="w-full sticky top-2 z-40 bg-[#0d1222]/70 backdrop-blur h-9">
      <div className="max-w-5xl mx-auto h-full flex items-center justify-between px-2">
        <Link href="/" className="font-semibold text-white/90 select-none" aria-label="Home">ChainCred</Link>
        <div className="flex items-center gap-10  opacity-80">
          <Link href="/customer" className="hover:opacity-100 text-white/90" aria-label="Customer">Customer</Link>
          <Link href="/merchant" className="hover:opacity-100 text-white/90" aria-label="Merchant">Merchant</Link>
          <Link href="/admin" className="hover:opacity-100 text-white/90" aria-label="Admin">Admin</Link>
        </div>
      </div>
    </div>
  );

}