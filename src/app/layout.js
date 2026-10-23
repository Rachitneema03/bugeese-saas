import { Geist, Geist_Mono, Anton } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import VercelNavbar from "@/components/ui/vercel-navbar";
import MobileFloatingNav from "@/components/ui/MobileFloatingNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Bugeese | 100% Pure Vegetarian Burgers & Fast Casual",
  description: "Experience Bugeese: Handcrafted vegetarian burgers, toasted paninis, crispy sides, and thick shakes. Founded by a 5-star hotel chef in Jabalpur.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#17130F] text-[#F6F0E5] font-sans overflow-x-hidden">
        <AuthProvider>
          <CartProvider>
            <VercelNavbar />
            {children}
            <MobileFloatingNav />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
