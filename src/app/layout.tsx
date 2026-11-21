import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "SAPA-UJI — Pahami Penelitiannya, Kenali Haknya", description: "Materi literasi penelitian klinis yang mudah dipahami, untuk mendukung diskusi dan keputusan secara sukarela." };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>){return <html lang="id"><body>{children}</body></html>}
