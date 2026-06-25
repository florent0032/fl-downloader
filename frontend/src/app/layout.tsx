import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "yt-dlp Web UI",
  description: "Video download system powered by yt-dlp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full flex">
        <Sidebar />
        <main className="flex-1 ml-60 min-h-screen">
          <div className="max-w-[960px] mx-auto px-10 py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
