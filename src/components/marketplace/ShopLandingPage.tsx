"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  CarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CpuIcon,
  HammerIcon,
  HeartIcon,
  HomeIcon,
  GridIcon,
  MapPinIcon,
  PackageIcon,
  PlugIcon,
  PlusIcon,
  SearchIcon,
  ShirtIcon,
  SofaIcon,
  TagIcon,
  WrenchIcon,
  XIcon,
  type BrandIconComponent,
} from "@/components/brand/icons";
import { Logo } from "@/components/brand/Logo";
import { ConditionBadge } from "@/components/ui/badge";
import { pricingLabel, timeAgo } from "@/lib/utils";
import { brand } from "@/config/site";
import { toggleFavoriteAction } from "@/features/listings/actions";
import type { CardListing } from "@/components/marketplace/ListingCard";

interface ShopLandingPageProps {
  initialItems: CardListing[];
  categories: { name: string; slug: string }[];
  isLive: boolean;
}

const ABUJA_AREAS = [
  "All Abuja",
  "Wuse 2",
  "Garki",
  "Maitama",
  "Apo",
  "Dei-Dei",
  "Kubwa",
  "Idu Industrial",
  "Central Area",
  "Lugbe",
];

/** Circular chip tones for department icons (neutral + violet set, no green). */
const CHIP_TONES = ["#5433eb", "#332f2d", "#665a54", "#787574", "#acb0aa", "#c0b5f3", "#000000", "#605e5d"];

const CATEGORY_ICONS: Record<string, BrandIconComponent> = {
  metals: HammerIcon,
  plastics: PackageIcon,
  electronics: CpuIcon,
  appliances: PlugIcon,
  furniture: SofaIcon,
  "vehicle-parts": CarIcon,
  "construction-materials": WrenchIcon,
  "electrical-materials": PlugIcon,
  "plumbing-materials": WrenchIcon,
  "industrial-equipment": HammerIcon,
  "household-items": ShirtIcon,
  "paper-packaging": PackageIcon,
};

/** Honest seller-type cards: kinds of yards/dealers buyers can look for.
 *  Counts are computed live from real listings — no fabricated businesses,
 *  ratings, or listing counts. */
const YARD_TYPES = [
  {
    id: "yard-metals",
    title: "Scrap Metal Yards",
    blurb: "Copper wire, aluminium and iron offcuts bought in bulk.",
    categorySlug: "metals",
    examples: ["Copper Wire", "Aluminium", "Iron Offcuts"],
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=70",
    where: "Common around Apo Mechanic Village",
  },
  {
    id: "yard-surplus",
    title: "Building Surplus Depots",
    blurb: "Rods, beams and site leftovers at below-market prices.",
    categorySlug: "construction-materials",
    examples: ["Iron Rods 12mm", "Steel Beams", "Site Surplus"],
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=70",
    where: "Common around Dei-Dei Market",
  },
  {
    id: "yard-ewaste",
    title: "E-Waste & Refurbishers",
    blurb: "Technicians hunting boards, screens and inverter batteries.",
    categorySlug: "electronics",
    examples: ["Motherboards", "Laptop Screens", "Batteries"],
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=70",
    where: "Common around Wuse 2 / Banex",
  },
  {
    id: "yard-auto",
    title: "Auto Spares Dealers",
    blurb: "Engines, gearboxes and body parts for popular models.",
    categorySlug: "vehicle-parts",
    examples: ["Engines", "Gearboxes", "Toyota & Honda"],
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=70",
    where: "Common around Garki / Central Area",
  },
];

