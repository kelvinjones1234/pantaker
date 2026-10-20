"use client";

import { useRef, useState } from "react";
import { ImagePlusIcon, TrashIcon } from "@/components/brand/icons";
import { requestDirectUpload, uploadToCloudflare, validateImageFile } from "@/lib/image-upload";

/**
 * Single-image avatar upload using the existing Cloudflare direct-upload flow.
 * Stores only the returned image id (via a hidden field); the file never passes
 * through a server action.
 */
export function AvatarUploader({
  initialUrl,
  initialId,
  enabled,
  onChange,
}: {
  initialUrl?: string;
  initialId?: string;
  enabled: boolean;
  onChange?: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [id, setId] = useState(initialId ?? "");
  const [preview, setPreview] = useState(initialUrl ?? "");
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const applyId = (next: string) => {
    setId(next);
    onChange?.(next);
  };

  const pick = () => {
    if (enabled && status !== "uploading") inputRef.current?.click();
  };

  const onFile = (file: File) => {
    const reason = validateImageFile(file, 0);
    if (reason) {
      setError(reason);
      setStatus("error");
      return;
    }
    setError(null);
    setStatus("uploading");
    setProgress(0);
    setPreview(URL.createObjectURL(file));

    void (async () => {
      try {
        const ticket = await requestDirectUpload({ source: "profile-avatar" });
        await uploadToCloudflare(ticket.uploadURL, file, setProgress);
        applyId(ticket.id);
        setStatus("idle");
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Please try again.");
        setStatus("error");
      }
    })();
  };

  const remove = () => {
    applyId("");
    setPreview("");
    setStatus("idle");
    setError(null);
  };

  return (
    <div className="flex items-center gap-4">
      <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-canvas-mist)]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlusIcon className="h-6 w-6 text-[var(--color-muted-gray)]" />
        )}
        {status === "uploading" && (
          <span className="absolute inset-0 flex items-center justify-center bg-[var(--overlay-ink-55)] text-[12px] font-semibold tabular text-[var(--color-pure-white)]">
            {progress}%
          </span>
        )}
      </span>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pick}
            disabled={!enabled || status === "uploading"}
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-xs font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {preview ? "Change photo" : "Add photo"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={remove}
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-xs font-semibold text-[var(--color-error)] transition-colors duration-150 hover:bg-[var(--color-error-bg)]"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
        <p className="text-[12px] text-[var(--color-muted-gray)]">
          {enabled
            ? "Square images look best. JPG, PNG, or WebP."
            : "Photo upload needs Cloudflare Images to be configured."}
        </p>
        {error && (
          <p role="alert" className="text-[12px] text-[var(--color-error)]">
            {error}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
        tabIndex={-1}
      />
      <input type="hidden" name="avatar_path" value={id} />
    </div>
  );
}
