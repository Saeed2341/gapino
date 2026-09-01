import { Vazirmatn } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import AuthProvider from "@/context/AuthContext";
import SocketProvider from "@/context/SocketContext";
import PwaRegister from "@/components/PwaRegister";
const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata = {
  title: "گپینو | Gapino",
  description: "پیام‌رسان مدرن، سریع و امن با چت شخصی و گروهی",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "گپینو" },
  icons: { icon: "/icons/icon.svg" },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem("gapino-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${vazirmatn.variable} font-sans bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>{children}</SocketProvider>
          </AuthProvider>
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
