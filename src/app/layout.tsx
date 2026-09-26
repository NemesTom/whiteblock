import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Whiteblock Visualizer & Tuning Configurator",
  description: "Interactive 3D Volvo Whiteblock tuning simulator with dyno and failure physics.",
};

// Static-build CSP fallback (GitHub Pages serves no headers and nonces are
// impossible in <meta>). The Docker/VPS flow additionally enforces the
// stricter nonce policy via middleware headers — dual policies combine
// restrictively, so this never weakens that deployment.
const META_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <meta httpEquiv="Content-Security-Policy" content={META_CSP} />
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
