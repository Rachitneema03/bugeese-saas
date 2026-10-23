"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  UtensilsCrossed,
  MapPin,
  User,
} from "lucide-react";
import styles from "./MobileFloatingNav.module.css";
import { useAuth } from "@/context/AuthContext";

export default function MobileFloatingNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    const updateHash = () => {
      setActiveHash(window.location.hash || "");
    };
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const isHomeActive = pathname === "/" && (activeHash === "" || activeHash === "#");
  const isMenuActive = pathname === "/menu";
  const isOutletsActive = pathname === "/" && activeHash === "#outlets";
  const isLoginActive = pathname === "/login";

  return (
    <nav className={`md:hidden ${styles.mobileNavContainer}`} aria-label="Mobile Bottom Navigation">
      <div className={styles.menu}>
        {/* Home */}
        <Link
          href="/"
          className={isHomeActive ? styles.active : ""}
          onClick={() => setActiveHash("")}
        >
          <Home />
          <span>Home</span>
        </Link>

        {/* Menu */}
        <Link
          href="/menu"
          className={isMenuActive ? styles.active : ""}
        >
          <UtensilsCrossed />
          <span>Menu</span>
        </Link>

        {/* Direct Club / Profile */}
        <Link
          href="/login"
          className={isLoginActive ? styles.active : ""}
        >
          <User />
          <span>{profile ? "Account" : "Sign In"}</span>
        </Link>

        {/* Outlets / Contact */}
        <Link
          href="/#outlets"
          className={isOutletsActive ? styles.active : ""}
          onClick={() => setActiveHash("#outlets")}
        >
          <MapPin />
          <span>Outlets</span>
        </Link>
      </div>
    </nav>
  );
}
