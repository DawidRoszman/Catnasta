import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { CookiesProvider } from "next-client-cookies/server";
import { UserContextProvider } from "./components/UserContext";
import { FeedbackProvider } from "./components/ui/Feedback";
import Announcements from "./components/Announcements";
import SiteHeader from "./components/SiteHeader";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "opsz"],
});
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: {
    default: "Catnasta",
    template: "%s · Catnasta",
  },
  description: "Catnasta is a feline twist on the classic card game Canasta. Play head-to-head in 3D.",
};

export const viewport: Viewport = {
  themeColor: "#06150f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Extensions such as LanguageTool and Grammarly add attributes to <html> and
    // <body> before React hydrates; ignore those (this only applies one level deep).
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <CookiesProvider>
          <FeedbackProvider>
            <UserContextProvider>
              <div className="relative z-10 flex min-h-dvh flex-col">
                <SiteHeader />
                {children}
              </div>
              <Announcements />
            </UserContextProvider>
          </FeedbackProvider>
        </CookiesProvider>
      </body>
    </html>
  );
}
