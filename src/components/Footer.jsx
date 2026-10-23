"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BUGEESE_CONFIG } from "@/data/brandData";

export default function Footer() {
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 800) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <footer id="outlets" className="relative z-10 w-full bg-[#17130F] text-[#F6F0E5] border-t border-white/10 pt-20 pb-12 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-16 border-b border-white/10">
          
          {/* Brand Col */}
          <div className="lg:col-span-5">
            <Link href="/" className="inline-block mb-4">
              <span className="font-condensed text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
                BUGEESE<span className="text-[#D9251B]">.</span>
              </span>
            </Link>
            <p className="text-sm font-bold tracking-widest uppercase text-[#FFBA12] mb-3">
              100% Pure Vegetarian Fast Casual
            </p>
            <p className="text-sm text-[#F6F0E5]/70 max-w-sm leading-relaxed mb-6">
              Handcrafted burgers, artisan paninis, fresh fries & thick shakes. Founded by a 5-star hotel chef in Jabalpur to bring uncompromising gourmet standards to vegetarian street culture.
            </p>
            <div className="flex gap-4">
              <a
                href={BUGEESE_CONFIG.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#FFBA12] hover:text-[#17130F] transition-colors"
                aria-label="Bugeese Instagram"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href={BUGEESE_CONFIG.social.website}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#D9251B] transition-colors"
                aria-label="Bugeese Official Site"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-3">
            <h4 className="font-condensed text-xl font-bold uppercase tracking-wider text-white mb-4">
              Explore
            </h4>
            <ul className="space-y-3 text-sm text-[#F6F0E5]/80">
              <li>
                <Link href="/menu" className="hover:text-[#FFBA12] transition-colors">
                  Full Food Menu
                </Link>
              </li>
              <li>
                <a href="#menu-preview" className="hover:text-[#FFBA12] transition-colors">
                  Pick Your Craving
                </a>
              </li>
              <li>
                <a href="#vegetarian-story" className="hover:text-[#FFBA12] transition-colors">
                  Why 100% Pure Veg
                </a>
              </li>
              <li>
                <a href="#outlets" className="hover:text-[#FFBA12] transition-colors">
                  Outlet Locations
                </a>
              </li>
            </ul>
          </div>

          {/* Outlets & Contact */}
          <div className="lg:col-span-4">
            <h4 className="font-condensed text-xl font-bold uppercase tracking-wider text-white mb-4">
              Outlets & Contact
            </h4>
            <div className="space-y-4 text-sm text-[#F6F0E5]/80">
              <div>
                <span className="font-bold text-white block">Main Headquarters:</span>
                <span>{BUGEESE_CONFIG.contact.address}</span>
              </div>
              <div>
                <span className="font-bold text-white block">Jabalpur Outlets:</span>
                <span className="text-xs text-[#F6F0E5]/70 block">Vijay Nagar &bull; Wright Town &bull; Napier Town</span>
              </div>
              <div>
                <span className="font-bold text-white block">Call for Inquiries:</span>
                <a href={`tel:${BUGEESE_CONFIG.contact.phone}`} className="text-[#FFBA12] hover:underline">
                  {BUGEESE_CONFIG.contact.phoneDisplay}
                </a>
              </div>
              <div>
                <span className="font-bold text-white block">Official Email:</span>
                <a href={`mailto:${BUGEESE_CONFIG.contact.email}`} className="text-[#FFBA12] hover:underline">
                  {BUGEESE_CONFIG.contact.email}
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-white/50 gap-4">
          <p>© 2026 Bugeese. All rights reserved. 100% Pure Vegetarian Brand.</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/menu" className="hover:text-white transition-colors">Menu</Link>
            <a href="#outlets" className="hover:text-white transition-colors">Outlets</a>
          </div>
        </div>
      </div>

      {/* Floating Back to Top Button */}
      {showTopBtn && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFBA12] text-[#17130F] shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-amber-400 focus:outline-hidden focus:ring-4 focus:ring-amber-400/50"
        >
          <svg className="w-6 h-6 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </footer>
  );
}
