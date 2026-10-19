"use client";

import { useId, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { uploadLimits } from "@/config/site";
import { ImagePlusIcon, PlusIcon, TrashIcon } from "@/components/brand/icons";
import {
  requestDirectUpload,
  uploadToCloudflare,
  validateImageFile,
} from "@/lib/image-upload";

export interface UploadedImage {
  /** Stable client key so progress updates survive reordering. */
  localId: string;
  /** Cloudflare image id — only set once the upload finishes. */
  id: string;
  name: string;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  progress: number;
  error?: string;
  /** Kept so a failed upload can be retried without re-picking the file. */
  file: File;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onChange: Dispatch<SetStateAction<UploadedImage[]>>;
  disabled?: boolean;
  /** When false, photos are added as local previews and never uploaded. */
  uploadEnabled?: boolean;
}

const MAX = uploadLimits.maxImages;

function newLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ProgressRing({ value }: { value: number }) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90" aria-hidden="true">
      <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--overlay-paper-40)" strokeWidth="3.5" />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="var(--color-shop-violet)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(Math.max(value, 0), 100) / 100)}
        className="transition-[stroke-dashoffset] duration-200 ease-out"
      />
    </svg>
  );
}

function AddSlot({ onBrowse, disabled }: { onBrowse: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onBrowse}
      disabled={disabled}
      className="group flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[16px] bg-[var(--color-pure-white)] text-[var(--color-muted-gray)] outline-none transition-colors duration-200 hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-shop-violet)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <PlusIcon className="h-5 w-5" />
      <span className="text-[11px] font-semibold">Add photo</span>
    </button>
  );
}

