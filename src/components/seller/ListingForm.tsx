"use client";

import { useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CaretDownIcon,
  CheckIcon,
  EyeIcon,
} from "@/components/brand/icons";
import {
  ImageUploader,
  type UploadedImage,
} from "@/components/marketplace/ImageUploader";
import {
  createListingAction,
  updateListingAction,
} from "@/features/listings/actions";
import { createListingSchema } from "@/lib/validation/listings";
import { weightUnits } from "@/config/site";
import { ABUJA_AREAS, ALL_ABUJA } from "@/lib/areas";
import { CONDITION_LABELS, PRICING_LABELS } from "@/types/marketplace";
import { formatNGN } from "@/lib/utils";

const inputClass =
  "h-[52px] w-full rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]";

const selectClass =
  "h-[52px] w-full cursor-pointer appearance-none rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] pl-4 pr-11 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]";

const textareaClass =
  "w-full rounded-[20px] border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] p-4 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]";

const labelClass =
  "block text-xs font-semibold text-[var(--color-ink-black)] mb-1.5";

const AREA_OPTIONS = ABUJA_AREAS.filter((area) => area.name !== ALL_ABUJA);

const CONDITIONS = Object.keys(CONDITION_LABELS) as Array<
  keyof typeof CONDITION_LABELS
>;
const PRICING_TYPES = ["negotiable", "fixed", "offer", "free"] as const;
type PricingType = (typeof PRICING_TYPES)[number];

export interface ListingFormCategory {
  id?: string;
  name: string;
  slug: string;
}

export interface ListingFormInitial {
  title: string;
  description: string;
  category_id: string | null;
  condition: string;
  pricing_type: string;
  price: number | null;
  quantity: number | null;
  quantity_unit: string | null;
  area: string | null;
  pickup_notes: string | null;
  images: Array<{ id: string; url: string; name: string }>;
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1.5 text-xs text-[var(--color-error)]">{messages[0]}</p>
  );
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

function Section({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="shop-card p-5 sm:p-7">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-shop-violet)]">
          Section {step}
        </p>
        <h2 className="font-brand-serif mt-1 text-lg font-bold tracking-tight text-[var(--color-ink-black)]">
          {title}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

