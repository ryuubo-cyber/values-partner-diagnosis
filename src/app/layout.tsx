import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "価値観パートナー診断",
  description:
    "100問の価値観診断で、あなたの価値観・恋愛傾向・結婚観・お金観を可視化し、理想のパートナー像を明確にします。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
