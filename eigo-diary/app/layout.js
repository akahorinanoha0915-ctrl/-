import "./globals.css";

export const metadata = {
  title: "英語日記アプリ | English Diary",
  description: "小学生向けの英語日記アプリ。AIのMs. Sunnyがコメントを返してくれます。",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport = {
  themeColor: "#0ea5e9",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
