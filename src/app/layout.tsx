import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { SuiteShell } from "../components/layout/SuiteShell";
import "../styles/global.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Vibrium Travel Suite",
  description:
    "Vibrium Travel Suite — command center for corporate desk, forex, traveler care, airlines, hotels, and ride planning.",
};

/** Restores the collapsed sidebar before first paint so the rail never jumps on load. */
const RAIL_SCRIPT = `try{if(localStorage.getItem("vts.sidebar.collapsed")==="1")document.documentElement.dataset.rail="collapsed"}catch(e){}`;

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={plusJakarta.className}>
        <Script id="rail-state" strategy="beforeInteractive">{RAIL_SCRIPT}</Script>
        <SuiteShell>{children}</SuiteShell>
      </body>
    </html>
  );
}
