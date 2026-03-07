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

export const metadata = {
  title: "智網網站 SEO 評估",
  description: "一鍵分析網頁 SEO 分數，找出網站潛在問題，提供專業優化建議，提升搜尋引擎排名。",
  // 圖示設定
   icons: { icon: '/favicon.svg' },
  // 臉書、LINE 分享預覽設定
  openGraph: {
    title: "智網網站 SEO 評估 - 找出您網站的搜尋排名關鍵",
    description: "智網免費 SEO 評估工具，提供速度、結構、標籤等完整檢測，讓您的網站脫穎而出。",
    url: "https://https://seo-scorer-henna.vercel.app/", // 建議改為您的實際網址
    siteName: "智網網站 SEO 專家",
    images: [
      {
        url: "/og-image.webp", // 圖片檔案需放在 public 資料夾內
        width: 1200,
        height: 630,
        alt: "智網網站 SEO 評估工具預覽圖",
      },
    ],
    locale: "zh_TW",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}