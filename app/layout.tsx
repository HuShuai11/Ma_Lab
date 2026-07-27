import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://csic-lab-showcase-2026.biqgoppdxkngu.chatgpt.site",
  ),
  title: "马乐课题组 | 东北电力大学自动化工程学院",
  description:
    "东北电力大学自动化工程学院马乐课题组，研究智能机器人与系统、电力机器人与智能控制、计算机视觉电力应用及智慧能源系统。",
  openGraph: {
    title: "马乐课题组 | 东北电力大学自动化工程学院",
    description: "智能机器人 · 人工智能与控制 · 计算机视觉 · 智慧能源",
    type: "website",
    locale: "zh_CN",
    images: [{ url: "/og-ma-lab.png", width: 1680, height: 945, alt: "马乐课题组" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "马乐课题组 | 东北电力大学自动化工程学院",
    description: "智能机器人 · 人工智能与控制 · 计算机视觉 · 智慧能源",
    images: ["/og-ma-lab.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
