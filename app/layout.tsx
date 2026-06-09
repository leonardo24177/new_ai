import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Assistente AI — Il tuo assistente professionale personalizzato",
  description: "Configura un assistente AI su misura per la tua professione. Fonti attendibili, ambiti separati, skill specializzate per avvocati, commercialisti, ingegneri e altri professionisti italiani.",
  openGraph: {
    title: "Assistente AI",
    description: "Il tuo assistente AI personalizzato per lavoro, studio e uso personale.",
    type: "website",
    locale: "it_IT",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
