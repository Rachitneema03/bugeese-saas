"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const AuthContext = createContext({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isMockMode: false,
  signInWithOtp: async () => {},
  verifyOtp: async () => {},
  signInWithPassword: async () => {},
  signUpWithPassword: async () => {},
  signInDemoUser: () => {},
  signOut: async () => {}
});

const DEMO_USERS = {
  bronze: {
    id: "a0000000-0000-0000-0000-000000000001",
    email: "aman@bugeese.in",
    phone: "+91 98765 43210",
    name: "Aman Sharma",
    tier: "bronze",
    role: "customer",
    commission_avoided: 350
  },
  silver: {
    id: "a0000000-0000-0000-0000-000000000002",
    email: "pooja@bugeese.in",
    phone: "+91 99887 76655",
    name: "Pooja Verma",
    tier: "silver",
    role: "customer",
    commission_avoided: 1250
  },
  admin: {
    id: "a0000000-0000-0000-0000-000000000099",
    email: "manager@bugeese.in",
    phone: "+91 90000 00000",
    name: "Bugeese Manager",
    tier: "gold",
    role: "admin",
    commission_avoided: 4500
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check stored session or Supabase session on mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      // 1. Check local mock storage first (for rapid hackathon demo testing)
      const storedMock = typeof window !== "undefined" ? localStorage.getItem("bugeese_mock_user") : null;
      if (storedMock) {
        try {
          const parsed = JSON.parse(storedMock);
          if (mounted) {
            setUser({ id: parsed.id, email: parsed.email });
            setProfile(parsed);
            setLoading(false);
            return;
          }
        } catch {
          localStorage.removeItem("bugeese_mock_user");
        }
      }

      // 2. If Supabase configured, check real session
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session && mounted) {
            setSession(data.session);
            setUser(data.session.user);
            setProfile({
              id: data.session.user.id,
              email: data.session.user.email,
              phone: data.session.user.phone || "",
              name: data.session.user.user_metadata?.name || data.session.user.email?.split("@")[0] || "Valued Foodie",
              tier: "bronze",
              role: "customer"
            });
          }
        } catch (err) {
          console.warn("Supabase auth session fetch error:", err.message);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
          if (!mounted) return;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            setProfile({
              id: currentSession.user.id,
              email: currentSession.user.email,
              phone: currentSession.user.phone || "",
              name: currentSession.user.user_metadata?.name || "Valued Foodie",
              tier: "bronze",
              role: "customer"
            });
          } else if (!localStorage.getItem("bugeese_mock_user")) {
            setProfile(null);
          }
        });

        if (mounted) setLoading(false);
        return () => {
          authListener?.subscription?.unsubscribe();
        };
      }

      if (mounted) setLoading(false);
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  // Supabase Phone OTP / Magic Link
  const signInWithOtp = async (phoneOrEmail) => {
    if (!isSupabaseConfigured || !supabase) {
      // Fallback: auto-login mock
      return signInDemoUser("bronze");
    }
    const isEmail = phoneOrEmail.includes("@");
    if (isEmail) {
      const { error } = await supabase.auth.signInWithOtp({ email: phoneOrEmail });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.signInWithOtp({ phone: phoneOrEmail });
      if (error) throw error;
    }
  };

  const verifyOtp = async (phoneOrEmail, token) => {
    if (!isSupabaseConfigured || !supabase) {
      return signInDemoUser("bronze");
    }
    const isEmail = phoneOrEmail.includes("@");
    const { data, error } = await supabase.auth.verifyOtp({
      [isEmail ? "email" : "phone"]: phoneOrEmail,
      token,
      type: isEmail ? "magiclink" : "sms"
    });
    if (error) throw error;
    return data;
  };

  const signInWithPassword = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      return signInDemoUser("bronze");
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUpWithPassword = async (email, password, name) => {
    if (!isSupabaseConfigured || !supabase) {
      return signInDemoUser("bronze");
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) throw error;
    return data;
  };

  // Instant 1-tap demo switch (Crucial for Hackathon presentation)
  const signInDemoUser = (type = "bronze") => {
    const demo = DEMO_USERS[type] || DEMO_USERS.bronze;
    setUser({ id: demo.id, email: demo.email });
    setProfile(demo);
    localStorage.setItem("bugeese_mock_user", JSON.stringify(demo));
    return demo;
  };

  const signOut = async () => {
    localStorage.removeItem("bugeese_mock_user");
    setUser(null);
    setProfile(null);
    setSession(null);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("SignOut notice:", e.message);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isMockMode: !isSupabaseConfigured,
        signInWithOtp,
        verifyOtp,
        signInWithPassword,
        signUpWithPassword,
        signInDemoUser,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