const TRENDING_QUERIES = [
  { label: "Copper scrap", query: "copper", category: "metals" },
  { label: "Laptop for parts", query: "laptop", category: "electronics" },
  { label: "Wooden chairs", query: "chairs", category: "furniture" },
  { label: "Gearbox", query: "gearbox", category: "vehicle-parts" },
  { label: "Iron rods", query: "rods", category: "construction-materials" },
  { label: "Free pickup", query: "", category: "furniture" },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function ShopLandingPage({ initialItems, categories, isLive }: ShopLandingPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedArea, setSelectedArea] = useState("All Abuja");
  const [activeTab, setActiveTab] = useState<"all" | "scrap" | "usable" | "budget" | "free">("all");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [featureIndex, setFeatureIndex] = useState(0);

  const categoryName = (slug: string) =>
    categories.find((c) => c.slug.toLowerCase() === slug.toLowerCase())?.name ?? slug;

  const toggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wasSaved = savedIds.has(id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      await toggleFavoriteAction(id);
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scrollToId("feed");
  };

  const filteredListings = useMemo(() => {
    let result = [...initialItems];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.area?.toLowerCase().includes(q),
      );
    }
    if (selectedCategory !== "all") {
      const name = categoryName(selectedCategory);
      result = result.filter((item) => item.category?.toLowerCase() === name.toLowerCase());
    }
    if (selectedArea !== "All Abuja") {
      result = result.filter((item) => item.area === selectedArea);
    }
    if (activeTab === "scrap") {
      result = result.filter((item) => item.condition === "scrap" || item.condition === "for_parts");
    } else if (activeTab === "usable") {
      result = result.filter((item) => item.condition === "used" || item.condition === "working");
    } else if (activeTab === "budget") {
      result = result.filter((item) => (item.price ?? 0) > 0 && (item.price ?? 0) <= 100000);
    } else if (activeTab === "free") {
      result = result.filter(
        (item) => item.pricing_type === "free" || item.price === null || item.price === 0,
      );
    }
    if (sortBy === "price_asc") {
      result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItems, searchQuery, selectedCategory, selectedArea, activeTab, sortBy, categories]);

  const featured = initialItems.slice(0, 3);
  const heroGrid = initialItems.slice(3, 7);
  const activeFeature = featured.length > 0 ? featured[featureIndex % featured.length] : null;
  const curated = initialItems.slice(0, 4);

  const countForSlug = (slug: string) => {
    const name = categoryName(slug).toLowerCase();
    return initialItems.filter((i) => i.category?.toLowerCase() === name).length;
  };

  const departmentsRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const checkScroll = useCallback(() => {
    const el = departmentsRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = departmentsRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    const timer = setTimeout(checkScroll, 100);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      clearTimeout(timer);
    };
  }, [checkScroll]);

  const scrollDepartments = (direction: "left" | "right") => {
    const el = departmentsRef.current;
    if (!el) return;
    const amount = direction === "left" ? -280 : 280;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = departmentsRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = departmentsRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.4;
    if (Math.abs(walk) > 5) {
      hasMovedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const pickDepartment = (slug: string) => {
    setSelectedCategory((prev) => (prev.toLowerCase() === slug.toLowerCase() ? "all" : slug));
    scrollToId("feed");
  };

  return (
    <div id="top" className="relative min-h-screen bg-[#f2f4f5] text-[#000000]">
      {/* 1. FLOATING LEFT NAV RAIL DOCK */}
      <aside className="pointer-events-none fixed left-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3.5 md:flex" aria-label="Quick navigation">
        <div className="pointer-events-auto flex flex-col items-center gap-5 rounded-full border border-black/[0.04] bg-white px-2.5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={() => scrollToId("top")} aria-label="Home" className="flex h-9 w-9 items-center justify-center rounded-full text-[#000000] transition-colors hover:bg-[#f2f4f5]">
            <HomeIcon className="h-[22px] w-[22px]" />
          </button>
          <button type="button" onClick={() => scrollToId("departments")} aria-label="Departments" className="flex h-9 w-9 items-center justify-center rounded-full text-[#787574] transition-colors hover:text-[#000000]">
            <GridIcon className="h-[21px] w-[21px]" />
          </button>
          <button type="button" onClick={() => scrollToId("feed")} aria-label="Marketplace feed" className="flex h-9 w-9 items-center justify-center rounded-full text-[#787574] transition-colors hover:text-[#000000]">
            <TagIcon className="h-[21px] w-[21px]" />
          </button>
          <button type="button" onClick={() => scrollToId("how")} aria-label="How it works" className="flex h-9 w-9 items-center justify-center rounded-full text-[#787574] transition-colors hover:text-[#000000]">
            <WrenchIcon className="h-[21px] w-[21px]" />
          </button>
        </div>
        <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-full border border-black/[0.04] bg-white px-2.5 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={() => scrollToId("feed")} aria-label={`Saved items (${savedIds.size})`} className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#787574] transition-colors hover:text-[#000000]">
            <HeartIcon className="h-[21px] w-[21px]" />
            {savedIds.size > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#5433eb] text-[10px] font-bold text-white">
                {savedIds.size}
              </span>
            )}
          </button>
          <span aria-label="Pantaker account" role="img" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5433eb] text-sm font-semibold tracking-wide text-white shadow-sm">
            P
          </span>
        </div>
      </aside>

      {/* MOBILE BOTTOM DOCK */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[#ebebeb] bg-white/95 px-3 py-2 backdrop-blur-md md:hidden" aria-label="Mobile navigation">
        <button type="button" onClick={() => scrollToId("top")} className="flex flex-col items-center gap-0.5 text-xs font-semibold text-[#000000]">
          <HomeIcon className="h-5 w-5" />
          <span>Home</span>
        </button>
        <button type="button" onClick={() => scrollToId("departments")} className="flex flex-col items-center gap-0.5 text-xs font-medium text-[#787574]">
          <GridIcon className="h-5 w-5" />
          <span>Shop</span>
        </button>
        <button type="button" onClick={() => scrollToId("feed")} aria-label="Browse feed" className="flex h-12 w-12 -translate-y-4 items-center justify-center rounded-full bg-[#5433eb] text-white ring-4 ring-white" style={{ boxShadow: "var(--shop-shadow-accent)" }}>
          <SearchIcon className="h-6 w-6" />
        </button>
        <button type="button" onClick={() => scrollToId("feed")} className="relative flex flex-col items-center gap-0.5 text-xs font-medium text-[#787574]">
          <HeartIcon className="h-5 w-5" />
          {savedIds.size > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#5433eb] text-[9px] font-bold text-white">
              {savedIds.size}
            </span>
          )}
          <span>Saved</span>
        </button>
        <button type="button" onClick={() => scrollToId("how")} className="flex flex-col items-center gap-0.5 text-xs font-medium text-[#787574]">
          <WrenchIcon className="h-5 w-5" />
          <span>How</span>
        </button>
      </nav>

      {/* MAIN VIEWPORT */}
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 md:pl-24 md:pr-8">
        {/* 2. TOP HEADER */}
        <header className="relative mb-8 flex w-full flex-col items-center">
          {/* Top bar: Brand logo, search pill, Abuja district picker, sell button */}
          <div className="relative flex w-full flex-col gap-3 sm:min-h-[52px] mdlg:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Link href="#top" onClick={(e) => { e.preventDefault(); scrollToId("top"); }} aria-label="Pantaker home" className="flex items-center self-center sm:self-auto">
              <Logo />
            </Link>
            <form
              role="search"
              onSubmit={handleSearchSubmit}
              className="flex w-full max-w-none items-center gap-3 rounded-full border border-black/[0.05] bg-white px-5 py-4 pl-5 shadow-[0px_2px_12px_rgba(0,0,0,0.06)] transition-all focus-within:shadow-[0px_4px_20px_rgba(84,51,235,0.14)] sm:mx-auto sm:max-w-[500px]"
            >
              <SearchIcon className="h-5 w-5 shrink-0 select-none text-[#787574]" aria-hidden="true" />
              <label htmlFor="main-search" className="sr-only">Search listings</label>
              <input
                id="main-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What are you shopping for today?"
                autoComplete="off"
                className="w-full flex-1 border-0 bg-transparent p-0 text-[14px] text-[#000000] outline-none placeholder:text-[#787574] focus-visible:outline-none"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search" className="rounded-full p-1 text-[#787574] hover:bg-[#f2f4f5] hover:text-[#000000]">
                  <XIcon className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                aria-label="Search listings"
                className="flex shrink-0 items-center justify-center rounded-full p-1 text-[#000000] transition hover:text-[#5433eb]"
              >
                <PlusIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAreaDropdown((v) => !v)}
                  aria-expanded={showAreaDropdown}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#ebebeb] bg-white px-3 py-1.5 text-xs font-semibold text-[#000000] transition hover:border-[#000000]"
                >
                  <MapPinIcon className="h-3.5 w-3.5 text-[#5433eb]" aria-hidden="true" />
                  <span>{selectedArea}</span>
                  <ChevronDownIcon className="h-3.5 w-3.5 text-[#787574]" aria-hidden="true" />
                </button>
                {showAreaDropdown && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-[20px] border border-[#ebebeb] bg-white p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
                    <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#787574]">
                      Select Abuja district
                    </p>
                    <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                      {ABUJA_AREAS.map((area) => (
                        <li key={area}>
                          <button
                            type="button"
                            onClick={() => { setSelectedArea(area); setShowAreaDropdown(false); }}
                            className={`flex w-full items-center justify-between rounded-full px-2.5 py-1.5 text-left text-xs ${
                              selectedArea === area
                                ? "bg-[#000000] font-bold text-white"
                                : "text-[#000000] hover:bg-[#f2f4f5]"
                            }`}
                          >
                            <span>{area}</span>
                            {selectedArea === area && <CheckIcon className="h-3 w-3" aria-hidden="true" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Categories row - centered relative to the hero banner */}
          {/* <nav
            id="departments"
            ref={departmentsRef}
            aria-label="Departments"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="scrollbar-none relative -mx-4 mt-5 flex w-[calc(100%+2rem)] cursor-grab items-center overflow-x-auto py-2 select-none active:cursor-grabbing sm:mx-0 sm:w-full"
          >
            <div className="flex min-w-full w-max items-center justify-start gap-5 pl-4 pr-0 sm:justify-center sm:gap-7 sm:pl-6 sm:pr-0">
              {categories.slice(0, 4).map((c, i) => {
                const Icon = CATEGORY_ICONS[c.slug] ?? PackageIcon;
                const tone = CHIP_TONES[i % CHIP_TONES.length];
                const isActive = selectedCategory.toLowerCase() === c.slug.toLowerCase();
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => {
                      if (hasMovedRef.current) return;
                      pickDepartment(c.slug);
                    }}
                    aria-pressed={isActive}
                    className="flex shrink-0 items-center gap-2 whitespace-nowrap transition-opacity hover:opacity-80"
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full shadow-sm"
                      style={{ backgroundColor: tone }}
                    >
                      <Icon className="h-[17px] w-[17px] text-white" aria-hidden="true" />
                    </span>
                    <span className={`text-[13px] ${isActive ? "font-bold text-[#000000] underline underline-offset-4" : "font-medium text-[#000000]"}`}>
                      {c.name}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  if (hasMovedRef.current) return;
                  setSelectedCategory("all");
                  setSearchQuery("");
                  scrollToId("feed");
                }}
                aria-label="Clear department filter"
                className="flex shrink-0 items-center justify-center rounded-full text-[#787574] transition-colors hover:text-[#000000]"
              >
                <GridIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <span aria-hidden="true" className="block h-1 w-1 shrink-0 sm:w-6" />
            </div>
          </nav> */}

          <nav
  id="departments"
  ref={departmentsRef}
  aria-label="Departments"
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseUp}
  className="scrollbar-none relative -mx-4 mt-5 flex w-[calc(100%+2rem)] cursor-grab items-center overflow-x-auto py-2 select-none active:cursor-grabbing sm:mx-0 sm:w-full"
>
  {/* Symmetric padding: centered when it fits, scrolls from the left when it overflows */}
  <div className="flex w-max min-w-full shrink-0 items-center justify-center gap-5 px-4 sm:gap-7 sm:px-0">
    {categories.slice(0, 4).map((c, i) => {
      const Icon = CATEGORY_ICONS[c.slug] ?? PackageIcon;
      const tone = CHIP_TONES[i % CHIP_TONES.length];
      const isActive = selectedCategory.toLowerCase() === c.slug.toLowerCase();
      return (
        <button
          key={c.slug}
          type="button"
          onClick={() => {
            if (hasMovedRef.current) return;
            pickDepartment(c.slug);
          }}
          aria-pressed={isActive}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap transition-opacity hover:opacity-80"
        >
          <span
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full shadow-sm"
            style={{ backgroundColor: tone }}
          >
            <Icon className="h-[17px] w-[17px] text-white" aria-hidden="true" />
          </span>
          <span
            className={`text-[13px] ${
              isActive
                ? "font-bold text-[#000000] underline underline-offset-4"
                : "font-medium text-[#000000]"
            }`}
          >
            {c.name}
          </span>
        </button>
      );
    })}
    <button
      type="button"
      onClick={() => {
        if (hasMovedRef.current) return;
        setSelectedCategory("all");
        setSearchQuery("");
        scrollToId("feed");
      }}
      aria-label="Clear department filter"
      className="flex shrink-0 items-center justify-center rounded-full text-[#787574] transition-colors hover:text-[#000000]"
    >
      <GridIcon className="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
</nav>
        </header>

        {/* 3. HERO SHOWCASE BANNER */}
        {activeFeature && (
          <section aria-label="Featured find" className="relative flex min-h-[460px] w-full items-center overflow-hidden rounded-[32px] bg-[#332f2d] shadow-[0px_4px_24px_rgba(0,0,0,0.08)]">
            {activeFeature.image && (
              <div className="absolute inset-0 z-0" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeFeature.image} alt="" className="h-full w-full object-cover object-center" loading="eager" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
              </div>
            )}
            <div className="relative z-10 flex w-full flex-col items-center justify-between gap-10 p-8 md:p-12 lg:flex-row lg:p-14">
              <div className="flex max-w-xl flex-1 flex-col justify-between self-stretch text-white">
                <div>
                  <div className="text-[13px] font-medium leading-tight tracking-wide text-white/95">
                    Featured find · {activeFeature.category ?? "Recoverable item"}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-white/85">
                    <ConditionBadge value={activeFeature.condition} className="border-white/20 bg-white/10 text-white" />
                    <span>{timeAgo(activeFeature.created_at)}</span>
                  </div>
                </div>
                <div className="my-10 md:my-12">
                  <p className="font-brand-serif text-4xl font-bold leading-none tracking-tight text-white sm:text-5xl md:text-6xl">
                    {activeFeature.title}
                  </p>
                  <p className="mt-3 text-xl font-normal tracking-wide text-white/95 sm:text-2xl">
                    {pricingLabel(activeFeature.pricing_type, activeFeature.price)}
                    <span className="ml-2 text-sm text-white/70">
                      {activeFeature.area ? `${activeFeature.area}, Abuja` : activeFeature.city}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeFeature.category) {
                        const match = categories.find(
                          (c) => c.name.toLowerCase() === (activeFeature.category ?? "").toLowerCase(),
                        );
                        setSelectedCategory(match ? match.slug : "all");
                      }
                      scrollToId("feed");
                    }}
                    className="rounded-full border border-white/10 bg-black/40 px-6 py-2.5 text-[13px] font-medium tracking-tight text-white shadow-sm backdrop-blur-md transition-all hover:bg-black/55"
                  >
                    Shop similar
                  </button>
                  {featured.length > 1 && (
                    <div className="flex items-center gap-1.5 pl-2" role="tablist" aria-label="Featured finds">
                      {featured.map((f, i) => (
                        <button
                          key={f.id}
                          type="button"
                          role="tab"
                          aria-selected={i === featureIndex % featured.length}
                          aria-label={`Show featured find ${i + 1}`}
                          onClick={() => setFeatureIndex(i)}
                          className={`h-1.5 rounded-full ${i === featureIndex % featured.length ? "w-6 bg-white/90" : "w-1.5 bg-white/40"}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {heroGrid.length > 0 && (
                <div className="grid w-full shrink-0 grid-cols-2 gap-3 lg:w-[460px] xl:w-[490px]">
                  {heroGrid.slice(0, 4).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery(item.title.split(" ").slice(0, 2).join(" "));
                        scrollToId("feed");
                      }}
                      className="group relative aspect-[4/4.5] overflow-hidden rounded-[20px] bg-neutral-800 text-left shadow-md"
                      aria-label={`Search for ${item.title}`}
                    >
                      {item.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <span className="flex h-full items-center justify-center p-3 text-center text-xs text-white/70">{item.title}</span>
                      )}
                      <span className="absolute left-2.5 top-2.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[11px] font-medium tracking-tight text-white backdrop-blur-md">
                        {pricingLabel(item.pricing_type, item.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4. TRENDING SELLER TYPES */}
        <section aria-labelledby="trending-heading" className="mb-8 mt-12 w-full">
          <div className="mb-5 flex items-center justify-between">
            <button type="button" onClick={() => scrollToId("feed")} className="group inline-flex items-center gap-1.5">
              <h2 id="trending-heading" className="text-[18px] font-bold tracking-tight text-[#000000]">
                Trending seller types
              </h2>
              <ChevronRightIcon className="h-[18px] w-[18px] text-[#000000] transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
            <span className="text-xs text-[#787574]">
              {isLive ? "Live counts" : "Preview counts"} · Abuja
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {YARD_TYPES.map((yard) => {
              const n = countForSlug(yard.categorySlug);
              return (
                <button
                  key={yard.id}
                  type="button"
                  onClick={() => pickDepartment(yard.categorySlug)}
                  className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-[24px] bg-neutral-200 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={yard.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" aria-hidden="true" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#000000] shadow-sm backdrop-blur-md">
                    {yard.title}
                  </span>
                  <span className="absolute bottom-5 left-5 right-5 text-white">
                    <span className="font-brand-serif block text-3xl font-bold tracking-tight">{yard.title.split(" ")[0]}</span>
                    <span className="mt-1 flex items-center gap-2 text-[12px] text-white/90">
                      <span>{n} {n === 1 ? "listing" : "listings"}</span>
                      <span aria-hidden="true">•</span>
                      <span className="truncate">{yard.where}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 5. CURATED FOR YOU */}
        <section aria-labelledby="curated-heading" className="mb-8 mt-14 w-full">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 id="curated-heading" className="text-[18px] font-bold tracking-tight text-[#000000]">
                Curated for you
              </h2>
              <p className="mt-0.5 text-[13px] text-[#787574]">
                {isLive ? "Fresh picks from Abuja sellers" : "Sample picks — connect Supabase for the live feed"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedArea("All Abuja");
                setActiveTab("all");
                scrollToId("feed");
              }}
              className="text-[13px] font-medium text-[#5433eb] hover:underline"
            >
              View all
            </button>
          </div>
          {curated.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#cccccc] bg-white p-12 text-center">
              <PackageIcon className="mx-auto h-12 w-12 text-[#787574]" aria-hidden="true" />
              <h3 className="mt-3 text-base font-bold text-[#000000]">No picks yet</h3>
              <p className="mt-1 text-xs text-[#787574]">New unwanted items appear here as soon as they are listed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {curated.map((item) => {
                const isSaved = savedIds.has(item.id);
                return (
                  <article key={item.id} className="shop-card group flex cursor-pointer flex-col p-2.5 transition-all hover:-translate-y-0.5">
                    <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-neutral-100">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          loading="lazy"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center p-4 text-center text-xs text-[#787574]">No photo provided</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(item.id, e)}
                        aria-label={isSaved ? "Remove from saved" : "Save item"}
                        aria-pressed={isSaved}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#787574] shadow-sm backdrop-blur-sm transition hover:text-[#5433eb]"
                      >
                        <HeartIcon className="h-[17px] w-[17px]" filled={isSaved} />
                      </button>
                      <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-[#000000]">
                        {item.category ?? "Recoverable item"}
                      </span>
                    </div>
                    <div className="px-1.5 pb-1 pt-2.5">
                      <h4 className="truncate text-[13px] font-semibold text-[#000000]">{item.title}</h4>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[14px] font-bold text-[#000000]">
                          {pricingLabel(item.pricing_type, item.price)}
                        </span>
                        <ConditionBadge value={item.condition} />
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-[#787574]">
                        <MapPinIcon className="h-3 w-3" aria-hidden="true" />
                        {item.area ? `${item.area}, Abuja` : item.city} · {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* 6. FULL FEED WITH FILTERS */}
        <section id="feed" aria-labelledby="feed-heading" className="mb-8 mt-14 w-full scroll-mt-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="feed-heading" className="text-[18px] font-bold tracking-tight text-[#000000]">
                {searchQuery || selectedCategory !== "all" ? "Results" : "Fresh near you"}
              </h2>
              <p className="mt-0.5 text-[13px] text-[#787574]">
                Showing {filteredListings.length} {filteredListings.length === 1 ? "item" : "items"}
                {isLive ? " in Abuja" : " in this preview"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-[#ebebeb] bg-white p-1">
                {[
                  { id: "all", label: "All" },
                  { id: "scrap", label: "Scrap & Parts" },
                  { id: "usable", label: "Usable" },
                  { id: "budget", label: "Under ₦100k" },
                  { id: "free", label: "Free" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    aria-pressed={activeTab === tab.id}
                    className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                      activeTab === tab.id ? "bg-[#000000] text-white shadow-sm" : "text-[#787574] hover:text-[#000000]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <label className="sr-only" htmlFor="feed-sort">Sort listings</label>
              <select
                id="feed-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="cursor-pointer rounded-full border border-[#ebebeb] bg-white px-3 py-1.5 text-xs font-semibold text-[#000000] outline-none hover:border-[#000000]"
              >
                <option value="newest">Sort: Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {filteredListings.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#cccccc] bg-white p-12 text-center">
              <PackageIcon className="mx-auto h-12 w-12 text-[#787574]" aria-hidden="true" />
              <h3 className="mt-3 text-base font-bold text-[#000000]">No items match your search</h3>
              <p className="mt-1 text-xs text-[#787574]">
                Try clearing filters, searching different keywords, or broadening your district.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedArea("All Abuja");
                  setActiveTab("all");
                }}
                className="mt-4 rounded-full border border-[#ebebeb] bg-white px-4 py-2 text-xs font-semibold text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:border-[#000000]"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredListings.map((item) => {
                const isSaved = savedIds.has(item.id);
                return (
                  <article key={item.id} className="shop-card group flex flex-col p-2.5 transition-all hover:-translate-y-0.5">
                    <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-neutral-100">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          loading="lazy"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center p-4 text-center text-xs text-[#787574]">No photo provided</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(item.id, e)}
                        aria-label={isSaved ? "Remove from saved" : "Save item"}
                        aria-pressed={isSaved}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#787574] shadow-sm backdrop-blur-sm transition hover:text-[#5433eb]"
                      >
                        <HeartIcon className="h-[17px] w-[17px]" filled={isSaved} />
                      </button>
                      <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-[#000000]">
                        {item.category ?? "Recoverable item"}
                      </span>
                    </div>
                    <div className="px-1.5 pb-1 pt-2.5">
                      <h4 className="truncate text-[13px] font-semibold text-[#000000]">{item.title}</h4>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[14px] font-bold text-[#000000]">
                          {pricingLabel(item.pricing_type, item.price)}
                        </span>
                        <ConditionBadge value={item.condition} />
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-[#787574]">
                        <MapPinIcon className="h-3 w-3" aria-hidden="true" />
                        {item.area ? `${item.area}, Abuja` : item.city} · {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Trending searches */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#787574]">
              Trending:
            </span>
            {TRENDING_QUERIES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => {
                  setSearchQuery(t.query);
                  setSelectedCategory(t.category);
                  scrollToId("feed");
                }}
                className="rounded-full border border-[#ebebeb] bg-white px-3 py-1 text-xs font-medium text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:border-[#000000]"
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* 7. HOW IT WORKS */}
        <section id="how" aria-labelledby="how-heading" className="mb-8 mt-14 w-full scroll-mt-6">
          <div className="mb-5 text-center">
            <h2 id="how-heading" className="text-[18px] font-bold tracking-tight text-[#000000]">
              How Pantaker works
            </h2>
            <p className="mt-0.5 text-[13px] text-[#787574]">
              Three simple steps to give unwanted items another chance in Abuja
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { step: "Step 1", title: "Snap & list", copy: "Photograph scrap, spare parts, or pre-loved items. Describe the condition honestly and choose your area." },
              { step: "Step 2", title: "Buyers find it nearby", copy: "Repairers, dealers, and refurbishers search by department, condition, and district." },
              { step: "Step 3", title: "Meet & trade safely", copy: "Agree terms, meet in a public place, inspect the item before any payment is made." },
            ].map((s) => (
              <div key={s.title} className="shop-card p-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#787574]">{s.step}</span>
                <h3 className="mt-1 text-base font-bold text-[#000000]">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#787574]">{s.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-16 flex w-full flex-col items-center justify-between gap-4 border-t border-black/[0.06] pb-12 pt-8 text-[12px] text-[#787574] sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#000000]">Pantaker</span>
            <span aria-hidden="true">•</span>
            <span>Abuja, FCT</span>
            <span aria-hidden="true">•</span>
            <span>© 2026 Pantaker</span>
          </div>
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => scrollToId("departments")} className="transition-colors hover:text-[#000000]">
              Departments
            </button>
            <button type="button" onClick={() => scrollToId("feed")} className="transition-colors hover:text-[#000000]">
              Feed
            </button>
            <button type="button" onClick={() => scrollToId("how")} className="transition-colors hover:text-[#000000]">
              How it works
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
