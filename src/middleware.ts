import { NextRequest, NextResponse } from 'next/server';

/**
 * Per-request CSP nonce (Next.js picks `x-nonce` up for its own inline
 * bootstrap scripts) plus baseline hardening headers. Everything the app
 * loads is same-origin: fonts are build-time self-hosted, lighting is
 * procedural, models live under /public.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Tailwind/drei set styles at runtime; style attributes can't exfiltrate.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    // drei meshopt/KTX2 decoders for future user-supplied GLBs.
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');

  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  return response;
}

export const config = {
  matcher: '/:path*',
};
