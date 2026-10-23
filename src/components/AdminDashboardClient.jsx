"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert,
  TrendingUp,
  Sliders,
  DollarSign,
  Package,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Lock
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardClient() {
  const { user, profile } = useAuth();
  const [combos, setCombos] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verification: only superadmin/manager/admin allowed
  const isSuperadminOrManager = profile?.role === "admin" || profile?.role === "manager" || profile?.role === "superadmin";

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        // Fetch combos with admin contribution margins
        const comboRes = await fetch(`${apiUrl}/api/combos?admin=true`);
        if (comboRes.ok) {
          const data = await comboRes.json();
          setCombos(data);
        }
        // Fetch current active engine config
        const cfgRes = await fetch(`${apiUrl}/api/config`);
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setConfig(cfg);
        }
      } catch (e) {
        console.warn("Could not load admin API, using cached data:", e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, []);

  if (!isSuperadminOrManager) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#1B1713] border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-red-400">
            <Lock className="w-5 h-5 stroke-[1.5]" />
          </div>
          <h1 className="text-lg font-semibold text-white tracking-tight mb-1">
            Restricted Admin Console
          </h1>
          <p className="text-xs text-neutral-400 mb-6">
            This dashboard is only accessible to verified Bugeese Managers and Superadmins.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#FFBA12] text-black text-xs font-semibold hover:bg-[#ffc636] transition-colors"
          >
            Authenticate Staff Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
              Operations Console & Financial Engine
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Commission Savings & Profit Guard
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Verified: {profile?.role?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-[#1B1713] border border-white/10">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Aggregator Commission</span>
            <DollarSign className="w-4 h-4 text-[#FFBA12]" />
          </div>
          <div className="text-2xl font-semibold text-white tracking-tight">
            {config ? `${config.commission_bps / 100}%` : "25.0%"}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Avoided on direct orders</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#1B1713] border border-white/10">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Safe Headroom Share Cap</span>
            <Sliders className="w-4 h-4 text-[#FFBA12]" />
          </div>
          <div className="text-2xl font-semibold text-white tracking-tight">
            {config ? `${config.cap_bps / 100}%` : "75.0%"}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Hard maximum ceiling</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#1B1713] border border-white/10">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Minimum Order Floor</span>
            <Layers className="w-4 h-4 text-[#FFBA12]" />
          </div>
          <div className="text-2xl font-semibold text-white tracking-tight">
            ₹{config ? (config.min_order_for_discount_paise / 100).toFixed(0) : "200"}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Below this discount is off</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#1B1713] border border-white/10">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Absolute Margin Floor</span>
            <TrendingUp className="w-4 h-4 text-[#FFBA12]" />
          </div>
          <div className="text-2xl font-semibold text-white tracking-tight">
            ₹{config ? (config.min_margin_paise / 100).toFixed(0) : "40"}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Guaranteed kitchen floor</p>
        </div>
      </div>

      {/* Combos Contribution Margin Table (Superadmin/Manager view) */}
      <div className="rounded-2xl bg-[#1B1713] border border-white/10 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Combo Contribution Margins (Feature 2)
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Hidden from customers. Verified against pure-veg kitchen recipe costs.
            </p>
          </div>
          <span className="text-xs text-[#FFBA12] font-mono">
            {combos.length} Active Combos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400">
                <th className="pb-3 font-medium">Combo Name</th>
                <th className="pb-3 font-medium">Selling Price</th>
                <th className="pb-3 font-medium">Kitchen Food Cost</th>
                <th className="pb-3 font-medium">Packaging</th>
                <th className="pb-3 font-medium">Contribution</th>
                <th className="pb-3 font-medium text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {combos.map((c) => {
                const price = c.price_paise / 100;
                const cost = c.food_cost_paise / 100;
                const pkg = (c.packaging_paise || 1500) / 100;
                const contrib = (c.contribution_paise || (c.price_paise - c.food_cost_paise - 1500)) / 100;
                const pct = c.contribution_margin_pct || ((contrib / price) * 100).toFixed(1);

                return (
                  <tr key={c.id || c.name} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-medium text-white">{c.name}</td>
                    <td className="py-3 text-neutral-300">₹{price.toFixed(2)}</td>
                    <td className="py-3 text-neutral-400">₹{cost.toFixed(2)}</td>
                    <td className="py-3 text-neutral-400">₹{pkg.toFixed(2)}</td>
                    <td className="py-3 text-emerald-400 font-semibold">₹{contrib.toFixed(2)}</td>
                    <td className="py-3 text-right">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/50 text-emerald-300 font-mono text-[11px]">
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
