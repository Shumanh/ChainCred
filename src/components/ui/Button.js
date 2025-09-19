"use client";

const base = "inline-flex items-center justify-center rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const sizes = {
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2",
  lg: "px-5 py-2.5 text-lg",
};
const variants = {
  primary: "bg-blue-600 hover:bg-blue-500",
  secondary: "bg-slate-700 hover:bg-slate-600",
  success: "bg-green-600 hover:bg-green-500",
  danger: "bg-red-600 hover:bg-red-500",
  info: "bg-indigo-600 hover:bg-indigo-500",
  warning: "bg-amber-600 hover:bg-amber-500",
};

export default function Button({ children, className = "", variant = "primary", size = "md", ...props }) {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  return (
    <button {...props} className={`${base} ${s} ${v} ${className}`}>
      {children}
    </button>
  );
}


