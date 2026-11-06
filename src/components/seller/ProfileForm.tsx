"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AvatarUploader } from "@/components/seller/AvatarUploader";
import { updateProfileAction } from "@/features/auth/profile-actions";
import { CaretDownIcon, CheckIcon } from "@/components/brand/icons";
import { ABUJA_AREAS, ALL_ABUJA } from "@/lib/areas";
import { LAUNCH_CITY, NIGERIAN_CITIES } from "@/lib/cities";
import { cn } from "@/lib/utils";

const inputClass =
  "h-[52px] w-full rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-base text-[var(--color-ink-black)] sm:text-sm outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]";

const labelClass = "block text-xs font-semibold text-[var(--color-ink-black)] mb-1.5";

const AREA_OPTIONS = ABUJA_AREAS.filter((area) => area.name !== ALL_ABUJA).map((area) => area.name);

export interface ProfileFormInitial {
  display_name: string;
  username: string;
  account_type: string;
  city: string;
  area: string;
  bio: string;
  phone: string;
  phone_is_whatsapp: boolean;
  instagram_handle: string;
  x_handle: string;
  facebook_handle: string;
  tiktok_handle: string;
  avatarId?: string;
  avatarUrl?: string;
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1.5 text-xs text-[var(--color-error)]">{messages[0]}</p>;
}

function SocialHandleField({
  id,
  name,
  label,
  maxLength,
  defaultValue,
  error,
}: {
  id: string;
  name: string;
  label: string;
  maxLength: number;
  defaultValue: string;
  error?: string[];
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}{" "}
        <span className="font-normal text-[var(--color-muted-gray)]">(optional)</span>
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted-gray)]">
          @
        </span>
        <input
          id={id}
          name={name}
          type="text"
          maxLength={maxLength}
          defaultValue={defaultValue}
          aria-invalid={Boolean(error)}
          placeholder="yourhandle"
          className={`${inputClass} pl-8`}
        />
      </div>
      <FieldError messages={error} />
    </div>
  );
}

