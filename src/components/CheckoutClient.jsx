"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { BUGEESE_CONFIG } from "@/data/brandData";
import { useAuth } from "@/context/AuthContext";
import TierProgressCard from "@/components/ui/TierProgressCard";

const DRAFT_STORAGE_KEY = "bugeese_checkout_draft";

function getDraftSnapshot() {
  if (typeof window === "undefined") return "{}";
  return localStorage.getItem(DRAFT_STORAGE_KEY) || "{}";
}

function getServerSnapshot() {
  return "{}";
}

function subscribeDraft(callback) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export default function CheckoutClient() {
  const router = useRouter();
  const { items, totalCount, subtotal, clearCart } = useCart();
  const { user, profile } = useAuth();
  const [quoteData, setQuoteData] = useState(null);
  const [isQuoting, setIsQuoting] = useState(false);

  // Read stored draft safely using useSyncExternalStore
  const draftRaw = useSyncExternalStore(subscribeDraft, getDraftSnapshot, getServerSnapshot);

  const initialDraft = (() => {
    try {
      return JSON.parse(draftRaw);
    } catch {
      return {};
    }
  })();

  // Current Step: 1 (Order Type), 2 (Customer Details), 3 (Review Order), 4 (Confirmation)
  const [currentStep, setCurrentStep] = useState(
    initialDraft.currentStep && initialDraft.currentStep < 4 ? initialDraft.currentStep : 1
  );

  // Form State
  const [orderType, setOrderType] = useState(initialDraft.orderType || "delivery");
  const [customerDetails, setCustomerDetails] = useState({
    name: initialDraft.customerDetails?.name || "",
    phone: initialDraft.customerDetails?.phone || "",
    houseNumber: initialDraft.customerDetails?.houseNumber || "",
    street: initialDraft.customerDetails?.street || "",
    city: initialDraft.customerDetails?.city || "Jabalpur",
    state: initialDraft.customerDetails?.state || "Madhya Pradesh",
    pinCode: initialDraft.customerDetails?.pinCode || "",
    instructions: initialDraft.customerDetails?.instructions || "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmed Order Snapshot state (persisted across active cart clear)
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Fetch Authoritative Quote with Feature 2 Tier Incentive from Backend Engine
  useEffect(() => {
    if (items.length === 0) return;
    let isMounted = true;
    async function fetchQuote() {
      setIsQuoting(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const quotePayload = {
          items: items.map(item => ({
            menu_item_id: item.menu_item_id || 1,
            qty: item.quantity
          })),
          user_id: user?.id || null,
          tier: profile?.tier || "bronze",
          acquisition_class: "qr_attributed"
        };
        const res = await fetch(`${apiUrl}/api/orders/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quotePayload)
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setQuoteData(data);
        }
      } catch (err) {
        // Fallback calculation using pure Feature 2 logic
        const subtotalPaise = subtotal * 100;
        const commissionPaise = Math.round(subtotalPaise * 0.25);
        const postedBal = (profile?.commission_avoided || 350) * 100;
        const projBal = postedBal + commissionPaise;
        const isUpgrade = projBal >= 50000 && postedBal < 50000;
        if (isMounted) {
          setQuoteData({
            tier_view: {
              currentTier: profile?.tier || "bronze",
              currentTierName: (profile?.tier || "bronze").toUpperCase(),
              applicableTier: isUpgrade ? "silver" : (profile?.tier || "bronze"),
              applicableTierName: isUpgrade ? "Silver" : "Bronze",
              isTierUpgrade: isUpgrade,
              postedBalancePaise: postedBal,
              projectedBalancePaise: projBal,
              orderCommissionAvoidedPaise: commissionPaise,
              progressText: isUpgrade ? null : `₹${Math.max(0, Math.round((50000 - postedBal)/100))} commission avoided toward Silver.`,
              projectedUpgradeMessage: isUpgrade ? "Complete this order to reach Silver!" : null,
              discountPaise: Math.min(Math.floor(commissionPaise * 0.6), 1500),
              totalToPayPaise: Math.max(0, subtotalPaise - Math.min(Math.floor(commissionPaise * 0.6), 1500))
            }
          });
        }
      } finally {
        if (isMounted) setIsQuoting(false);
      }
    }
    fetchQuote();
    return () => { isMounted = false; };
  }, [items, user, profile, subtotal]);

  // Save draft whenever inputs change before completion
  useEffect(() => {
    if (currentStep < 4 && typeof window !== "undefined") {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ orderType, customerDetails, currentStep })
        );
      } catch {
        // ignore
      }
    }
  }, [orderType, customerDetails, currentStep]);

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerDetails((prev) => ({ ...prev, [name]: value }));
    // Clear error for field on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Validate Step 2 (Customer Details)
  const validateDetails = () => {
    const newErrors = {};

    if (!customerDetails.name.trim()) {
      newErrors.name = "Full name is required";
    }

    // Phone validation (Indian 10-digit format)
    const phoneClean = customerDetails.phone.replace(/[^0-9]/g, "");
    if (!phoneClean || phoneClean.length < 10) {
      newErrors.phone = "Enter a valid 10-digit mobile number";
    }

    if (orderType === "delivery") {
      if (!customerDetails.houseNumber.trim()) {
        newErrors.houseNumber = "House / Flat / Building is required";
      }
      if (!customerDetails.street.trim()) {
        newErrors.street = "Street / Area is required";
      }
      if (!customerDetails.city.trim()) {
        newErrors.city = "City is required";
      }
      if (!customerDetails.state.trim()) {
        newErrors.state = "State is required";
      }
      const pinClean = customerDetails.pinCode.replace(/[^0-9]/g, "");
      if (!pinClean || pinClean.length !== 6) {
        newErrors.pinCode = "Enter a valid 6-digit Indian PIN code";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 1 -> Step 2
  const goToStep2 = () => {
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 2 -> Step 3
  const goToStep3 = (e) => {
    e.preventDefault();
    if (validateDetails()) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Step 3 -> Confirm Demo Order (Step 4)
  const handleConfirmOrder = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Generate unique frontend demo order reference: BG-DEMO-XXXXXX
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const orderRef = `BG-DEMO-${randomCode}`;

    // Snapshot current state
    const orderSnapshot = {
      orderRef,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      orderType,
      customerDetails: { ...customerDetails },
      items: [...items],
      totalCount,
      subtotal,
    };

    setConfirmedOrder(orderSnapshot);
    setCurrentStep(4);
    setIsSubmitting(false);

    // Clear active cart & draft after order generation
    clearCart();
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Empty cart checkout state (if accessed directly and not on confirmation screen)
  if (items.length === 0 && currentStep !== 4 && !confirmedOrder) {
    return (
      <div className="min-h-screen bg-[#17130F] text-[#F6F0E5] flex flex-col justify-between">
        <header className="border-b border-white/10 px-4 sm:px-8 py-4 bg-[#1B1A17]">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <Link href="/" className="font-condensed text-3xl font-black uppercase text-white">
              BUGEESE<span className="text-[#D9251B]">.</span>
            </Link>
            <Link href="/menu" className="text-sm font-bold text-[#FFBA12] hover:underline">
              &larr; Back to Menu
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-20 text-center">
          <div className="max-w-md rounded-3xl bg-[#2B241D] p-8 sm:p-12 border border-white/10 shadow-2xl">
            <div className="text-5xl mb-4">🍔</div>
            <h1 className="font-condensed text-3xl sm:text-4xl font-black uppercase text-white mb-3">
              Your Cart is Empty
            </h1>
            <p className="text-sm sm:text-base text-[#F6F0E5]/75 mb-8 leading-relaxed">
              You haven&apos;t added any items to your order yet. Explore our handcrafted vegetarian burgers, toasted paninis, and sides to start checkout.
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center justify-center rounded-full bg-[#FFBA12] px-8 py-3.5 text-sm font-black uppercase tracking-wider text-[#17130F] shadow-lg hover:bg-amber-400 transition-all hover:scale-105"
            >
              Browse Food Menu
            </Link>
          </div>
        </main>

        <footer className="border-t border-white/10 py-6 text-center text-xs text-white/50">
          © 2026 Bugeese Fast Casual. Frontend Checkout Demo.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#17130F] text-[#F6F0E5] flex flex-col justify-between">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 w-full bg-[#17130F]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-condensed text-3xl font-black uppercase tracking-tight text-white">
              BUGEESE<span className="text-[#D9251B]">.</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {currentStep < 4 ? (
              <Link
                href="/menu"
                className="text-xs sm:text-sm font-bold text-white/70 hover:text-[#FFBA12] transition-colors"
              >
                &larr; <span className="hidden sm:inline">Return to Menu</span><span className="sm:hidden">Menu</span>
              </Link>
            ) : (
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                Demo Completed
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Checkout Container ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        
        {/* Progress Tracker (Steps 1 to 3) */}
        {currentStep < 4 && (
          <div className="mb-10 sm:mb-14 max-w-2xl mx-auto">
            <div className="flex items-center justify-between relative">
              {/* Connector line */}
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-white/10 z-0" />
              <div
                className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-[#C8201A] transition-all duration-300 z-0"
                style={{ width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%" }}
              />

              {/* Step 1 Indicator */}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`relative z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full font-condensed text-lg sm:text-xl font-black transition-all cursor-pointer ${
                  currentStep >= 1
                    ? "bg-[#C8201A] text-white shadow-lg ring-4 ring-[#17130F]"
                    : "bg-[#2B241D] text-white/50"
                }`}
              >
                1
              </button>

              {/* Step 2 Indicator */}
              <button
                type="button"
                onClick={() => (currentStep > 2 ? setCurrentStep(2) : null)}
                disabled={currentStep < 2}
                className={`relative z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full font-condensed text-lg sm:text-xl font-black transition-all cursor-pointer ${
                  currentStep >= 2
                    ? "bg-[#C8201A] text-white shadow-lg ring-4 ring-[#17130F]"
                    : "bg-[#2B241D] text-white/50"
                }`}
              >
                2
              </button>

              {/* Step 3 Indicator */}
              <button
                type="button"
                disabled={currentStep < 3}
                className={`relative z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full font-condensed text-lg sm:text-xl font-black transition-all cursor-pointer ${
                  currentStep >= 3
                    ? "bg-[#C8201A] text-white shadow-lg ring-4 ring-[#17130F]"
                    : "bg-[#2B241D] text-white/50"
                }`}
              >
                3
              </button>
            </div>

            <div className="flex justify-between text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/60 mt-3 text-center">
              <span className={currentStep === 1 ? "text-[#FFBA12]" : ""}>1. Order Type</span>
              <span className={currentStep === 2 ? "text-[#FFBA12]" : ""}>2. Your Details</span>
              <span className={currentStep === 3 ? "text-[#FFBA12]" : ""}>3. Review Order</span>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* STEP 1: SELECT ORDER TYPE                                   */}
        {/* ─────────────────────────────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <span className="text-xs font-black uppercase tracking-widest text-[#FFBA12] block mb-2">
                Checkout Step 1 of 3
              </span>
              <h1 className="font-condensed text-4xl sm:text-5xl md:text-6xl font-black uppercase text-white leading-none">
                How Would You Like Your Bugeese?
              </h1>
              <p className="mt-3 text-sm sm:text-base text-[#F6F0E5]/70">
                Choose how you want to receive your fresh 100% vegetarian order.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
              {/* Option A: Delivery */}
              <div
                onClick={() => setOrderType("delivery")}
                className={`cursor-pointer rounded-3xl p-6 sm:p-7 border-2 transition-all flex flex-col justify-between ${
                  orderType === "delivery"
                    ? "bg-[#2B241D] border-[#C8201A] shadow-xl ring-2 ring-[#C8201A]/30"
                    : "bg-[#2B241D]/50 border-white/10 hover:border-white/20"
                }`}
                role="radio"
                aria-checked={orderType === "delivery"}
                tabIndex={0}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">🛵</span>
                    <div
                      className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                        orderType === "delivery" ? "border-[#C8201A] bg-[#C8201A]" : "border-white/30"
                      }`}
                    >
                      {orderType === "delivery" && <span className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <h3 className="font-condensed text-2xl sm:text-3xl font-black uppercase text-white mb-2">
                    Doorstep Delivery
                  </h3>
                  <p className="text-xs sm:text-sm text-[#F6F0E5]/75 leading-relaxed">
                    Get your favourites delivered to your address fresh and piping hot.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 text-xs font-bold text-[#FFBA12]">
                  Available in Jabalpur areas
                </div>
              </div>

              {/* Option B: Pickup / Takeaway */}
              <div
                onClick={() => setOrderType("pickup")}
                className={`cursor-pointer rounded-3xl p-6 sm:p-7 border-2 transition-all flex flex-col justify-between ${
                  orderType === "pickup"
                    ? "bg-[#2B241D] border-[#C8201A] shadow-xl ring-2 ring-[#C8201A]/30"
                    : "bg-[#2B241D]/50 border-white/10 hover:border-white/20"
                }`}
                role="radio"
                aria-checked={orderType === "pickup"}
                tabIndex={0}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">🛍️</span>
                    <div
                      className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                        orderType === "pickup" ? "border-[#C8201A] bg-[#C8201A]" : "border-white/30"
                      }`}
                    >
                      {orderType === "pickup" && <span className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>
                  <h3 className="font-condensed text-2xl sm:text-3xl font-black uppercase text-white mb-2">
                    Pickup / Takeaway
                  </h3>
                  <p className="text-xs sm:text-sm text-[#F6F0E5]/75 leading-relaxed">
                    Place your order ahead and collect it directly from your nearest outlet counter.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 text-xs font-bold text-[#FFBA12]">
                  Vijay Nagar &bull; Wright Town
                </div>
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
              <Link
                href="/menu"
                className="text-xs sm:text-sm font-bold text-white/60 hover:text-white"
              >
                &larr; Back to Cart &amp; Menu
              </Link>
              <button
                type="button"
                onClick={goToStep2}
                className="w-full sm:w-auto rounded-full bg-[#C8201A] px-10 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg hover:bg-[#b01c13] transition-transform hover:scale-105 cursor-pointer"
              >
                Continue to Details &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* STEP 2: CUSTOMER DETAILS                                    */}
        {/* ─────────────────────────────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <span className="text-xs font-black uppercase tracking-widest text-[#FFBA12] block mb-2">
                Checkout Step 2 of 3
              </span>
              <h1 className="font-condensed text-4xl sm:text-5xl md:text-6xl font-black uppercase text-white leading-none">
                Your Details
              </h1>
              <p className="mt-3 text-sm sm:text-base text-[#F6F0E5]/70">
                {orderType === "delivery"
                  ? "Enter your contact and address information for doorstep delivery."
                  : "Enter your contact details so the outlet knows who is picking up the order."}
              </p>
            </div>

            <form onSubmit={goToStep3} className="rounded-3xl bg-[#2B241D] p-6 sm:p-10 border border-white/10 shadow-2xl space-y-6">
              
              {/* Basic Contact Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FFBA12]">
                  Contact Information
                </h3>

                <div>
                  <label htmlFor="name" className="block text-xs font-bold uppercase text-white/80 mb-1.5">
                    Full Name <span className="text-[#C8201A]">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={customerDetails.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl bg-[#17130F] border border-white/15 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#FFBA12] focus:outline-hidden"
                  />
                  {errors.name && <p className="mt-1 text-xs text-[#C8201A] font-semibold">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-bold uppercase text-white/80 mb-1.5">
                    Mobile Phone Number <span className="text-[#C8201A]">*</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-white/15 bg-white/5 text-xs text-white/60 font-bold">
                      +91
                    </span>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={customerDetails.phone}
                      onChange={handleInputChange}
                      placeholder="9876543210"
                      maxLength={10}
                      className="w-full rounded-r-xl bg-[#17130F] border border-white/15 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#FFBA12] focus:outline-hidden"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-[#C8201A] font-semibold">{errors.phone}</p>}
                </div>
              </div>

              {/* Delivery Address Fields (Delivery only) */}
              {orderType === "delivery" && (
                <div className="space-y-4 pt-6 border-t border-white/10">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#FFBA12]">
                    Delivery Address (Jabalpur Area)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="houseNumber" className="block text-xs font-bold uppercase text-white/80 mb-1.5">
                        House / Flat / Building <span className="text-[#C8201A]">*</span>
                      </label>
                      <input
                        type="text"
                        id="houseNumber"
                        name="houseNumber"
                        value={customerDetails.houseNumber}
                        onChange={handleInputChange}
                        placeholder="e.g. Flat 402, Royal Palms"
                        className="w-full rounded-xl bg-[#17130F] border border-white/15 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#FFBA12] focus:outline-hidden"
                      />
                      {errors.houseNumber && <p className="mt-1 text-xs text-[#C8201A] font-semibold">{errors.houseNumber}</p>}
                    </div>

                    <div>
                      <label htmlFor="street" className="block text-xs font-bold uppercase text-white/80 mb-1.5">
                        Street / Colony / Landmark <span className="text-[#C8201A]">*</span>
                      </label>
                      <input
                        type="text"
                        id="street"
                        name="street"
                        value={customerDetails.street}
                        onChange={handleInputChange}
                        placeholder="e.g. Near Vijay Nagar Square"
                        className="w-full rounded-xl bg-[#17130F] border border-white/15 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#FFBA12] focus:outline-hidden"
                      />
                      {errors.street && <p className="mt-1 text-xs text-[#C8201A] font-semibold">{errors.street}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-xs font-bold uppercase text-white/80 mb-1.5">
                        City <span className="text-[#C8201A]">*</span>
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={customerDetails.city}
                        onChange={handleInputChange}
                        className="w-full rounded-xl bg-[#17130F] border border-white/15 px-4 py-3 text-sm text-white focus:border-[#FFBA12] focus:outline-hidden"
                      />
                      {errors.city && <p className="mt-1 text-xs text-[#C8201A] font-semibold">{errors.city}</p>}
                    </div>

                    <div>
                      <label htmlFor="state" className="block text-xs font-bold uppercase text-white/80 mb-1.5">
                        State <span className="text-[#C8201A]">*</span>
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={customerDetails.state}
                        onChange={handleInputChange}
                        className="w-full rounded-xl bg-[#17130F] border border-white/15 px-4 py-3 text-sm text-white focus:border-[#FFBA12] focus:outline-hidden"
                      />
                      {errors.state && <p className="mt-1 text-xs text-[#C8201A] font-semibold">{errors.state}</p>}
                    </div>

                    <div>
                      <label htmlFor="pinCode" className="block text-xs font-bold uppercase text-white/80 mb-1.5">
                        PIN Code <span className="text-[#C8201A]">*</span>
                      </label>
                      <input
                        type="text"
                        id="pinCode"
                        name="pinCode"
                        value={customerDetails.pinCode}
                        onChange={handleInputChange}
                        placeholder="482002"
                        maxLength={6}
                        className="w-full rounded-xl bg-[#17130F] border border-white/15 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#FFBA12] focus:outline-hidden"
                      />
                      {errors.pinCode && <p className="mt-1 text-xs text-[#C8201A] font-semibold">{errors.pinCode}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="instructions" className="block text-xs font-bold uppercase text-white/80 mb-1.5">
                      Optional Delivery Instructions
                    </label>
                    <input
                      type="text"
                      id="instructions"
                      name="instructions"
                      value={customerDetails.instructions}
                      onChange={handleInputChange}
                      placeholder="e.g. Ring doorbell, leave at gate, extra napkins"
                      className="w-full rounded-xl bg-[#17130F] border border-white/15 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#FFBA12] focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Pickup Outlet Confirmation (Pickup only) */}
              {orderType === "pickup" && (
                <div className="pt-6 border-t border-white/10 rounded-2xl bg-[#17130F]/40 p-4 border border-white/5">
                  <span className="text-xs font-black uppercase text-[#FFBA12] block mb-1">
                    Pickup Location
                  </span>
                  <p className="text-sm font-bold text-white">
                    Bugeese Vijay Nagar Outlet
                  </p>
                  <p className="text-xs text-[#F6F0E5]/60 mt-0.5">
                    Vijay Nagar, Jabalpur, Madhya Pradesh 482002
                  </p>
                </div>
              )}

              {/* Step 2 Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs sm:text-sm font-bold text-white/60 hover:text-white cursor-pointer"
                >
                  &larr; Back to Order Type
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-full bg-[#C8201A] px-10 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg hover:bg-[#b01c13] transition-transform hover:scale-105 cursor-pointer"
                >
                  Review Your Order &rarr;
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* STEP 3: ORDER REVIEW & CONFIRMATION ACTION                  */}
        {/* ─────────────────────────────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <span className="text-xs font-black uppercase tracking-widest text-[#FFBA12] block mb-2">
                Checkout Step 3 of 3
              </span>
              <h1 className="font-condensed text-4xl sm:text-5xl md:text-6xl font-black uppercase text-white leading-none">
                Review Your Order
              </h1>
              <p className="mt-3 text-sm sm:text-base text-[#F6F0E5]/70">
                Please review your selected items and contact details before confirming your demo order.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Items List */}
              <div className="lg:col-span-7 rounded-3xl bg-[#2B241D] p-6 sm:p-8 border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                  <h3 className="font-condensed text-2xl font-black uppercase text-white">
                    Order Items ({totalCount})
                  </h3>
                  <Link href="/menu" className="text-xs font-bold text-[#FFBA12] hover:underline">
                    Edit in Cart &rarr;
                  </Link>
                </div>

                <div className="space-y-4 divide-y divide-white/5">
                  {items.map((item) => (
                    <div key={item.id} className="pt-4 first:pt-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black/20 border border-white/10">
                          <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white line-clamp-1">{item.name}</h4>
                          <span className="text-xs text-white/60">
                            Qty: {item.quantity} &times; ₹{item.price}
                          </span>
                        </div>
                      </div>

                      <span className="font-condensed text-lg font-black text-white shrink-0">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                  <span>100% Pure Vegetarian Items</span>
                  <span className="text-emerald-400 font-bold">Freshly Prepared</span>
                </div>
              </div>

              {/* Right Column: Customer Details & Final Summary */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Details Card */}
                <div className="rounded-3xl bg-[#2B241D] p-6 sm:p-7 border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="font-condensed text-xl font-black uppercase text-white">
                      Recipient &amp; Delivery
                    </h3>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs font-bold text-[#FFBA12] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="text-xs space-y-2 text-[#F6F0E5]/80">
                    <div>
                      <span className="font-bold text-white block">Order Type:</span>
                      <span className="capitalize font-black text-[#FFBA12]">
                        {orderType === "delivery" ? "Doorstep Delivery" : "Pickup / Takeaway"}
                      </span>
                    </div>

                    <div>
                      <span className="font-bold text-white block">Customer Name:</span>
                      <span>{customerDetails.name}</span>
                    </div>

                    <div>
                      <span className="font-bold text-white block">Phone:</span>
                      <span>+91 {customerDetails.phone}</span>
                    </div>

                    {orderType === "delivery" ? (
                      <div>
                        <span className="font-bold text-white block">Address:</span>
                        <span>
                          {customerDetails.houseNumber}, {customerDetails.street}, {customerDetails.city}, {customerDetails.state} - {customerDetails.pinCode}
                        </span>
                        {customerDetails.instructions && (
                          <span className="block italic text-white/50 mt-1">
                            Note: &ldquo;{customerDetails.instructions}&rdquo;
                          </span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-white block">Pickup Counter:</span>
                        <span>Bugeese Vijay Nagar Outlet, Jabalpur (482002)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Breakdown Card */}
                <div>
                  <TierProgressCard tierView={quoteData?.tier_view} isDemo={true} />
                </div>

                <div className="rounded-3xl bg-[#1B1A17] p-6 sm:p-7 border border-white/10 shadow-xl space-y-4">
                  <h3 className="font-condensed text-xl font-black uppercase text-white border-b border-white/10 pb-3">
                    Demo Price Summary
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-white/70">
                      <span>Item Subtotal ({totalCount} items)</span>
                      <span className="font-bold text-white">₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between text-white/50">
                      <span>Delivery Fee</span>
                      <span className="text-emerald-400 font-bold">FREE (Demo)</span>
                    </div>
                    <div className="flex justify-between text-white/50">
                      <span>Taxes &amp; Packaging</span>
                      <span className="text-emerald-400 font-bold">₹0 (Demo)</span>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-3 flex items-baseline justify-between">
                    <span className="text-base font-bold text-white">Displayed Total</span>
                    <span className="font-condensed text-3xl font-black text-[#FFBA12]">
                      ₹{subtotal}
                    </span>
                  </div>

                  <p className="text-[11px] text-white/40 leading-tight">
                    * This is a frontend demo checkout. No payment is processed and no real credit card is required.
                  </p>

                  {/* Final Confirm Button */}
                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting}
                    className="w-full rounded-full bg-[#C8201A] py-4 text-center font-black uppercase tracking-wider text-white shadow-[0_4px_0_#7d120e] hover:translate-y-0.5 hover:shadow-[0_1px_0_#7d120e] transition-all cursor-pointer disabled:opacity-50"
                  >
                    Confirm Demo Order &bull; ₹{subtotal}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full text-center text-xs font-bold text-white/60 hover:text-white py-1 cursor-pointer"
                  >
                    &larr; Back to Details
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* STEP 4: ORDER CONFIRMATION SCREEN (DEMO COMPLETED)          */}
        {/* ─────────────────────────────────────────────────────────── */}
        {currentStep === 4 && confirmedOrder && (
          <div className="max-w-2xl mx-auto text-center animate-in fade-in zoom-in-95 duration-400">
            {/* Success Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-4xl mb-6 border border-emerald-500/40">
              ✓
            </div>

            <span className="inline-block rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black tracking-widest uppercase px-4 py-1.5 border border-emerald-500/20 mb-4">
              Demo Order Generated
            </span>

            <h1 className="font-condensed text-4xl sm:text-5xl md:text-6xl font-black uppercase text-white leading-tight mb-4">
              Your Bugeese Order is Ready to Preview!
            </h1>

            <p className="text-sm sm:text-base text-[#F6F0E5]/75 max-w-lg mx-auto mb-8 leading-relaxed">
              This is a frontend demo. Your order has not been submitted to a restaurant, and no real payment has been processed.
            </p>

            {/* Receipt Summary Card */}
            <div className="rounded-3xl bg-[#2B241D] p-6 sm:p-8 border border-white/10 shadow-2xl text-left mb-8 space-y-6">
              {/* Header with Reference */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest block">
                    Demo Order Reference
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-[#FFBA12]">
                    {confirmedOrder.orderRef}
                  </span>
                </div>
                <div className="text-right sm:text-right">
                  <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest block">
                    Order Time
                  </span>
                  <span className="text-xs font-bold text-white">
                    {confirmedOrder.createdAt}
                  </span>
                </div>
              </div>

              {/* Recipient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#F6F0E5]/80">
                <div>
                  <span className="font-bold text-white block">Customer:</span>
                  <span>{confirmedOrder.customerDetails.name}</span>
                </div>
                <div>
                  <span className="font-bold text-white block">Contact:</span>
                  <span>+91 {confirmedOrder.customerDetails.phone}</span>
                </div>
                <div>
                  <span className="font-bold text-white block">Order Type:</span>
                  <span className="capitalize font-bold text-[#FFBA12]">
                    {confirmedOrder.orderType === "delivery" ? "Doorstep Delivery" : "Pickup / Takeaway"}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-white block">
                    {confirmedOrder.orderType === "delivery" ? "Delivery Address:" : "Pickup Location:"}
                  </span>
                  <span>
                    {confirmedOrder.orderType === "delivery"
                      ? `${confirmedOrder.customerDetails.houseNumber}, ${confirmedOrder.customerDetails.street}, ${confirmedOrder.customerDetails.city} - ${confirmedOrder.customerDetails.pinCode}`
                      : "Bugeese Vijay Nagar Outlet, Jabalpur (482002)"}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-white block">
                  Items Summary ({confirmedOrder.totalCount})
                </span>

                <div className="space-y-2">
                  {confirmedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs text-white/80">
                      <span>
                        {item.quantity}&times; {item.name}
                      </span>
                      <span className="font-mono font-bold text-white">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Row */}
              <div className="border-t border-white/10 pt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-bold text-white block">Demo Total</span>
                  <span className="text-[10px] text-white/50">Frontend simulated order</span>
                </div>
                <span className="font-condensed text-3xl font-black text-[#FFBA12]">
                  ₹{confirmedOrder.subtotal}
                </span>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/menu"
                className="w-full sm:w-auto rounded-full bg-[#FFBA12] px-8 py-4 text-sm font-black uppercase tracking-wider text-[#17130F] shadow-lg hover:bg-amber-400 transition-all hover:scale-105"
              >
                Continue Exploring the Menu
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto rounded-full border border-white/20 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8 px-4 text-center text-xs text-white/50">
        <p>© 2026 Bugeese Fast Casual. 100% Pure Vegetarian Brand.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/menu" className="hover:text-white">Full Menu</Link>
          <Link href="/" className="hover:text-white">Home Experience</Link>
          <a href={`mailto:${BUGEESE_CONFIG.contact.email}`} className="hover:text-white">Franchise Inquiry</a>
        </div>
      </footer>
    </div>
  );
}
