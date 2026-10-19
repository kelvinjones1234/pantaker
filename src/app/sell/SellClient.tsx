"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ArrowRightIcon, CaretDownIcon, CheckIcon } from "@/components/brand/icons";
import { ImageUploader, type UploadedImage } from "@/components/marketplace/ImageUploader";
import { createListingAction } from "@/features/listings/actions";
import { createListingSchema } from "@/lib/validation/listings";
import { weightUnits } from "@/config/site";

const inputClass =
  "h-[52px] w-full rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]";

const selectClass =
  "h-[52px] w-full cursor-pointer appearance-none rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] pl-4 pr-11 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]";

const textareaClass =
  "w-full rounded-[20px] border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] p-4 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]";

const labelClass = "block text-xs font-semibold text-[var(--color-ink-black)] mb-1.5";

const ABUJA_AREAS = [
  "Apo",
  "Dei-Dei",
  "Garki",
  "Wuse 2",
  "Idu Industrial",
  "Kubwa",
  "Jabi",
  "Utako",
  "Lugbe",
  "Maitama",
  "Asokoro",
  "Gwarinpa",
  "Central Area",
  "Mpape",
  "Bwari",
  "Karu / Nyanya",
  "Kuje",
];

interface SellCategory {
  id?: string;
  name: string;
  slug: string;
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1.5 text-xs text-[var(--color-error)]">{messages[0]}</p>;
}

function SelectField({
  invalid,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select {...props} aria-invalid={invalid} className={selectClass}>
        {children}
      </select>
      <CaretDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-gray)]" />
    </div>
  );
}

