import { Card, CardBody, CardTitle } from "../components/ui/Card";

export default function Landing() {
  return (
    <div className="min-h-[calc(70vh-36px-56px)] flex items-center">{/* equal top/bottom gap */}
      <div className="w-full">
        <section className="hero pattern-grid relative overflow-hidden">
          <div className="gradient-blob top-[-80px] left-[10%] animate-float-slower" />
          <div className="gradient-blob top-[-40px] right-[12%] animate-float-slow" />
          <div className="max-w-5xl mx-auto px-4 pt-50 pb-12 text-center relative">
            <div className="text-sm uppercase tracking-[0.2em] opacity-70 animate-fade-up">Loyalty for Web3 businesses</div>
            <h1 className="mt-4 text-6xl font-extrabold tracking-tight animate-fade-up">
            Earn. Track. Redeem. All on-chain
            </h1>
            <p className="mt-4 text-lg opacity-80 animate-fade-up delay-200 max-w-3xl mx-auto">
              A clean, ownership‑first loyalty platform. Mint points, redeem rewards, and see every action on‑chain.
            </p>
            <div className="mt-7 flex items-center justify-center gap-3 animate-fade-up delay-400">
              <a href="" className="px-6 py-3 rounded-md text-white btn-gradient">Get Started</a>
              <a href="/merchant" className="px-6 py-3 rounded-md bg-slate-800 hover:bg-slate-700">Merchant</a>
              <a href="/customer" className="px-6 py-3 rounded-md bg-slate-800 hover:bg-slate-700">Customer</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
    

