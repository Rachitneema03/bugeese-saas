"use client";

import React from "react";
import { Sparkles, Award, ShieldCheck, ArrowUpRight } from "lucide-react";

/**
 * Compact Customer Tier Progress & Incentive Component
 *
 * Displays:
 * - Current loyalty tier
 * - Posted commission avoided progress toward next tier
 * - Projected tier upgrade during checkout if the current order crosses threshold
 * - Validated direct incentive applied by Feature 1 financial engine
 * - Combo direct-order restriction note when applicable
 */
export default function TierProgressCard({ tierView, isDemo = false }) {
  if (!tierView) return null;

  const {
    currentTierName = "Bronze",
    applicableTierName = "Bronze",
    isTierUpgrade = false,
    postedBalancePaise = 0,
    projectedBalancePaise = 0,
    orderCommissionAvoidedPaise = 0,
    progressText,
    projectedUpgradeMessage,
    comboMessage,
    qrBoostApplied = false,
    qrBoostPercent = 0,
    discountPaise = 0,
    totalToPayPaise = 0
  } = tierView;

  const postedRs = (postedBalancePaise / 100).toFixed(0);
  const earnedRs = (orderCommissionAvoidedPaise / 100).toFixed(0);
  const discountRs = (discountPaise / 100).toFixed(0);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#2B241D] to-[#1E1914] border border-[#FFBA12]/25 p-4 sm:p-5 shadow-lg relative overflow-hidden">
      {/* Decorative accent glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#FFBA12]/10 blur-2xl pointer-events-none" />

      {/* Header: Tier Badge & Tag */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FFBA12]/20 text-[#FFBA12] flex items-center justify-center font-black">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase font-black tracking-wider text-white">
                {currentTierName} Member
              </span>
              {isDemo && (
                <span className="text-[10px] font-bold text-white/40 uppercase bg-white/5 px-1.5 py-0.2 rounded">
                  Demo
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/60">
              ₹{postedRs} commission avoided to date
            </p>
          </div>
        </div>

        {/* Discount Badge */}
        {discountPaise > 0 && !comboMessage && (
          <span className="inline-flex items-center gap-1 bg-[#10b981]/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-black px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            Save ₹{discountRs}
          </span>
        )}
      </div>

      {/* Projected Upgrade Banner */}
      {isTierUpgrade && projectedUpgradeMessage && (
        <div className="mb-3 rounded-xl bg-gradient-to-r from-[#FFBA12]/20 to-[#D9251B]/20 border border-[#FFBA12]/40 p-2.5 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FFBA12] shrink-0 animate-pulse" />
          <p className="text-xs font-bold text-white">
            {projectedUpgradeMessage}
          </p>
        </div>
      )}

      {/* Progress towards next tier */}
      {progressText && !isTierUpgrade && (
        <div className="mb-3 rounded-xl bg-[#17130F]/60 p-2.5 border border-white/5">
          <div className="flex items-center justify-between text-[11px] text-[#F6F0E5]/80 mb-1">
            <span>Next Tier Progress</span>
            <span className="font-bold text-[#FFBA12]">{progressText}</span>
          </div>
        </div>
      )}

      {/* Combo Direct Note */}
      {comboMessage && (
        <div className="mt-2 text-[11px] text-white/70 bg-[#17130F]/40 p-2.5 rounded-xl border border-white/5 leading-relaxed">
          <span className="font-bold text-[#FFBA12] block mb-0.5">Direct Combo Pricing</span>
          {comboMessage}
        </div>
      )}

      {/* QR Boost notification */}
      {qrBoostApplied && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>+{qrBoostPercent}% Direct QR Incentive Applied</span>
        </div>
      )}

      {/* Commission Avoided notice */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
        <span>Order Avoids: <strong className="text-white">₹{earnedRs}</strong></span>
        <span>Pure Veg Direct Order</span>
      </div>
    </div>
  );
}
