import React from "react";

/**
 * Geometrijski znak za NaLageru: izometrijski paket/modul čija je gornja ravan
 * osvetljena u Signal Limeta (#C9F36B) boji, a bočne stranice u Navy / svetloj skali.
 */
export function NaLageruMark({
  className = "h-8 w-8",
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const bg = tone === "dark" ? "#172F46" : "#0F2133";
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="40" height="40" rx="9" fill={bg} />
      <path d="M20 7 L33 14.2 L20 21.4 L7 14.2 Z" fill="#C9F36B" />
      <path d="M7 14.2 L20 21.4 L20 33.5 L7 26.3 Z" fill="#F5F7F9" />
      <path d="M33 14.2 L33 26.3 L20 33.5 L20 21.4 Z" fill="#93ABC1" />
    </svg>
  );
}

export function Logo({
  tone = "dark",
  size = "md",
  showTagline = false,
  className = "",
}: {
  tone?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}) {
  const markSize =
    size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const textSize =
    size === "sm"
      ? "text-lg"
      : size === "lg"
        ? "text-2xl"
        : "text-[1.45rem]";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <NaLageruMark tone={tone} className={markSize} />
      <span className="flex flex-col">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`font-heading ${textSize} font-extrabold tracking-tight leading-none ${
              tone === "dark" ? "text-brand-700" : "text-white"
            }`}
          >
            Na
            <span
              className={tone === "dark" ? "text-brand-700" : "text-accent-400"}
            >
              Lageru
            </span>
          </span>
          <span
            className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-extrabold leading-none ${
              tone === "dark"
                ? "bg-accent-400 text-brand-700"
                : "bg-brand-800 text-accent-400 border border-brand-600"
            }`}
          >
            .rs
          </span>
        </span>
        {showTagline && (
          <span
            className={`mt-0.5 text-[10px] font-medium leading-none ${
              tone === "dark" ? "text-slate-500" : "text-slate-300"
            }`}
          >
            Proveren status lagera i isporuke
          </span>
        )}
      </span>
    </span>
  );
}
