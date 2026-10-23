"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FULL_MENU_DATA, BUGEESE_CONFIG } from "@/data/brandData";
import { useCart } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";

export default function MenuClient() {
  const { totalCount, openDrawer, addItem, toastMessage } = useCart();

  useEffect(() => {
    // Ensure the page always begins at the top when navigating to Menu
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return (
    <div className="min-h-screen bg-[#17130F] text-[#F6F0E5] relative pt-20">
      {/* ── Cart Drawer Component ── */}
      <CartDrawer />

      {/* ── Confirmation Toast ── */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:top-24 sm:right-6 z-[100] max-w-[90vw] rounded-2xl bg-[#C8201A] px-5 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200 border border-white/20 flex items-center gap-2.5 backdrop-blur-md">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#C8201A] text-xs font-black">✓</span>
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* ── Menu Banner ── */}
      <div className="bg-[#FFBA12] text-[#17130F] px-4 py-14 sm:px-8 sm:py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <span className="inline-block text-xs font-black tracking-widest uppercase bg-[#17130F] text-[#FFBA12] px-3.5 py-1 rounded-full mb-3">
            100% Pure Vegetarian
          </span>
          <h1 className="font-condensed text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-tight leading-none">
            The Bugeese Menu
          </h1>
          <p className="mt-4 text-base sm:text-lg font-medium text-[#17130F]/80 max-w-xl mx-auto">
            From our legendary Bugs Americano Cheese Burger to artisan toasted paninis, loaded fries, and thick shakes. Add items to your cart below.
          </p>
        </div>
      </div>

      {/* ── Menu Categories Grid ── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-14 sm:py-20">
        <div className="space-y-20">
          {FULL_MENU_DATA.map((category) => (
            <div key={category.id} id={category.id} className="scroll-mt-28">
              {/* Category Header */}
              <div className="border-b border-white/10 pb-4 mb-8">
                <h2 className="font-condensed text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
                  {category.title}
                </h2>
                <p className="text-sm sm:text-base text-[#F6F0E5]/70 mt-1">
                  {category.description}
                </p>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-3xl bg-[#2B241D] p-6 border border-white/10 shadow-lg hover:border-[#FFBA12]/40 transition-all group"
                  >
                    <div>
                      {/* Item Top Info */}
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-4 h-4 rounded-xs border border-[#10b981] p-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                          </span>
                          <h3 className="font-condensed text-2xl font-bold uppercase text-white group-hover:text-[#FFBA12] transition-colors">
                            {item.name}
                          </h3>
                        </div>
                        {item.tag && (
                          <span className="shrink-0 text-[10px] font-black uppercase tracking-wider bg-[#FFBA12] text-[#17130F] px-2 py-0.5 rounded-full">
                            {item.tag}
                          </span>
                        )}
                      </div>

                      {/* Item Description */}
                      <p className="text-xs sm:text-sm text-[#F6F0E5]/70 leading-relaxed mb-6">
                        {item.desc}
                      </p>
                    </div>

                    {/* Price & Add to Cart Action */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div>
                        <span className="text-xs text-white/50 block font-medium">Price</span>
                        <span className="font-condensed text-2xl font-black text-[#FFBA12]">
                          ₹{item.price}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => addItem(item)}
                        aria-label={`Add ${item.name} to cart for ₹${item.price}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#C8201A] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-[#b01c13] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        <span className="text-base leading-none">+</span>
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-10 px-4 text-center text-xs text-white/50">
        <p>© 2026 Bugeese Fast Casual. 100% Pure Vegetarian Brand.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/" className="hover:text-white">Home Experience</Link>
          <a href={`mailto:${BUGEESE_CONFIG.contact.email}`} className="hover:text-white">Contact Us</a>
        </div>
      </footer>
    </div>
  );
}
