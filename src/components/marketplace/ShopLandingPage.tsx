"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRightIcon,
  CarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CpuIcon,
  HammerIcon,
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
import { ABUJA_AREAS } from "@/lib/areas";
import type { CardListing } from "@/components/marketplace/ListingCard";

interface ShopLandingPageProps {
  initialItems: CardListing[];
  categories: { name: string; slug: string }[];
  isLive: boolean;
  user?: { id: string; email?: string } | null;
}

/** Circular chip tones for department icons (neutral + violet set, no green). */
const CHIP_TONES = ["var(--color-shop-violet)", "var(--color-slate-ink)", "var(--color-ash-veil)", "var(--color-muted-gray)", "var(--color-warm-fog)", "var(--color-violet-wash)", "var(--color-ink-black)", "var(--color-stone-warm)"];

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

interface DistrictPickerProps {
  selectedArea: string;
  onSelectArea: (area: string) => void;
  areaCounts: Record<string, number>;
  onAreaPicked?: () => void;
}

function DistrictPicker({
  selectedArea,
  onSelectArea,
  areaCounts,
  onAreaPicked,
}: DistrictPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const listboxId = useId();

  const visibleAreas = useMemo(() => {
    if (!search.trim()) return ABUJA_AREAS;
    const q = search.toLowerCase().trim();
    return ABUJA_AREAS.filter(
      (a) => a.name.toLowerCase().includes(q) || a.hub.toLowerCase().includes(q),
    );
  }, [search]);

  const isFiltered = selectedArea !== "All Abuja";
  const totalListings = useMemo(
    () => Object.values(areaCounts).reduce((sum, n) => sum + n, 0),
    [areaCounts],
  );

  const closeAndRefocusTrigger = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const pickArea = (name: string) => {
    onSelectArea(name);
    setIsOpen(false);
    onAreaPicked?.();
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setActiveIndex(0);
      return;
    }
    searchRef.current?.focus();
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, isOpen]);

  const moveActive = (delta: number) => {
    if (visibleAreas.length === 0) return;
    setActiveIndex((i) => (i + delta + visibleAreas.length) % visibleAreas.length);
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(visibleAreas.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const area = visibleAreas[activeIndex];
      if (area) pickArea(area.name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (search) {
        setSearch("");
      } else {
        closeAndRefocusTrigger();
      }
    }
  };

  const renderOption = (area: (typeof ABUJA_AREAS)[number], index: number) => {
    const isSelected = selectedArea === area.name;
    const isActive = activeIndex === index;
    const count = areaCounts[area.name] ?? 0;
    return (
      <li
        key={area.name}
        ref={(el) => {
          optionRefs.current[index] = el;
        }}
        id={`${listboxId}-option-${index}`}
        role="option"
        aria-selected={isSelected}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => pickArea(area.name)}
        onKeyDown={handleListKeyDown}
        tabIndex={-1}
        className={`group flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-ring)] ${
          isSelected
            ? "bg-[var(--color-primary-tint)]"
            : isActive
              ? "bg-[var(--color-canvas-mist)]"
              : "hover:bg-[var(--color-canvas-mist)]"
        }`}
      >
        <div className="flex min-w-0 flex-1 flex-col pr-1">
          <span
            className={`truncate text-xs ${
              isSelected
                ? "font-semibold text-[var(--color-ink-black)]"
                : "font-medium text-[var(--color-ink-black)]"
            }`}
          >
            {area.name}
          </span>
          <span className="truncate text-[11px] text-[var(--color-muted-gray)]">
            {area.hub}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {count > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium tabular ${
                isSelected
                  ? "bg-[var(--color-shop-violet)] text-[var(--color-pure-white)]"
                  : "bg-[var(--color-canvas-mist)] text-[var(--color-muted-gray)] group-hover:bg-[var(--color-faint-border)] group-hover:text-[var(--color-ink-black)]"
              }`}
            >
              {count} {count === 1 ? "item" : "items"}
            </span>
          )}
          
        </div>
      </li>
    );
  };

  const allAbujaIndex = visibleAreas.findIndex((a) => a.name === "All Abuja");
  const districtOptions = visibleAreas.filter((a) => a.name !== "All Abuja");

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && !isOpen) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={`Select district: currently ${selectedArea}`}
        className={`inline-flex h-[52px] cursor-pointer items-center gap-1.5 rounded-full border bg-[var(--color-pure-white)] px-3.5 sm:px-4 text-xs outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:outline-none focus-visible:outline-none focus-visible:border-[var(--color-shop-violet)] ${
          isOpen || isFiltered
            ? "border-[var(--color-shop-violet)]"
            : "border-[var(--color-faint-border)]"
        } ${isFiltered ? "text-[var(--color-shop-violet)]" : "text-[var(--color-ink-black)]"}`}
      >
        <MapPinIcon className="h-3.5 w-3.5 text-[var(--color-icon-accent)] shrink-0" aria-hidden="true" />
        <span className={`truncate max-w-[110px] sm:max-w-[140px] ${isFiltered ? "font-semibold text-[var(--color-ink-black)]" : "font-medium text-[var(--color-ink-black)]"}`}>
          {selectedArea}
        </span>
        {isFiltered && (
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-shop-violet)] shrink-0" aria-hidden="true" />
        )}
        <ChevronDownIcon
          className={`h-3.5 w-3.5 text-[var(--color-muted-gray)] transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 sm:w-80 rounded-[24px] border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] p-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-faint-border)] px-2 pb-2.5 pt-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-icon-accent)]" aria-hidden="true" />
                <p className="truncate text-[13px] font-semibold tracking-tight text-[var(--color-ink-black)]">
                  Abuja Districts
                </p>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--color-muted-gray)]" aria-live="polite">
                {search.trim()
                  ? `${visibleAreas.length} of ${ABUJA_AREAS.length} areas`
                  : `${ABUJA_AREAS.length - 1} districts · ${totalListings} ${totalListings === 1 ? "listing" : "listings"}`}
              </p>
            </div>
            {isFiltered ? (
              <button
                type="button"
                onClick={() => pickArea("All Abuja")}
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-[var(--color-shop-violet)] transition-colors hover:bg-[var(--color-primary-tint)]"
              >
                Reset
              </button>
            ) : (
              <span className="shrink-0 rounded-full bg-[var(--color-canvas-mist)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted-gray)]">
                All Abuja
              </span>
            )}
          </div>

          {/* District filter search */}
          <div className="group relative mb-2 mt-2.5 px-0.5">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-gray)] transition-colors duration-150"
              aria-hidden="true"
            />
            <label htmlFor={`${listboxId}-filter`} className="sr-only">
              Filter districts by name or hub
            </label>
            <input
              ref={searchRef}
              id={`${listboxId}-filter`}
              type="text"
              inputMode="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleListKeyDown}
              placeholder="Filter district or hub"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-activedescendant={
                visibleAreas.length > 0 ? `${listboxId}-option-${activeIndex}` : undefined
              }
              aria-autocomplete="list"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              className="h-9 w-full rounded-full border border-[var(--color-ink-10)] bg-[var(--color-canvas-mist)] py-2 pl-9 pr-9 text-[13px] tracking-[-0.015em] text-[var(--color-ink-black)] outline-none focus:outline-none focus-visible:outline-none shadow-none focus:shadow-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-muted-gray)] focus:bg-[var(--color-pure-white)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  searchRef.current?.focus();
                }}
                aria-label="Clear district filter"
                title="Clear filter (Esc)"
                className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--color-muted-gray)] transition-colors duration-150 hover:bg-[var(--color-ink-10)] hover:text-[var(--color-ink-black)]"
              >
                <XIcon className="h-3 w-3" />
              </button>
            )}
          </div>
          {/* District List */}
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Abuja districts"
            className="max-h-60 overflow-y-auto scrollbar-none pr-0.5 pt-1"
          >
            {visibleAreas.length === 0 ? (
              <li className="flex flex-col items-center px-3 py-6 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-canvas-mist)]">
                  <SearchIcon className="h-4 w-4 text-[var(--color-muted-gray)]" aria-hidden="true" />
                </span>
                <p className="mt-2 text-xs font-semibold text-[var(--color-ink-black)]">
                  No districts found
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--color-muted-gray)]">
                  Nothing matches &ldquo;{search.trim()}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    searchRef.current?.focus();
                  }}
                  className="mt-3 cursor-pointer rounded-full border border-[var(--color-faint-border)] px-3 py-1 text-[11px] font-semibold text-[var(--color-ink-black)] outline-none transition-colors duration-150 hover:border-[var(--color-ink-black)] focus:outline-none focus-visible:outline-none focus-visible:border-[var(--color-shop-violet)]"
                >
                  Clear search
                </button>
              </li>
            ) : (
              <>
                {allAbujaIndex >= 0 && renderOption(visibleAreas[allAbujaIndex], allAbujaIndex)}
                {allAbujaIndex >= 0 && districtOptions.length > 0 && (
                  <li aria-hidden="true" className="mx-2 my-1.5 border-t border-[var(--color-faint-border)]" />
                )}
                {districtOptions.map((area) => renderOption(area, visibleAreas.indexOf(area)))}
              </>
            )}
          </ul>

          {/* Keyboard hint */}
          {visibleAreas.length > 0 && (
            <p className="mt-1 border-t border-[var(--color-faint-border)] px-2 pb-0.5 pt-2 text-center text-[11px] text-[var(--color-muted-gray)]">
              <kbd className="rounded border border-[var(--color-faint-border)] bg-[var(--color-canvas-mist)] px-1 font-sans">↑</kbd>
              <kbd className="rounded border border-[var(--color-faint-border)] bg-[var(--color-canvas-mist)] px-1 font-sans">↓</kbd>
              {" to navigate · "}
              <kbd className="rounded border border-[var(--color-faint-border)] bg-[var(--color-canvas-mist)] px-1 font-sans">Enter</kbd>
              {" to select · "}
              <kbd className="rounded border border-[var(--color-faint-border)] bg-[var(--color-canvas-mist)] px-1 font-sans">Esc</kbd>
              {" to close"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ShopLandingPage({ initialItems, categories, isLive, user }: ShopLandingPageProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedArea, setSelectedArea] = useState("All Abuja");
  const [activeTab, setActiveTab] = useState<"all" | "scrap" | "usable" | "budget" | "free">("all");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [featureIndex, setFeatureIndex] = useState(0);

  const areaCounts = useMemo(() => {
    const map: Record<string, number> = { "All Abuja": initialItems.length };
    for (const item of initialItems) {
      if (item.area) {
        map[item.area] = (map[item.area] ?? 0) + 1;
      }
    }
    return map;
  }, [initialItems]);

  const categoryName = (slug: string) =>
    categories.find((c) => c.slug.toLowerCase() === slug.toLowerCase())?.name ?? slug;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scrollToId("feed");
  };

  const handlePlusClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let isAuthed = Boolean(user);
    if (!isAuthed && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          isAuthed = true;
        }
      } catch {
        isAuthed = false;
      }
    }

    if (!isAuthed) {
      router.push("/login?next=/sell");
      return;
    }

    router.push("/sell");
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
      result = result.filter(
        (item) =>
          item.condition === "used" ||
          item.condition === "working" ||
          item.condition === "partially_usable",
      );
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
    router.push(slug ? `/marketplace/${slug}` : "/marketplace");
  };

  return (
    <div id="top" className="relative min-h-screen bg-[var(--shop-canvas)] text-[var(--color-ink-black)]">
      {/* 1. FLOATING LEFT NAV RAIL DOCK */}
      <aside className="pointer-events-none fixed left-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3.5 md:flex" aria-label="Quick navigation">
        <div className="pointer-events-auto flex flex-col items-center gap-5 rounded-full bg-[var(--color-pure-white)] px-2.5 py-4">
          <button type="button" onClick={() => scrollToId("top")} aria-label="Home" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-black)] transition-colors hover:bg-[var(--color-canvas-mist)]">
            <HomeIcon className="h-[22px] w-[22px]" />
          </button>
          <button type="button" onClick={() => scrollToId("departments")} aria-label="Departments" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted-gray)] transition-colors hover:text-[var(--color-ink-black)]">
            <GridIcon className="h-[21px] w-[21px]" />
          </button>
          <button type="button" onClick={() => scrollToId("feed")} aria-label="Marketplace feed" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted-gray)] transition-colors hover:text-[var(--color-ink-black)]">
            <TagIcon className="h-[21px] w-[21px]" />
          </button>
          <button type="button" onClick={() => scrollToId("how")} aria-label="How it works" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted-gray)] transition-colors hover:text-[var(--color-ink-black)]">
            <WrenchIcon className="h-[21px] w-[21px]" />
          </button>
        </div>
        <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-full bg-[var(--color-pure-white)] px-2.5 py-3">
          <Link
            href={user ? "/sell" : "/login?next=/sell"}
            aria-label={user ? "Post a listing" : "Sign in to Pantaker"}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-shop-violet)] text-sm font-semibold tracking-wide text-[var(--color-pure-white)] ring-1 ring-[var(--color-faint-border)] transition-opacity duration-200 hover:opacity-90"
          >
            {user ? (user.email?.[0]?.toUpperCase() ?? "P") : "P"}
          </Link>
        </div>
      </aside>

      {/* MOBILE BOTTOM DOCK */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[var(--color-faint-border)] bg-[var(--overlay-paper-95)] px-3 py-2 backdrop-blur-md md:hidden" aria-label="Mobile navigation">
        <button type="button" onClick={() => scrollToId("top")} className="flex flex-col items-center gap-0.5 text-xs font-medium text-[var(--color-ink-black)]">
          <HomeIcon className="h-5 w-5" />
          <span>Home</span>
        </button>
        <button type="button" onClick={() => scrollToId("departments")} className="flex flex-col items-center gap-0.5 text-xs font-medium text-[var(--color-muted-gray)]">
          <GridIcon className="h-5 w-5" />
          <span>Shop</span>
        </button>
        <button type="button" onClick={() => scrollToId("feed")} aria-label="Browse feed" className="flex h-12 w-12 -translate-y-4 items-center justify-center rounded-full bg-[var(--color-shop-violet)] text-[var(--color-pure-white)] ring-4 ring-[var(--color-pure-white)]">
          <SearchIcon className="h-6 w-6" />
        </button>
        <button type="button" onClick={() => scrollToId("how")} className="flex flex-col items-center gap-0.5 text-xs font-medium text-[var(--color-muted-gray)]">
          <WrenchIcon className="h-5 w-5" />
          <span>How</span>
        </button>
      </nav>

      {/* MAIN VIEWPORT */}
      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 md:pl-24 md:pr-8">
        {/* 2. TOP HEADER */}
        <header className="relative mb-8 flex w-full flex-col items-center">
          {/* Top bar: Brand logo, search pill, Abuja district picker */}
          <div className="relative flex w-full flex-col gap-3 sm:min-h-[64px] mdlg:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex w-full items-center justify-between sm:w-auto">
              <Link href="#top" onClick={(e) => { e.preventDefault(); scrollToId("top"); }} aria-label="Pantaker home" className="flex items-center">
                <Logo />
              </Link>
              <div className="sm:hidden">
                <DistrictPicker
                  selectedArea={selectedArea}
                  onSelectArea={setSelectedArea}
                  areaCounts={areaCounts}
                  onAreaPicked={() => scrollToId("feed")}
                />
              </div>
            </div>
            <form
              role="search"
              onSubmit={handleSearchSubmit}
              className="flex h-[64px] w-full max-w-[352px] items-center gap-3 rounded-full border border-[var(--color-ink-10)] bg-[var(--color-pure-white)] pl-5 pr-2 transition-all focus-within:border-[var(--color-muted-gray)] sm:mx-auto sm:w-[352px]"
            >
              <SearchIcon className="h-5 w-5 shrink-0 select-none text-[var(--color-muted-gray)]" aria-hidden="true" />
              <label htmlFor="main-search" className="sr-only">Search listings</label>
              <input
                id="main-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What are you shopping for today?"
                autoComplete="off"
                className="h-full w-full flex-1 border-0 bg-transparent p-0 text-[15px] sm:text-[16px] text-[var(--color-ink-black)] tracking-[-0.031em] outline-none placeholder:text-[var(--color-muted-gray)] focus-visible:outline-none"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search" className="rounded-full p-1 text-[var(--color-muted-gray)] hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]">
                  <XIcon className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handlePlusClick}
                aria-label="Post a listing"
                className="flex h-[48px] w-[48px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] text-[var(--color-pure-white)] outline-none transition hover:opacity-95 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-shop-violet)]"
              >
                <PlusIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>
            <div className="hidden items-center gap-2 sm:flex">
              <DistrictPicker
                selectedArea={selectedArea}
                onSelectArea={setSelectedArea}
                areaCounts={areaCounts}
                onAreaPicked={() => scrollToId("feed")}
              />
            </div>
          </div>

          {/* Categories row - centered relative to the hero banner */}
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
            <div className="flex w-max min-w-full shrink-0 items-center justify-center gap-3.5 px-4 sm:gap-4 sm:px-0">
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
                    className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full border bg-[var(--color-pure-white)] py-1.5 pl-1.5 pr-3.5 outline-none transition-colors duration-150 hover:border-[var(--color-ink-20)] focus:outline-none focus-visible:outline-none focus-visible:border-[var(--color-shop-violet)] ${
                      isActive
                        ? "border-[var(--color-shop-violet)]"
                        : "border-[var(--color-faint-border)]"
                    }`}
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full"
                      style={{ backgroundColor: tone }}
                    >
                      <Icon className="h-4 w-4 text-[var(--color-pure-white)]" aria-hidden="true" />
                    </span>
                    <span
                      className={`text-[13px] font-medium tracking-tight ${
                        isActive ? "text-[var(--color-shop-violet)]" : "text-[var(--color-ink-black)]"
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
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-muted-gray)] outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] hover:text-[var(--color-ink-black)] focus:outline-none focus-visible:outline-none focus-visible:border-[var(--color-shop-violet)]"
              >
                <GridIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <span aria-hidden="true" className="block h-1 w-2 shrink-0 sm:hidden" />
            </div>
          </nav>
        </header>

        {/* 3. HERO SHOWCASE BANNER */}
        {activeFeature && (
          <section aria-label="Featured find" className="relative flex min-h-[460px] w-full items-center overflow-hidden rounded-[28px] bg-[var(--color-slate-ink)]">
            {activeFeature.image && (
              <div className="absolute inset-0 z-0" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeFeature.image} alt="" className="h-full w-full object-cover object-center" loading="eager" />
                <div className="absolute inset-0 bg-[var(--overlay-ink-60)]" />
              </div>
            )}
            <div className="relative z-10 flex w-full flex-col items-center justify-between gap-10 p-8 md:p-12 lg:flex-row lg:p-14">
              <div className="flex max-w-xl flex-1 flex-col justify-between self-stretch text-[var(--color-pure-white)]">
                <div>
                  <div className="text-[13px] font-medium leading-tight tracking-wide text-[var(--ink-on-dark-95)]">
                    Featured find · {activeFeature.category ?? "Recoverable item"}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--ink-on-dark-85)]">
                    <ConditionBadge value={activeFeature.condition} className="border-[var(--overlay-paper-border-20)] bg-[var(--overlay-paper-10)] text-[var(--color-pure-white)]" />
                    <span>{timeAgo(activeFeature.created_at)}</span>
                  </div>
                </div>
                <div className="my-10 md:my-12">
                  <p className="font-brand-serif text-4xl font-bold leading-none tracking-tight text-[var(--color-pure-white)] sm:text-5xl md:text-6xl">
                    {activeFeature.title}
                  </p>
                  <p className="font-sans tabular mt-3 text-xl font-normal tracking-wide text-[var(--ink-on-dark-95)] sm:text-2xl">
                    {pricingLabel(activeFeature.pricing_type, activeFeature.price)}
                    <span className="ml-2 text-sm text-[var(--ink-on-dark-70)]">
                      {activeFeature.area ? `${activeFeature.area}, Abuja` : activeFeature.city}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      const match = categories.find(
                        (c) => c.name.toLowerCase() === (activeFeature.category ?? "").toLowerCase(),
                      );
                      pickDepartment(match ? match.slug : "");
                    }}
                    className="rounded-full border border-[var(--overlay-paper-border-10)] bg-[var(--overlay-ink-40)] px-6 py-2.5 text-[13px] font-medium tracking-tight text-[var(--color-pure-white)] backdrop-blur-md transition-all hover:bg-[var(--overlay-ink-55)]"
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
                          className={`h-1.5 rounded-full ${i === featureIndex % featured.length ? "w-6 bg-[var(--overlay-paper-90)]" : "w-1.5 bg-[var(--overlay-paper-40)]"}`}
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
                      className="group relative aspect-[4/4.5] overflow-hidden rounded-[20px] bg-neutral-800 text-left"
                      aria-label={`Search for ${item.title}`}
                    >
                      {item.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <span className="flex h-full items-center justify-center p-3 text-center text-xs text-[var(--ink-on-dark-70)]">{item.title}</span>
                      )}
                      <span className="font-sans tabular absolute left-2.5 top-2.5 rounded-full border border-[var(--overlay-paper-border-10)] bg-[var(--overlay-ink-45)] px-2.5 py-1 text-xs font-medium tracking-tight text-[var(--color-pure-white)] backdrop-blur-md">
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
        <section aria-labelledby="trending-heading" className="mb-8 mt-16 w-full">
          <div className="mb-5 flex items-center justify-between">
            <button type="button" onClick={() => scrollToId("feed")} className="group inline-flex items-center gap-1.5">
              <h2 id="trending-heading" className="font-brand-serif text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--color-ink-black)]">
                Trending seller types
              </h2>
              <ChevronRightIcon className="h-[18px] w-[18px] text-[var(--color-ink-black)] transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
            <span className="text-xs text-[var(--color-muted-gray)]">
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
                   className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-[28px] bg-neutral-200 text-left transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={yard.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-[var(--overlay-ink-45)]" aria-hidden="true" />
                  <span className="absolute left-4 top-4 rounded-full bg-[var(--overlay-paper-90)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink-black)] backdrop-blur-md">
                    {yard.title}
                  </span>
                  <span className="absolute bottom-5 left-5 right-5 text-[var(--color-pure-white)]">
                    <span className="font-brand-serif block text-3xl font-semibold tracking-tight">{yard.title.split(" ")[0]}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-[var(--ink-on-dark-90)]">
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
        <section aria-labelledby="curated-heading" className="mb-8 mt-16 w-full">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 id="curated-heading" className="font-brand-serif text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--color-ink-black)]">
                Curated for you
              </h2>
              <p className="mt-0.5 text-[13px] text-[var(--color-muted-gray)]">
                {isLive ? "Fresh picks from Abuja sellers" : "Sample picks — connect Supabase for the live feed"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/marketplace")}
              className="text-[13px] font-medium text-[var(--color-shop-violet)] hover:underline"
            >
              View all
            </button>
          </div>
          {curated.length === 0 ? (
            <div className="rounded-[28px] bg-[var(--color-pure-white)] p-12 text-center">
              <PackageIcon className="mx-auto h-12 w-12 text-[var(--color-muted-gray)]" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-[var(--color-ink-black)]">No picks yet</h3>
              <p className="mt-1 text-xs text-[var(--color-muted-gray)]">New unwanted items appear here as soon as they are listed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {curated.map((item) => {
                return (
                  <article key={item.id} className="shop-card group flex cursor-pointer flex-col p-2.5 transition-all hover:-translate-y-0.5">
                    <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-neutral-100">
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
                        <span className="flex h-full items-center justify-center p-4 text-center text-xs text-[var(--color-muted-gray)]">No photo provided</span>
                      )}
                      <span className="absolute bottom-2 left-2 rounded-full bg-[var(--overlay-paper-95)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-ink-black)]">
                        {item.category ?? "Recoverable item"}
                      </span>
                    </div>
                    <div className="px-1.5 pb-1 pt-2.5">
                      <h4 className="truncate text-[13px] font-semibold text-[var(--color-ink-black)]">{item.title}</h4>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="font-sans tabular text-[14px] font-semibold tracking-tight text-[var(--color-ink-black)]">
                          {pricingLabel(item.pricing_type, item.price)}
                        </span>
                        <ConditionBadge value={item.condition} />
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-muted-gray)]">
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
        <section id="feed" aria-labelledby="feed-heading" className="mb-8 mt-16 w-full scroll-mt-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="feed-heading" className="font-brand-serif text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--color-ink-black)]">
                {searchQuery || selectedCategory !== "all" ? "Results" : "Fresh near you"}
              </h2>
              <p className="mt-0.5 text-[13px] text-[var(--color-muted-gray)]">
                Showing {filteredListings.length} {filteredListings.length === 1 ? "item" : "items"}
                {isLive ? " in Abuja" : " in this preview"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] p-1">
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
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      activeTab === tab.id ? "bg-[var(--color-ink-black)] text-[var(--color-pure-white)]" : "text-[var(--color-muted-gray)] hover:text-[var(--color-ink-black)]"
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
                className="cursor-pointer rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-black)] outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-muted-gray)]"
              >
                <option value="newest">Sort: Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {filteredListings.length === 0 ? (
            <div className="flex flex-col items-center rounded-[28px] bg-[var(--color-pure-white)] p-10 text-center sm:p-14">
              <div className="relative mb-3 h-44 w-44">
                <Image
                  src="/illustrations/Recycling-rafiki.svg"
                  alt=""
                  fill
                  className="object-contain"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-2 text-base font-semibold text-[var(--color-ink-black)]">No items match your search</h3>
              <p className="mt-1 max-w-sm text-xs text-[var(--color-muted-gray)]">
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
                className="mt-5 rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 py-2 text-xs font-semibold text-[var(--color-ink-black)] transition hover:border-[var(--color-ink-black)] hover:bg-[var(--color-canvas-mist)]"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredListings.map((item) => {
                return (
                  <article key={item.id} className="shop-card group flex flex-col p-2.5 transition-all hover:-translate-y-0.5">
                    <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-neutral-100">
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
                        <span className="flex h-full items-center justify-center p-4 text-center text-xs text-[var(--color-muted-gray)]">No photo provided</span>
                      )}
                      <span className="absolute bottom-2 left-2 rounded-full bg-[var(--overlay-paper-95)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-ink-black)]">
                        {item.category ?? "Recoverable item"}
                      </span>
                    </div>
                    <div className="px-1.5 pb-1 pt-2.5">
                      <h4 className="truncate text-[13px] font-semibold text-[var(--color-ink-black)]">{item.title}</h4>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="font-sans tabular text-[14px] font-semibold tracking-tight text-[var(--color-ink-black)]">
                          {pricingLabel(item.pricing_type, item.price)}
                        </span>
                        <ConditionBadge value={item.condition} />
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-muted-gray)]">
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
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-gray)]">
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
                className="rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-3 py-1 text-xs font-medium text-[var(--color-ink-black)] transition hover:border-[var(--color-ink-black)]"
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* CIRCULAR ECONOMY SPOTLIGHT BANNER */}
        <section aria-label="Circular economy call to action" className="my-16 w-full">
          <div className="flex flex-col-reverse items-center justify-between gap-8 rounded-[28px] bg-[var(--color-pure-white)] p-8 sm:p-12 mdlg:flex-row">
            <div className="max-w-xl text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-shop-violet)]">
                Abuja Circular Marketplace
              </span>
              <h2 className="font-brand-serif mt-2 text-2xl font-bold tracking-tight text-[var(--color-ink-black)] sm:text-3xl">
                Give unwanted things another chance.
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
                From building offcuts in Dei-Dei to mechanic salvage in Apo and commercial spares in Garki, Pantaker connects what you don&rsquo;t need with repairers and makers who do.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => scrollToId("feed")}
                  className="rounded-full bg-[var(--color-shop-violet)] px-6 py-2.5 text-xs font-semibold text-[var(--color-pure-white)] transition hover:opacity-95"
                >
                  Explore listings
                </button>
                <button
                  type="button"
                  onClick={() => scrollToId("how")}
                  className="rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 py-2.5 text-xs font-semibold text-[var(--color-ink-black)] transition hover:border-[var(--color-ink-black)]"
                >
                  Learn how it works
                </button>
              </div>
            </div>
            <div className="relative h-56 w-full max-w-sm shrink-0 sm:h-64">
              <Image
                src="/illustrations/Recycling-amico.svg"
                alt=""
                fill
                className="object-contain"
                aria-hidden="true"
              />
            </div>
          </div>
        </section>

        {/* 7. HOW IT WORKS */}
        <section id="how" aria-labelledby="how-heading" className="mb-8 mt-16 w-full scroll-mt-6">
          <div className="mb-5 text-center">
            <h2 id="how-heading" className="font-brand-serif text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--color-ink-black)]">
              How Pantaker works
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--color-muted-gray)]">
              Three simple steps to give unwanted items another chance in Abuja
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                step: "Step 1",
                title: "Snap & list",
                copy: "Photograph scrap, spare parts, or pre-loved items. Describe the condition honestly and choose your area.",
                illustration: "/illustrations/Recycling-bro.svg",
              },
              {
                step: "Step 2",
                title: "Buyers find it nearby",
                copy: "Repairers, dealers, and refurbishers search by department, condition, and district.",
                illustration: "/illustrations/Waste management-pana.svg",
              },
              {
                step: "Step 3",
                title: "Meet & trade safely",
                copy: "Agree terms, meet in a public place, inspect the item before any payment is made.",
                illustration: "/illustrations/Waste management-rafiki.svg",
              },
            ].map((s) => (
              <div key={s.title} className="shop-card flex flex-col p-6">
                <div className="relative mb-5 flex h-40 w-full items-center justify-center overflow-hidden rounded-[20px] bg-[var(--color-canvas-mist)]/50 p-2">
                  <Image
                    src={s.illustration}
                    alt=""
                    fill
                    className="object-contain p-2"
                    aria-hidden="true"
                  />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-gray)]">{s.step}</span>
                <h3 className="mt-1 text-base font-semibold text-[var(--color-ink-black)]">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted-gray)]">{s.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-16 flex w-full flex-col items-center justify-between gap-4 border-t border-[var(--color-ink-06)] pb-12 pt-8 text-[12px] text-[var(--color-muted-gray)] sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--color-ink-black)]">Pantaker</span>
            <span aria-hidden="true">•</span>
            <span>Abuja, FCT</span>
            <span aria-hidden="true">•</span>
            <span>© 2026 Pantaker</span>
          </div>
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => scrollToId("departments")} className="transition-colors hover:text-[var(--color-ink-black)]">
              Departments
            </button>
            <button type="button" onClick={() => router.push("/marketplace")} className="transition-colors hover:text-[var(--color-ink-black)]">
              Feed
            </button>
            <button type="button" onClick={() => scrollToId("how")} className="transition-colors hover:text-[var(--color-ink-black)]">
              How it works
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
