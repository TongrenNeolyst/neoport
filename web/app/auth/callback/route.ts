import { NextResponse, type NextRequest } from "next/server";

import { exchangeCodeForSession, verifyOtp } from "@/features/auth/server";

type OtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

const OTP_TYPES: readonly OtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isSafeNextPath(next: string) {
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.includes("://")) return false;
  if (next.includes("\\")) return false;
  return true;
}

function parseOtpType(raw: string): OtpType | null {
  const t = raw as OtpType;
  return OTP_TYPES.includes(t) ? t : null;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/desktop";
  const redirectTo = isSafeNextPath(next) ? next : "/desktop";

  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  try {
    if (code) {
      const res = await exchangeCodeForSession({ code });
      if (!res.ok) {
        return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
      }
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    if (token_hash && type) {
      const otpType = parseOtpType(type);
      if (!otpType) {
        return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
      }
      const res = await verifyOtp({ token_hash, type: otpType });
      if (!res.ok) {
        return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
      }
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  } catch {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }
}