function CanvasTile({
  image,
  isCover,
  canReorder,
  onMakeCover,
  onRemove,
  onRetry,
}: {
  image: UploadedImage;
  isCover: boolean;
  canReorder: boolean;
  onMakeCover: () => void;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const isUploading = image.status === "uploading";
  const isError = image.status === "error";

  return (
    <div className="group relative h-full w-full overflow-hidden rounded-[16px] bg-[var(--color-canvas-mist)]">
      {!loaded && !isError && (
        <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-[var(--color-canvas-mist)]" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.previewUrl}
        alt={image.name}
        loading="eager"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ease-out ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {isCover && !isError && (
        <span className="absolute left-2 top-2 rounded-full bg-[var(--overlay-paper-95)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-ink-black)]">
          Cover
        </span>
      )}

      {isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[var(--overlay-ink-55)]">
          <ProgressRing value={image.progress} />
          <span className="text-[11px] font-semibold tabular text-[var(--color-pure-white)]">
            {image.progress}%
          </span>
        </div>
      )}

      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--color-error-bg)] px-3 text-center">
          <span className="text-[11px] font-semibold text-[var(--color-error)]">
            {image.error ?? "Upload failed"}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer rounded-full bg-[var(--color-error)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-pure-white)] transition-opacity duration-150 hover:opacity-90"
          >
            Retry
          </button>
        </div>
      )}

      {!isUploading && !isError && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 p-2 opacity-100 transition-opacity duration-200 max-sm:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {canReorder && !isCover && (
            <button
              type="button"
              onClick={onMakeCover}
              className="cursor-pointer rounded-full bg-[var(--overlay-paper-95)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-black)] transition-opacity duration-150 hover:opacity-90"
            >
              Set cover
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${image.name}`}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[var(--overlay-paper-95)] text-[var(--color-ink-black)] transition-opacity duration-150 hover:opacity-90"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function ImageUploader({
  images,
  onChange,
  disabled = false,
  uploadEnabled = true,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rejections, setRejections] = useState<{ name: string; reason: string }[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const hintId = useId();

  const atCapacity = images.length >= MAX;
  const canAdd = !disabled && !atCapacity;

  const browse = () => {
    if (canAdd) inputRef.current?.click();
  };

  const runUpload = (file: File, localId: string) => {
    void (async () => {
      try {
        const ticket = await requestDirectUpload({ source: "sell-form" });
        await uploadToCloudflare(ticket.uploadURL, file, (percent) => {
          onChange((prev) =>
            prev.map((item) => (item.localId === localId ? { ...item, progress: percent } : item)),
          );
        });
        onChange((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? { ...item, id: ticket.id, status: "done", progress: 100, error: undefined }
              : item,
          ),
        );
        setAnnouncement(`${file.name} uploaded.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed. Please try again.";
        onChange((prev) =>
          prev.map((item) =>
            item.localId === localId ? { ...item, status: "error", error: message } : item,
          ),
        );
        setAnnouncement(`${file.name} failed to upload.`);
      }
    })();
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) return;
    const files = Array.from(fileList);
    const accepted: File[] = [];
    const nextRejections: { name: string; reason: string }[] = [];
    let count = images.length;

    for (const file of files) {
      const reason = validateImageFile(file, count);
      if (reason) {
        nextRejections.push({ name: file.name, reason });
        continue;
      }
      accepted.push(file);
      count += 1;
    }

    setRejections(nextRejections);
    if (accepted.length === 0) return;

    const pending: UploadedImage[] = accepted.map((file) => ({
      localId: newLocalId(),
      id: "",
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      status: uploadEnabled ? "uploading" : "done",
      progress: uploadEnabled ? 0 : 100,
      file,
    }));

    onChange((prev) => [...prev, ...pending]);
    if (uploadEnabled) {
      pending.forEach((item) => runUpload(item.file, item.localId));
    } else {
      setAnnouncement(
        `${accepted.length} photo${accepted.length === 1 ? "" : "s"} added (preview only).`,
      );
    }
  };

  const removeImage = (localId: string) => {
    onChange((prev) => {
      const target = prev.find((item) => item.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.localId !== localId);
    });
  };

  const makeCover = (localId: string) => {
    onChange((prev) => {
      const index = prev.findIndex((item) => item.localId === localId);
      if (index <= 0) return prev;
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return next;
    });
  };

  const retryImage = (localId: string) => {
    onChange((prev) =>
      prev.map((item) =>
        item.localId === localId
          ? { ...item, status: "uploading", progress: 0, error: undefined }
          : item,
      ),
    );
    const target = images.find((item) => item.localId === localId);
    if (target) runUpload(target.file, localId);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    addFiles(event.dataTransfer?.files ?? null);
  };

  const tileProps = (image: UploadedImage, index: number) => ({
    image,
    isCover: index === 0,
    canReorder: images.length > 1,
    onMakeCover: () => makeCover(image.localId),
    onRemove: () => removeImage(image.localId),
    onRetry: () => retryImage(image.localId),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <label className="block text-xs font-semibold text-[var(--color-ink-black)]">
          Photos <span className="font-normal text-[var(--color-muted-gray)]">(optional)</span>
        </label>
        <span className="text-[11px] tabular text-[var(--color-muted-gray)]">
          {images.length}/{MAX}
        </span>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (canAdd) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-[24px] bg-[var(--color-canvas-mist)] p-2.5 transition-shadow duration-200 sm:p-3 ${
          isDragging ? "ring-2 ring-[var(--color-shop-violet)]" : ""
        }`}
      >
        {images.length === 0 ? (
          <button
            type="button"
            onClick={browse}
            aria-describedby={hintId}
            disabled={disabled}
            className="group flex w-full cursor-pointer flex-col items-center justify-center rounded-[18px] bg-[var(--color-pure-white)] px-6 py-10 text-center outline-none transition-colors duration-200 hover:bg-[var(--color-primary-tint)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-canvas-mist)] transition-colors duration-200 group-hover:bg-[var(--color-pure-white)]">
              <ImagePlusIcon className="h-6 w-6 text-[var(--color-ink-black)]" />
            </span>
            <span className="mt-3 text-[13px] font-semibold text-[var(--color-ink-black)]">
              {isDragging ? "Drop photos to upload" : "Add photos of the item"}
            </span>
            <span className="mt-1 text-xs text-[var(--color-muted-gray)]">
              Drag &amp; drop or click to browse · up to {MAX} photos · JPG, PNG, WebP · max{" "}
              {Math.round(uploadLimits.maxBytes / (1024 * 1024))}MB each
            </span>
            <span className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-shop-violet)] px-4 py-2 text-xs font-semibold text-[var(--color-pure-white)] transition-opacity duration-200 group-hover:opacity-90">
              <PlusIcon className="h-3.5 w-3.5" />
              Choose photos
            </span>
          </button>
        ) : (
          <div
            className="grid aspect-[3/2] grid-cols-3 grid-rows-2 gap-1.5 sm:gap-2"
            aria-describedby={hintId}
          >
            <div className="col-span-2 row-span-2">
              <CanvasTile {...tileProps(images[0], 0)} />
            </div>
            <div className="col-span-1 row-span-1">
              {images[1] ? (
                <CanvasTile {...tileProps(images[1], 1)} />
              ) : (
                <AddSlot onBrowse={browse} disabled={!canAdd} />
              )}
            </div>
            <div className="col-span-1 row-span-1">
              {images[2] ? (
                <CanvasTile {...tileProps(images[2], 2)} />
              ) : (
                <AddSlot onBrowse={browse} disabled={!canAdd} />
              )}
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={uploadLimits.allowedMimeTypes.join(",")}
          multiple
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
          tabIndex={-1}
        />
      </div>

      <p id={hintId} className="text-[11px] text-[var(--color-muted-gray)]">
        {atCapacity
          ? `Maximum ${MAX} photos added. Remove one to swap in another.`
          : uploadEnabled
            ? "The first photo is used as the cover in the marketplace."
            : "Photos are preview-only here — connect Cloudflare Images to publish them."}
      </p>

      {rejections.length > 0 && (
        <ul className="flex flex-col gap-1" role="alert">
          {rejections.map((rejection) => (
            <li key={`${rejection.name}-${rejection.reason}`} className="text-xs text-[var(--color-error)]">
              {rejection.name}: {rejection.reason}
            </li>
          ))}
        </ul>
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