export function ProfileForm({
  initial,
  imageUploadsConfigured,
  isLive,
}: {
  initial: ProfileFormInitial;
  imageUploadsConfigured: boolean;
  isLive: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);

  const [displayName, setDisplayName] = useState(initial.display_name);
  const [accountType, setAccountType] = useState(initial.account_type || "individual");
  const [username, setUsername] = useState(initial.username);
  const [bio, setBio] = useState(initial.bio);
  const [area, setArea] = useState(initial.area);
  const [phone, setPhone] = useState(initial.phone);
  const [isWhatsapp, setIsWhatsapp] = useState(initial.phone_is_whatsapp);
  const [hasAvatar, setHasAvatar] = useState(Boolean(initial.avatarId));

  const displayNameId = useId();
  const usernameId = useId();
  const accountTypeId = useId();
  const cityId = useId();
  const areaId = useId();
  const bioId = useId();
  const phoneId = useId();
  const whatsappId = useId();
  const instagramId = useId();
  const xId = useId();
  const facebookId = useId();
  const tiktokId = useId();

  const checklist = [
    { label: "Display name", done: displayName.trim().length >= 2 },
    { label: "Username", done: username.trim().length >= 3 },
    { label: "Location", done: Boolean(area) },
    { label: "Bio", done: bio.trim().length > 0 },
    { label: "Photo", done: hasAvatar },
  ];
  const completed = checklist.filter((item) => item.done).length;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setErrorMsg(null);
    setFieldErrors({});
    setSaved(false);

    const formData = new FormData(formRef.current!);

    // Preview mode validates nothing server-side; make that explicit.
    if (!isLive) {
      setSaved(true);
      return;
    }

    startTransition(async () => {
      const res = await updateProfileAction(formData);
      if (!res.ok) {
        if (res.errors) setFieldErrors(res.errors as Record<string, string[]>);
        if (res.error) setErrorMsg(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <section className="shop-card p-5 sm:p-7">
        <h2 className="font-brand-serif text-lg font-bold tracking-tight text-[var(--color-ink-black)]">
          Your seller profile
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
          This is your storefront identity on Pantaker. Contact details are optional — add them
          only if you want buyers to reach you outside the marketplace.
        </p>

        <div className="mt-5">
          <AvatarUploader
            initialId={initial.avatarId}
            initialUrl={initial.avatarUrl}
            enabled={imageUploadsConfigured}
            onChange={(id) => setHasAvatar(Boolean(id))}
          />
          <FieldError messages={fieldErrors.avatar_path} />
        </div>

        <div className="mt-5 flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={accountTypeId} className={labelClass}>
                Account type
              </label>
              <div className="relative">
                <select
                  id={accountTypeId}
                  name="account_type"
                  value={accountType}
                  onChange={(event) => setAccountType(event.target.value)}
                  className="h-[52px] w-full cursor-pointer appearance-none rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] pl-4 pr-11 text-base text-[var(--color-ink-black)] sm:text-sm outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]"
                >
                  <option value="individual">Individual seller</option>
                  <option value="business">Business</option>
                </select>
                <CaretDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-gray)]" />
              </div>
            </div>

            <div>
              <label htmlFor={displayNameId} className={labelClass}>
                {accountType === "business" ? "Business name" : "Display name"}{" "}
                <span className="text-[var(--color-shop-violet)]">*</span>
              </label>
              <input
                id={displayNameId}
                name="display_name"
                type="text"
                required
                maxLength={80}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                aria-invalid={Boolean(fieldErrors.display_name)}
                placeholder={accountType === "business" ? "e.g. Apo MetalWorks" : "e.g. Amina O."}
                className={inputClass}
              />
              <FieldError messages={fieldErrors.display_name} />
            </div>
          </div>

          <div>
            <label htmlFor={usernameId} className={labelClass}>
              Username <span className="font-normal text-[var(--color-muted-gray)]">(optional)</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted-gray)]">
                @
              </span>
              <input
                id={usernameId}
                name="username"
                type="text"
                maxLength={24}
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                aria-invalid={Boolean(fieldErrors.username)}
                placeholder="your_handle"
                className={`${inputClass} pl-8`}
              />
            </div>
            <p className="mt-1.5 text-[12px] text-[var(--color-muted-gray)]">
              3–24 letters, numbers, or underscores. Must be unique.
            </p>
            <FieldError messages={fieldErrors.username} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={cityId} className={labelClass}>
                City
              </label>
              <div className="relative">
                <select
                  id={cityId}
                  name="city"
                  defaultValue={
                    NIGERIAN_CITIES.some((city) => city.supported && city.name === initial.city)
                      ? initial.city
                      : LAUNCH_CITY
                  }
                  aria-invalid={Boolean(fieldErrors.city)}
                  className="h-[52px] w-full cursor-pointer appearance-none rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] pl-4 pr-11 text-base text-[var(--color-ink-black)] sm:text-sm outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]"
                >
                  {NIGERIAN_CITIES.map((city) => (
                    <option key={city.name} value={city.name} disabled={!city.supported}>
                      {city.name}
                      {city.supported ? "" : " (coming soon)"}
                    </option>
                  ))}
                </select>
                <CaretDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-gray)]" />
              </div>
              <FieldError messages={fieldErrors.city} />
            </div>

            <div>
              <label htmlFor={areaId} className={labelClass}>
                Area
              </label>
              <div className="relative">
                <select
                  id={areaId}
                  name="area"
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                  className="h-[52px] w-full cursor-pointer appearance-none rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] pl-4 pr-11 text-base text-[var(--color-ink-black)] sm:text-sm outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]"
                >
                  <option value="">No area selected</option>
                  {AREA_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <CaretDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-gray)]" />
              </div>
              <FieldError messages={fieldErrors.area} />
            </div>
          </div>

          <div>
            <label htmlFor={bioId} className={labelClass}>
              Bio <span className="font-normal text-[var(--color-muted-gray)]">(optional)</span>
            </label>
            <textarea
              id={bioId}
              name="bio"
              rows={3}
              maxLength={500}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              aria-invalid={Boolean(fieldErrors.bio)}
              placeholder="Tell buyers what you sell or salvage."
              className="w-full rounded-[20px] border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] p-4 text-base text-[var(--color-ink-black)] sm:text-sm outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]"
            />
            <FieldError messages={fieldErrors.bio} />
          </div>
        </div>

        <div className="mt-6 border-t border-[var(--color-faint-border)] pt-5">
          <h3 className="text-sm font-semibold text-[var(--color-ink-black)]">
            Contact and socials
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
            Optional. Whatever you add here appears on every published listing so buyers can reach
            you directly. Leave a field blank to hide it.
          </p>

          <div className="mt-4 flex flex-col gap-5">
            <div>
              <label htmlFor={phoneId} className={labelClass}>
                Phone number{" "}
                <span className="font-normal text-[var(--color-muted-gray)]">(optional)</span>
              </label>
              <input
                id={phoneId}
                name="phone"
                type="tel"
                inputMode="tel"
                maxLength={32}
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  if (!event.target.value.trim()) setIsWhatsapp(false);
                }}
                aria-invalid={Boolean(fieldErrors.phone)}
                placeholder="+234 803 000 0000"
                className={inputClass}
              />
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
                Include the country code so WhatsApp links work, e.g. +234 803 000 0000.
              </p>
              <FieldError messages={fieldErrors.phone} />
            </div>

            <label
              htmlFor={whatsappId}
              className={cn(
                "flex items-center justify-between gap-4 rounded-[20px] bg-[var(--color-canvas-mist)] px-4 py-3",
                phone.trim() ? "cursor-pointer" : "cursor-not-allowed opacity-60",
              )}
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-[var(--color-ink-black)]">
                  This number is on WhatsApp
                </span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
                  Adds a WhatsApp button to your listings.
                </span>
              </span>
              <span className="relative inline-flex shrink-0">
                <input
                  id={whatsappId}
                  type="checkbox"
                  name="phone_is_whatsapp"
                  value="true"
                  checked={isWhatsapp && Boolean(phone.trim())}
                  onChange={(event) => setIsWhatsapp(event.target.checked)}
                  disabled={!phone.trim()}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-[var(--color-cool-stone)] transition-colors duration-150 peer-checked:bg-[var(--color-shop-violet)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-shop-violet)] peer-focus-visible:ring-offset-2" />
                <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--color-pure-white)] shadow-none transition-transform duration-150 peer-checked:translate-x-5" />
              </span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SocialHandleField
                id={instagramId}
                name="instagram_handle"
                label="Instagram"
                maxLength={30}
                defaultValue={initial.instagram_handle}
                error={fieldErrors.instagram_handle}
              />
              <SocialHandleField
                id={xId}
                name="x_handle"
                label="X (Twitter)"
                maxLength={15}
                defaultValue={initial.x_handle}
                error={fieldErrors.x_handle}
              />
              <SocialHandleField
                id={facebookId}
                name="facebook_handle"
                label="Facebook"
                maxLength={50}
                defaultValue={initial.facebook_handle}
                error={fieldErrors.facebook_handle}
              />
              <SocialHandleField
                id={tiktokId}
                name="tiktok_handle"
                label="TikTok"
                maxLength={24}
                defaultValue={initial.tiktok_handle}
                error={fieldErrors.tiktok_handle}
              />
            </div>
          </div>
        </div>

        {saved && (
          <p
            role="status"
            className="mt-5 flex items-center gap-2 rounded-[16px] bg-[var(--color-primary-tint)] px-4 py-3 text-[13px] font-medium text-[var(--color-ink-black)]"
          >
            <CheckIcon className="h-4 w-4 text-[var(--color-shop-violet)]" />
            {isLive ? "Profile saved." : "Preview only — nothing was saved."}
          </p>
        )}
        {errorMsg && (
          <p role="alert" className="mt-5 rounded-[16px] bg-[var(--color-error-bg)] px-4 py-3 text-[13px] text-[var(--color-error)]">
            {errorMsg}
          </p>
        )}

        <div className="mt-6">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-6 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            {isPending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </section>

      <section className="shop-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--color-ink-black)]">Profile completeness</h2>
          <span className="text-[12px] font-medium tabular text-[var(--color-muted-gray)]">
            {completed}/{checklist.length}
          </span>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-[13px] text-[var(--color-ink-black)]">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  item.done ? "bg-[var(--color-primary-tint)]" : "bg-[var(--color-canvas-mist)]",
                )}
              >
                {item.done && <CheckIcon className="h-3 w-3 text-[var(--color-shop-violet)]" />}
              </span>
              {item.label}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
          Completeness is not the same as verification. Pantaker doesn&apos;t verify seller identity
          yet, so no verification badge is shown on your profile.
        </p>
      </section>
    </form>
  );
}
