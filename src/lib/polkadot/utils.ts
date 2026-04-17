import { isAddress } from "@polkadot/util-crypto";

export const HEX32_RE = /^0x[0-9a-fA-F]{64}$/;

export function isValidHex32(v: string) {
  return HEX32_RE.test(v.trim());
}

export function isValidSs58(v: string) {
  try { return isAddress(v.trim()); } catch { return false; }
}

export function fmtNumber(v: bigint | number | string) {
  try {
    const n = typeof v === "bigint" ? v : BigInt(v.toString());
    return n.toLocaleString("en-US");
  } catch {
    return String(v);
  }
}

export function shortAddr(a?: string | null, n = 6) {
  if (!a) return "—";
  return `${a.slice(0, n)}…${a.slice(-n)}`;
}

export function safeStringify(obj: unknown) {
  return JSON.stringify(
    obj,
    (_k, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  );
}
