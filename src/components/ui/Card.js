"use client";

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl p-[1px] bg-gradient-to-br from-blue-600/40 to-transparent ${className}`}>
      <div className="rounded-xl bg-[color:var(--card)]/90 border border-white/5 backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }) {
  return <div className={`text-xl font-semibold mb-2 ${className}`}>{children}</div>;
}