export function SellClient({
  categories,
  userEmail,
  isLive,
  imageUploadsConfigured,
}: {
  categories: SellCategory[];
  userEmail?: string;
  isLive: boolean;
  imageUploadsConfigured: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pricingType, setPricingType] = useState<"negotiable" | "fixed" | "free" | "offer">("negotiable");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [result, setResult] = useState<{ preview: boolean } | null>(null);

  const titleId = useId();
  const categoryId = useId();
  const conditionId = useId();
  const quantityId = useId();
  const quantityUnitId = useId();
  const priceId = useId();
  const areaId = useId();
  const descriptionId = useId();
  const pickupNotesId = useId();

  const uploading = images.some((image) => image.status === "uploading");
  const doneImageIds = images.filter((image) => image.status === "done" && image.id).map((image) => image.id);

  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0) return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    firstInvalid?.focus();
  }, [fieldErrors]);

  const resetForm = () => {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setTitle("");
    setDescription("");
    setFieldErrors({});
    setErrorMsg(null);
    setPricingType("negotiable");
    setResult(null);
    formRef.current?.reset();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploading) return;
    setErrorMsg(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    formData.set("city", "Abuja");
    formData.set("negotiable", pricingType === "negotiable" ? "on" : "");
    formData.set("image_ids", JSON.stringify(doneImageIds));

    // Validate locally first so the preview path behaves like production.
    const parsed = createListingSchema.safeParse({
      title: formData.get("title"),
      category_id: formData.get("category_id"),
      description: formData.get("description"),
      condition: formData.get("condition"),
      pricing_type: formData.get("pricing_type"),
      price: formData.get("price") || null,
      negotiable: formData.get("negotiable") === "on",
      quantity: formData.get("quantity") || null,
      quantity_unit: formData.get("quantity_unit") || null,
      city: formData.get("city"),
      area: formData.get("area") || null,
      pickup_notes: formData.get("pickup_notes") || null,
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
      setFieldErrors(errors);
      setErrorMsg(Object.values(errors)[0]?.[0] ?? "Please fix the highlighted fields.");
      return;
    }

    // Preview mode: validated, but nothing is saved.
    if (!isLive) {
      setResult({ preview: true });
      return;
    }

    startTransition(async () => {
      try {
        const res = await createListingAction(formData);
        if (!res.ok) {
          const errors = res.errors as Record<string, string[] | undefined>;
          if (errors._form?.length) setErrorMsg(errors._form[0]);
          setFieldErrors(errors as Record<string, string[]>);
          return;
        }
        setResult({ preview: false });
      } catch {
        setErrorMsg("Something went wrong saving your listing. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[var(--shop-canvas)] text-[var(--color-ink-black)]">
      {/* Top Header */}
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Pantaker home" className="flex items-center">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden text-xs text-[var(--color-muted-gray)] sm:inline">
              Listing as <strong className="font-semibold text-[var(--color-ink-black)]">{userEmail}</strong>
            </span>
          )}
          <Link
            href="/"
            className="rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-ink-black)] transition hover:border-[var(--color-ink-30)]"
          >
            Cancel
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4 sm:px-6">
        {result ? (
          <div className="flex flex-col items-center rounded-[28px] bg-[var(--color-pure-white)] p-8 text-center sm:p-12">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-tint)]">
              <CheckIcon className="h-7 w-7 text-[var(--color-shop-violet)]" />
            </span>
            <h1 className="font-brand-serif mt-4 text-2xl font-bold tracking-tight text-[var(--color-ink-black)]">
              {result.preview ? "Looks good — preview only" : "Listing submitted"}
            </h1>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
              {result.preview
                ? "Supabase isn't connected, so this listing was validated but not saved. Connect a project to publish for real."
                : "Your listing is pending review. It will appear in the marketplace once it's approved."}
            </p>
            <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/"
                className="inline-flex h-[52px] items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-6 text-sm font-semibold text-[var(--color-pure-white)] transition hover:bg-[var(--color-primary-hover)]"
              >
                Browse listings
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-[52px] cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-6 text-sm font-semibold text-[var(--color-ink-black)] transition hover:border-[var(--color-ink-30)]"
              >
                Post another
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] bg-[var(--color-pure-white)] p-6 sm:p-10">
            <div className="mb-8">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-shop-violet)]">
                Abuja Circular Marketplace
              </span>
              <h1 className="font-brand-serif mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink-black)]">
                List an unwanted item or scrap
              </h1>
              <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
                Connect surplus materials, equipment, and pre-loved items with repairers, makers, and buyers across Abuja.
              </p>
            </div>

            

            <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
              {/* Title */}
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <label htmlFor={titleId} className="block text-xs font-semibold text-[var(--color-ink-black)]">
                    Item Name <span className="text-[var(--color-shop-violet)]">*</span>
                  </label>
                  <span className="text-[11px] tabular text-[var(--color-muted-gray)]">{title.length}/120</span>
                </div>
                <input
                  id={titleId}
                  name="title"
                  type="text"
                  required
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.title)}
                  placeholder="e.g. Copper offcuts ~25kg, Leftover aluminium sheets, Used office chair"
                  className={inputClass}
                />
                <FieldError messages={fieldErrors.title} />
              </div>

              {/* Photos */}
              <div>
                <ImageUploader
                  images={images}
                  onChange={setImages}
                  disabled={isPending}
                  uploadEnabled={imageUploadsConfigured}
                />
                <FieldError messages={fieldErrors.image_ids} />
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={categoryId} className={labelClass}>
                    Department / Category <span className="text-[var(--color-shop-violet)]">*</span>
                  </label>
                  <SelectField
                    id={categoryId}
                    name="category_id"
                    required
                    defaultValue={categories[0]?.id ?? ""}
                    invalid={Boolean(fieldErrors.category_id)}
                  >
                    {categories.map((category) => (
                      <option key={category.slug} value={category.id ?? category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </SelectField>
                  <FieldError messages={fieldErrors.category_id} />
                </div>

                <div>
                  <label htmlFor={conditionId} className={labelClass}>
                    Condition <span className="text-[var(--color-shop-violet)]">*</span>
                  </label>
                  <SelectField
                    id={conditionId}
                    name="condition"
                    defaultValue="scrap"
                    invalid={Boolean(fieldErrors.condition)}
                  >
                    <option value="scrap">Scrap &amp; raw offcuts</option>
                    <option value="working">Working (ready to use)</option>
                    <option value="partially_usable">Partially usable</option>
                    <option value="used">Used / pre-loved</option>
                    <option value="for_parts">For parts / repairable</option>
                    <option value="damaged">Damaged</option>
                    <option value="unclassified">Unclassified</option>
                  </SelectField>
                  <FieldError messages={fieldErrors.condition} />
                </div>
              </div>

              {/* Quantity & Weight */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={quantityId} className={labelClass}>
                    Quantity <span className="font-normal text-[var(--color-muted-gray)]">(optional)</span>
                  </label>
                  <input
                    id={quantityId}
                    name="quantity"
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    aria-invalid={Boolean(fieldErrors.quantity)}
                    placeholder="e.g. 25"
                    className={inputClass}
                  />
                  <FieldError messages={fieldErrors.quantity} />
                </div>

                <div>
                  <label htmlFor={quantityUnitId} className={labelClass}>
                    Weight <span className="font-normal text-[var(--color-muted-gray)]">(optional)</span>
                  </label>
                  <SelectField
                    id={quantityUnitId}
                    name="quantity_unit"
                    defaultValue=""
                    invalid={Boolean(fieldErrors.quantity_unit)}
                  >
                    <option value="">Select weight</option>
                    {weightUnits.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </SelectField>
                  <FieldError messages={fieldErrors.quantity_unit} />
                </div>
              </div>

              {/* Pricing Type & Price */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Pricing Type <span className="text-[var(--color-shop-violet)]">*</span>
                  </label>
                  <SelectField
                    name="pricing_type"
                    value={pricingType}
                    onChange={(event) => setPricingType(event.target.value as typeof pricingType)}
                  >
                    <option value="negotiable">Negotiable Price</option>
                    <option value="fixed">Fixed Price</option>
                    <option value="offer">Accepting Offers</option>
                    <option value="free">Free / Give Away</option>
                  </SelectField>
                </div>

                {pricingType !== "free" && (
                  <div>
                    <label htmlFor={priceId} className={labelClass}>
                      Price (₦ NGN){" "}
                      {pricingType === "fixed" || pricingType === "negotiable" ? (
                        <span className="text-[var(--color-shop-violet)]">*</span>
                      ) : null}
                    </label>
                    <input
                      id={priceId}
                      name="price"
                      type="number"
                      min="0"
                      step="100"
                      inputMode="numeric"
                      aria-invalid={Boolean(fieldErrors.price)}
                      placeholder="e.g. 45000"
                      className={inputClass}
                    />
                    <FieldError messages={fieldErrors.price} />
                  </div>
                )}
              </div>

              {/* District / Area */}
              <div>
                <label htmlFor={areaId} className={labelClass}>
                  District / Yard Location in Abuja <span className="text-[var(--color-shop-violet)]">*</span>
                </label>
                <SelectField
                  id={areaId}
                  name="area"
                  defaultValue="Apo"
                  invalid={Boolean(fieldErrors.area)}
                >
                  {ABUJA_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}, Abuja
                    </option>
                  ))}
                </SelectField>
                <FieldError messages={fieldErrors.area} />
              </div>

              {/* Description */}
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <label htmlFor={descriptionId} className="block text-xs font-semibold text-[var(--color-ink-black)]">
                    Description <span className="text-[var(--color-shop-violet)]">*</span>
                  </label>
                  <span className="text-[11px] tabular text-[var(--color-muted-gray)]">{description.length}/4000</span>
                </div>
                <textarea
                  id={descriptionId}
                  name="description"
                  required
                  rows={4}
                  maxLength={4000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.description)}
                  placeholder="Describe what the item is, quantity, grade, any known defects, or where it was salvaged from (min 20 characters)..."
                  className={textareaClass}
                />
                <FieldError messages={fieldErrors.description} />
              </div>

              {/* Pickup Notes */}
              <div>
                <label htmlFor={pickupNotesId} className={labelClass}>
                  Pickup / Meeting Notes <span className="font-normal text-[var(--color-muted-gray)]">(optional)</span>
                </label>
                <input
                  id={pickupNotesId}
                  name="pickup_notes"
                  type="text"
                  aria-invalid={Boolean(fieldErrors.pickup_notes)}
                  placeholder="e.g. Pickup at workshop opposite mechanic junction, daytime only"
                  className={inputClass}
                />
                <FieldError messages={fieldErrors.pickup_notes} />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending || uploading}
                  className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--color-shop-violet)] px-6 text-sm font-semibold text-[var(--color-pure-white)] transition hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
                >
                  <span>
                    {uploading ? "Uploading photos…" : isPending ? "Posting listing…" : "Publish Listing"}
                  </span>
                  {!uploading && !isPending && <ArrowRightIcon className="h-4 w-4" />}
                </button>
                <p className="mt-2 text-center text-[11px] text-[var(--color-muted-gray)]">
                  Listings are reviewed before they appear in the marketplace.
                </p>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
