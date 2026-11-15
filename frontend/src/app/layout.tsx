import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const sans = Geist({ variable: "--font-sans-face", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono-face", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-serif-face", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "PaperTrail — a calm workspace for your research reading", template: "%s · PaperTrail" },
  description: "Collect, read, annotate and cite academic papers. Track reading progress and organize research projects.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable} ${serif.variable} antialiased`}>
      <body className="min-h-dvh bg-paper text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