export function ListingForm({
  mode,
  categories,
  isLive,
  imageUploadsConfigured,
  listingId,
  initial,
  defaults,
}: {
  mode: "create" | "edit";
  categories: ListingFormCategory[];
  isLive: boolean;
  imageUploadsConfigured: boolean;
  listingId?: string;
  initial?: ListingFormInitial;
  /** Seller settings defaults applied to new listings (create mode only). */
  defaults?: { area?: string | null; pickup_notes?: string | null };
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pricingType, setPricingType] = useState<PricingType>(
    (PRICING_TYPES as readonly string[]).includes(initial?.pricing_type ?? "")
      ? (initial!.pricing_type as PricingType)
      : "negotiable",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [images, setImages] = useState<UploadedImage[]>(() =>
    (initial?.images ?? []).map((image) => ({
      localId: `existing-${image.id}`,
      id: image.id,
      name: image.name,
      previewUrl: image.url,
      status: "done" as const,
      progress: 100,
    })),
  );
  const [reviewMode, setReviewMode] = useState(false);
  const [result, setResult] = useState<{ intent: "draft" | "publish" } | null>(
    null,
  );

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
  const doneImageIds = images
    .filter((image) => image.status === "done" && image.id)
    .map((image) => image.id);

  const preferredArea = initial?.area ?? defaults?.area ?? null;
  const areaOptions =
    preferredArea && !AREA_OPTIONS.some((area) => area.name === preferredArea)
      ? [preferredArea, ...AREA_OPTIONS.map((area) => area.name)]
      : AREA_OPTIONS.map((area) => area.name);

  const collectFormData = (): FormData => {
    const formData = new FormData(formRef.current!);
    formData.set("city", "Abuja");
    formData.set("negotiable", pricingType === "negotiable" ? "on" : "");
    formData.set("image_ids", JSON.stringify(doneImageIds));
    return formData;
  };

  const validate = () => {
    const formData = collectFormData();
    return createListingSchema.safeParse({
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
  };

  const runSave = (intent: "draft" | "publish") => {
    if (uploading || submittingRef.current) return;
    setErrorMsg(null);
    setFieldErrors({});

    const parsed = validate();
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >;
      setFieldErrors(errors);
      setErrorMsg(
        Object.values(errors)[0]?.[0] ?? "Please fix the highlighted fields.",
      );
      setReviewMode(false);
      const firstInvalid = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"]',
      );
      firstInvalid?.focus();
      return;
    }

    if (!isLive) {
      setResult({ intent });
      return;
    }

    submittingRef.current = true;
    startTransition(async () => {
      try {
        const formData = collectFormData();
        formData.set("intent", intent);
        const res =
          mode === "create"
            ? await createListingAction(formData)
            : await updateListingAction(listingId!, formData);

        if (!res.ok) {
          const errors = res.errors as Record<string, string[] | undefined>;
          if (errors._form?.length) setErrorMsg(errors._form[0]);
          setFieldErrors(errors as Record<string, string[]>);
          setReviewMode(false);
          return;
        }
        setResult({ intent });
      } catch {
        setErrorMsg(
          "Something went wrong saving your listing. Please try again.",
        );
      } finally {
        submittingRef.current = false;
      }
    });
  };

  const reviewPrimary = () => {
    if (mode === "create") runSave("publish");
    else runSave("publish");
  };

  if (result) {
    const isDraft = result.intent === "draft";
    const heading = !isLive
      ? mode === "edit"
        ? "Preview only — nothing saved"
        : isDraft
          ? "Draft preview only"
          : "Looks good — preview only"
      : mode === "edit"
        ? "Changes saved"
        : isDraft
          ? "Draft saved"
          : "Listing submitted";
    const copy = !isLive
      ? "The database isn't connected, so this was validated but not saved. Connect it to publish for real."
      : mode === "edit"
        ? "Your listing has been updated."
        : isDraft
          ? "Your draft is private. Submit it for review whenever you're ready."
          : "Your listing is pending review. It will appear in the marketplace once it's approved.";
    return (
      <div className="shop-card flex flex-col items-center p-8 text-center sm:p-12">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-tint)]">
          <CheckIcon className="h-7 w-7 text-[var(--color-shop-violet)]" />
        </span>
        <h1 className="font-brand-serif mt-4 text-2xl font-bold tracking-tight text-[var(--color-ink-black)]">
          {heading}
        </h1>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
          {copy}
        </p>
        <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/seller/listings"
            className="inline-flex h-[52px] items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-6 text-sm font-semibold text-[var(--color-pure-white)] transition hover:bg-[var(--color-primary-hover)]"
          >
            My listings
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex h-[52px] items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-6 text-sm font-semibold text-[var(--color-ink-black)] transition hover:border-[var(--color-ink-30)]"
          >
            Browse marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-5"
      noValidate
    >
      <Section
        step="1"
        title="Photos"
        description="Up to 3 photos. The first one is used as the cover in the marketplace."
      >
        <ImageUploader
          images={images}
          onChange={setImages}
          disabled={isPending}
          uploadEnabled={imageUploadsConfigured}
          listingId={listingId}
        />
        <FieldError messages={fieldErrors.image_ids} />
      </Section>

      <Section
        step="2"
        title="Item information"
        description="What are you listing, and what condition is it in?"
      >
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label
              htmlFor={titleId}
              className="block text-xs font-semibold text-[var(--color-ink-black)]"
            >
              Item name{" "}
              <span className="text-[var(--color-shop-violet)]">*</span>
            </label>
            <span className="text-[11px] tabular text-[var(--color-muted-gray)]">
              {title.length}/120
            </span>
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
            placeholder="e.g. Copper offcuts ~25kg, Used office chair"
            className={inputClass}
          />
          <FieldError messages={fieldErrors.title} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={categoryId} className={labelClass}>
              Category{" "}
              <span className="text-[var(--color-shop-violet)]">*</span>
            </label>
            <SelectField
              id={categoryId}
              name="category_id"
              required
              defaultValue={initial?.category_id ?? categories[0]?.id ?? ""}
              invalid={Boolean(fieldErrors.category_id)}
            >
              {categories.length === 0 && (
                <option value="">No categories available</option>
              )}
              {categories.map((category) => (
                <option
                  key={category.slug}
                  value={category.id ?? category.slug}
                >
                  {category.name}
                </option>
              ))}
            </SelectField>
            <FieldError messages={fieldErrors.category_id} />
          </div>

          <div>
            <label htmlFor={conditionId} className={labelClass}>
              Condition{" "}
              <span className="text-[var(--color-shop-violet)]">*</span>
            </label>
            <SelectField
              id={conditionId}
              name="condition"
              defaultValue={initial?.condition ?? "scrap"}
              invalid={Boolean(fieldErrors.condition)}
            >
              {CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {CONDITION_LABELS[condition]}
                </option>
              ))}
            </SelectField>
            <FieldError messages={fieldErrors.condition} />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label
              htmlFor={descriptionId}
              className="block text-xs font-semibold text-[var(--color-ink-black)]"
            >
              Description{" "}
              <span className="text-[var(--color-shop-violet)]">*</span>
            </label>
            <span className="text-[11px] tabular text-[var(--color-muted-gray)]">
              {description.length}/4000
            </span>
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
            placeholder="Describe quantity, grade, any faults, and what's included (min 20 characters)…"
            className={textareaClass}
          />
          <FieldError messages={fieldErrors.description} />
        </div>
      </Section>

      <Section
        step="3"
        title="Price and quantity"
        description="Set how you want to price it. Prices are whole naira amounts."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              Pricing type{" "}
              <span className="text-[var(--color-shop-violet)]">*</span>
            </label>
            <SelectField
              name="pricing_type"
              value={pricingType}
              onChange={(event) =>
                setPricingType(event.target.value as PricingType)
              }
            >
              {PRICING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PRICING_LABELS[type]}
                </option>
              ))}
            </SelectField>
            <FieldError messages={fieldErrors.pricing_type} />
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
                step="1"
                inputMode="numeric"
                defaultValue={initial?.price ?? undefined}
                aria-invalid={Boolean(fieldErrors.price)}
                placeholder="e.g. 45000"
                className={inputClass}
              />
              <FieldError messages={fieldErrors.price} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={quantityId} className={labelClass}>
              Quantity{" "}
              <span className="font-normal text-[var(--color-muted-gray)]">
                (optional)
              </span>
            </label>
            <input
              id={quantityId}
              name="quantity"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              defaultValue={initial?.quantity ?? undefined}
              aria-invalid={Boolean(fieldErrors.quantity)}
              placeholder="e.g. 25"
              className={inputClass}
            />
            <FieldError messages={fieldErrors.quantity} />
          </div>

          <div>
            <label htmlFor={quantityUnitId} className={labelClass}>
              Unit{" "}
              <span className="font-normal text-[var(--color-muted-gray)]">
                (optional)
              </span>
            </label>
            <SelectField
              id={quantityUnitId}
              name="quantity_unit"
              defaultValue={initial?.quantity_unit ?? ""}
              invalid={Boolean(fieldErrors.quantity_unit)}
            >
              <option value="">No unit</option>
              {weightUnits.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </SelectField>
            <FieldError messages={fieldErrors.quantity_unit} />
          </div>
        </div>
      </Section>

      <Section
        step="4"
        title="Location and collection"
        description="Pantaker currently serves Abuja. Tell buyers where and how to collect."
      >
        <div>
          <label htmlFor={areaId} className={labelClass}>
            District / area in Abuja{" "}
            <span className="text-[var(--color-shop-violet)]">*</span>
          </label>
          <SelectField
            id={areaId}
            name="area"
            defaultValue={preferredArea ?? AREA_OPTIONS[0]?.name ?? ""}
            invalid={Boolean(fieldErrors.area)}
          >
            {areaOptions.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </SelectField>
          <FieldError messages={fieldErrors.area} />
        </div>

        <div>
          <label htmlFor={pickupNotesId} className={labelClass}>
            Collection notes{" "}
            <span className="font-normal text-[var(--color-muted-gray)]">
              (optional)
            </span>
          </label>
          <input
            id={pickupNotesId}
            name="pickup_notes"
            type="text"
            defaultValue={
              initial?.pickup_notes ?? defaults?.pickup_notes ?? undefined
            }
            aria-invalid={Boolean(fieldErrors.pickup_notes)}
            placeholder="e.g. Pickup at workshop, daytime only"
            className={inputClass}
          />
          <FieldError messages={fieldErrors.pickup_notes} />
        </div>
      </Section>

      <Section
        step="5"
        title="Preview and publish"
        description="Check the details below, then publish or save for later."
      >
        {reviewMode && (
          <div className="rounded-[20px] bg-[var(--color-canvas-mist)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-gray)]">
              Buyer preview
            </p>
            <div className="mt-3 flex gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[16px] bg-[var(--color-pure-white)]">
                {images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[0].previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-[11px] text-[var(--color-muted-gray)]">
                    No photo
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[var(--color-ink-black)]">
                  {title || "Untitled listing"}
                </p>
                <p className="font-sans tabular mt-0.5 text-[14px] font-semibold text-[var(--color-ink-black)]">
                  {pricingType === "free"
                    ? "Free"
                    : pricingType === "offer"
                      ? "Accepting offers"
                      : priceValue(formRef) != null
                        ? formatNGN(priceValue(formRef))
                        : "No price set"}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--color-muted-gray)]">
                  {description || "No description yet."}
                </p>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <p role="alert" className="text-xs text-[var(--color-error)]">
            {errorMsg}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {reviewMode ? (
            <>
              <button
                type="button"
                onClick={() => setReviewMode(false)}
                className="inline-flex h-[52px] cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-6 text-sm font-semibold text-[var(--color-ink-black)] transition hover:border-[var(--color-ink-30)]"
              >
                Back to edit
              </button>
              <button
                type="button"
                onClick={reviewPrimary}
                disabled={isPending || uploading}
                className="inline-flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--color-shop-violet)] px-6 text-sm font-semibold text-[var(--color-pure-white)] transition hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
              >
                {mode === "create" ? "Publish listing" : "Save changes"}
                {!isPending && <ArrowRightIcon className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <>
              {mode === "create" && (
                <button
                  type="button"
                  onClick={() => runSave("draft")}
                  disabled={isPending || uploading}
                  className="inline-flex h-[52px] cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-6 text-sm font-semibold text-[var(--color-ink-black)] transition hover:border-[var(--color-ink-30)] disabled:cursor-wait disabled:opacity-60"
                >
                  Save as draft
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setFieldErrors({});
                  const parsed = validate();
                  if (!parsed.success) {
                    const errors = parsed.error.flatten().fieldErrors as Record<
                      string,
                      string[]
                    >;
                    setFieldErrors(errors);
                    setErrorMsg(
                      Object.values(errors)[0]?.[0] ??
                        "Please fix the highlighted fields.",
                    );
                    const firstInvalid =
                      formRef.current?.querySelector<HTMLElement>(
                        '[aria-invalid="true"]',
                      );
                    firstInvalid?.focus();
                    return;
                  }
                  setReviewMode(true);
                }}
                disabled={isPending || uploading}
                className="inline-flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--color-shop-violet)] px-6 text-sm font-semibold text-[var(--color-pure-white)] transition hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
              >
                <EyeIcon className="h-4 w-4" />
                {mode === "create" ? "Review & publish" : "Review changes"}
              </button>
            </>
          )}
        </div>

        <p className="text-[12px] text-[var(--color-muted-gray)]">
          {mode === "create"
            ? "Listings are reviewed before they appear in the marketplace."
            : "Changes are saved immediately. Status stays the same."}
        </p>
      </Section>
    </form>
  );
}

/** Read the current price field straight from the DOM for the live preview. */
function priceValue(
  formRef: React.RefObject<HTMLFormElement | null>,
): number | null {
  const field = formRef.current?.elements.namedItem(
    "price",
  ) as HTMLInputElement | null;
  if (!field || !field.value) return null;
  const value = Number(field.value);
  return Number.isFinite(value) ? value : null;
}
