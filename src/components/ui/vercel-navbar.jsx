"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  UtensilsCrossed,
  MapPin,
  Leaf,
  PhoneCall,
  ShoppingBag,
  Menu as MenuIcon,
  X,
  Sparkles,
  ChevronRight,
  Flame,
  User,
} from "lucide-react";

// Menu categories with quick links
const menuCategories = [
  {
    title: "Signature Burgers",
    description: "Crispy Aloo Patty, Paneer Makhani & Gourmet Herb Burgers.",
    href: "/menu#burgers",
    icon: Flame,
    tag: "Popular",
  },
  {
    title: "Crispy Sides",
    description: "Golden Peri Peri Fries, Veggie Nuggets, and fresh bites.",
    href: "/menu#sides",
    icon: UtensilsCrossed,
  },
  {
    title: "Combos & Shakes",
    description: "Value meals paired with Belgium chocolate and hazelnut shakes.",
    href: "/menu#combos",
    icon: Sparkles,
    tag: "Save 15%",
  },
];

// Brand story / About links
const storyLinks = [
  {
    title: "100% Pure Vegetarian",
    description: "Dedicated zero egg, zero meat kitchen crafted by a 5-star hotel chef.",
    href: "/#vegetarian-story",
    icon: Leaf,
  },
  {
    title: "Store Locations",
    description: "Visit our outlets across Jabalpur for fresh, handcrafted burgers.",
    href: "/#outlets",
    icon: MapPin,
  },
];

export function VercelNavbar() {
  const { profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled || pathname === "/menu"
          ? "bg-[#17130F]/90 backdrop-blur-md border-b border-white/10 shadow-lg py-2.5"
          : "bg-gradient-to-b from-[#17130F]/80 via-[#17130F]/40 to-transparent py-4"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFBA12] to-[#C8201A] flex items-center justify-center font-black text-black text-lg tracking-wider shadow-md shadow-[#C8201A]/30 group-hover:scale-105 transition-transform duration-200">
              B
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-lg text-white font-serif leading-none group-hover:text-[#FFBA12] transition-colors">
                BUGEESE
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#FFBA12] leading-tight">
                Pure Veg
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Menu (Radix NavigationMenu / Shadcn) */}
          <div className="hidden md:flex items-center">
            <NavigationMenu>
              <NavigationMenuList className="gap-1">

                {/* Home link */}
                <NavigationMenuItem>
                  <NavigationMenuLink
                    href="/"
                    className={cn(navigationMenuTriggerStyle(), "hover:text-[#FFBA12]")}
                  >
                    Home
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {/* Menu Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="hover:text-[#FFBA12]">
                    Menu
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[500px] p-4 bg-[#17130F] border border-neutral-800 rounded-xl">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                        <div>
                          <p className="text-sm font-bold text-white uppercase tracking-wider">
                            Explore Our Flavours
                          </p>
                          <p className="text-xs text-neutral-400">
                            100% Pure vegetarian, crafted daily with fresh ingredients.
                          </p>
                        </div>
                        <Link
                          href="/menu"
                          className="text-xs font-semibold text-[#FFBA12] hover:underline inline-flex items-center gap-1"
                        >
                          View Full Menu <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="grid gap-2">
                        {menuCategories.map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group"
                          >
                            <div className="p-2 rounded-md bg-[#FFBA12]/10 text-[#FFBA12] group-hover:bg-[#FFBA12] group-hover:text-black transition-colors">
                              <item.icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white group-hover:text-[#FFBA12] transition-colors">
                                  {item.title}
                                </span>
                                {item.tag && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[#C8201A] text-white">
                                    {item.tag}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Brand Story Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="hover:text-[#FFBA12]">
                    Our Story
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[420px] p-4 bg-[#17130F] border border-neutral-800 rounded-xl">
                      <div className="pb-2 mb-2 border-b border-white/10">
                        <p className="text-sm font-bold text-white uppercase tracking-wider">
                          The Bugeese Standard
                        </p>
                        <p className="text-xs text-neutral-400">
                          Born in Jabalpur, created by a 5-star hotel chef.
                        </p>
                      </div>
                      <div className="grid gap-2">
                        {storyLinks.map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group"
                          >
                            <div className="p-2 rounded-md bg-white/5 text-neutral-300 group-hover:bg-[#C8201A] group-hover:text-white transition-colors">
                              <item.icon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-white group-hover:text-[#FFBA12] transition-colors">
                                {item.title}
                              </span>
                              <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Outlets link */}
                <NavigationMenuItem>
                  <NavigationMenuLink
                    href="/#outlets"
                    className={cn(navigationMenuTriggerStyle(), "hover:text-[#FFBA12]")}
                  >
                    Outlets
                  </NavigationMenuLink>
                </NavigationMenuItem>

              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Direct Club Auth / Profile Link */}
            <Link
              href="/login"
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all",
                profile
                  ? "bg-[#FFBA12]/15 text-[#FFBA12] border-[#FFBA12]/30 hover:bg-[#FFBA12]/25"
                  : "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10 hover:text-white"
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span>{profile ? "Account" : "Sign In"}</span>
            </Link>

            {/* Quick Order Button */}
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-black bg-[#FFBA12] hover:bg-[#ffc636] active:scale-95 rounded-full transition-all shadow-md shadow-[#FFBA12]/20"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{pathname === "/menu" ? "Cart" : "Order Now"}</span>
              {totalCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C8201A] text-[11px] font-black text-white ml-0.5">
                  {totalCount}
                </span>
              )}
            </Link>
              
            {/* Quick Contact Dropdown */}
            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Contact options"
                    className="p-2 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition-colors focus:outline-none"
                  >
                    <PhoneCall className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs font-semibold text-neutral-400">
                    Get in Touch
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <a
                        href="tel:+919876543210"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4 text-[#FFBA12]" />
                        <span>Call Support</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/#outlets"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-[#FFBA12]" />
                        <span>Visit Jabalpur Stores</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-neutral-300 hover:text-white md:hidden rounded-lg hover:bg-white/10 focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <MenuIcon className="w-6 h-6" />
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#17130F] border-b border-white/10 px-4 pt-3 pb-6 mt-2 space-y-3 animate-in slide-in-from-top duration-200">
          <div className="flex flex-col space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-semibold text-white hover:bg-white/5 rounded-lg"
            >
              Home
            </Link>
            <Link
              href="/menu"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-semibold text-[#FFBA12] hover:bg-white/5 rounded-lg flex items-center justify-between"
            >
              <span>Our Menu</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#vegetarian-story"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-medium text-neutral-300 hover:bg-white/5 rounded-lg"
            >
              Why 100% Pure Veg
            </Link>
            <Link
              href="/#outlets"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-medium text-neutral-300 hover:bg-white/5 rounded-lg"
            >
              Store Locations
            </Link>
          </div>

          <div className="pt-2 border-t border-white/10">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openDrawer();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-black bg-[#FFBA12] rounded-xl shadow-lg cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>View Cart ({totalCount})</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default VercelNavbar;
