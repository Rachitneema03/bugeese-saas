"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  UtensilsCrossed,
  MapPin,
} from "lucide-react";
import styles from "./MobileFloatingNav.module.css";

export default function MobileFloatingNav() {
  const pathname = usePathname();
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

  return (
    <nav className={styles.mobileNavContainer} aria-label="Mobile Bottom Navigation">
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
