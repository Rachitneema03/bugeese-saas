"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  User,
  LogOut,
  ChevronRight
} from "lucide-react";

export default function LoginClient() {
  const router = useRouter();
  const {
    user,
    profile,
    signInWithOtp,
    signInWithPassword,
    signUpWithPassword,
    signOut
  } = useAuth();

  const [authMethod, setAuthMethod] = useState("otp"); // 'otp' | 'password' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (authMethod === "otp") {
        if (!email) throw new Error("Please enter your email address");
        await signInWithOtp(email);
        setSuccessMsg("Magic link sent! Check your email to sign in.");
      } else if (authMethod === "password") {
        if (!email || !password) throw new Error("Email and password are required");
        await signInWithPassword(email, password);
        router.push("/menu");
      } else if (authMethod === "signup") {
        if (!email || !password) throw new Error("Email and password are required");
        await signUpWithPassword(email, password, name);
        setSuccessMsg("Account created! Check your email to confirm or sign in.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  // Logged-in state view (Zero mention of internal roles)
  if (user || profile) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-16">
        <div className="w-full max-w-md bg-[#1B1713] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#FFBA12]">
                <User className="w-5 h-5 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="text-base font-medium text-white tracking-tight">
                  {profile?.name || "Bugeese Member"}
                </h2>
                <p className="text-xs text-neutral-400">
                  {profile?.email || profile?.phone || "Connected"}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase rounded-md bg-[#FFBA12]/15 text-[#FFBA12] border border-[#FFBA12]/20">
              Active Member
            </span>
          </div>

          <div className="my-6 space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
              <span className="text-neutral-400">Direct Savings Unlocked</span>
              <span className="font-semibold text-white">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
              <span className="text-neutral-400">Delivery Protection</span>
              <span className="font-semibold text-[#FFBA12]">Universal Direct</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <Link
              href="/menu"
              className="w-full h-10 rounded-xl bg-[#FFBA12] text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#ffc636] transition-colors"
            >
              <span>Explore Pure-Veg Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={signOut}
              className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium border border-white/5 flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 py-16">
      <div className="w-full max-w-[420px] bg-[#1B1713] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
        
        {/* Header (Clean, minimal, no internal roles) */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#FFBA12]" />
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
              Bugeese Direct Ordering Club
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Sign In to Your Account
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Access safe direct discounts and fast checkout.
          </p>
        </div>

        {/* Auth Method Navigation Tabs */}
        <div className="flex p-0.5 mb-5 rounded-lg bg-white/5 border border-white/5 text-xs">
          <button
            type="button"
            onClick={() => { setAuthMethod("otp"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
              authMethod === "otp"
                ? "bg-[#1B1713] text-[#FFBA12] shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod("password"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
              authMethod === "password"
                ? "bg-[#1B1713] text-[#FFBA12] shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod("signup"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
              authMethod === "signup"
                ? "bg-[#1B1713] text-[#FFBA12] shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Register
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-950/40 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authMethod === "signup" && (
            <div>
              <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-[#FFBA12] transition-colors"
                  required
                />
                <User className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5 stroke-[1.5]" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-neutral-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-[#FFBA12] transition-colors"
                required
              />
              <Mail className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5 stroke-[1.5]" />
            </div>
          </div>

          {authMethod !== "otp" && (
            <div>
              <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-[#FFBA12] transition-colors"
                  required
                />
                <Lock className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5 stroke-[1.5]" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-2 bg-[#FFBA12] hover:bg-[#ffc636] text-black font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {authMethod === "otp"
                    ? "Send Magic Link"
                    : authMethod === "password"
                    ? "Sign In"
                    : "Create Account"}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-400">
          <span className="flex items-center gap-1 text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FFBA12] stroke-[1.5]" />
            Secure Authentication
          </span>
          <Link href="/menu" className="hover:text-white transition-colors">
            Browse Menu
          </Link>
        </div>

      </div>
    </div>
  );
}
