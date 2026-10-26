import sharp from "sharp";
import { uploadLimits } from "@/config/site";
import { ImageValidationError } from "@/lib/storage/errors";

type SharpMetadata = Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;

export type UploadPurpose = "listing" | "profile";

export interface ProcessedImage {
  bytes: Buffer;
  width: number;
  height: number;
  contentType: "image/webp";
  extension: "webp";
}

interface ProcessOptions {
  purpose: UploadPurpose;
  maxBytes?: number;
  maxPixels?: number;
  maxEdge?: number;
}

function outputDimensions(purpose: UploadPurpose) {
  if (purpose === "profile") {
    return {
      width: uploadLimits.profileEdge,
      height: uploadLimits.profileEdge,
      fit: "cover" as const,
    };
  }
  return {
    width: uploadLimits.listingMaxEdge,
    height: uploadLimits.listingMaxEdge,
    fit: "inside" as const,
  };
}

export async function processUploadedImage(
  input: Buffer,
  options: ProcessOptions,
): Promise<ProcessedImage> {
  const maxBytes = options.maxBytes ?? uploadLimits.maxBytes;
  const maxPixels = options.maxPixels ?? uploadLimits.maxInputPixels;
  const maxEdge = options.maxEdge ?? uploadLimits.maxInputEdge;

  if (input.byteLength === 0) {
    throw new ImageValidationError("The selected file is empty.");
  }
  if (input.byteLength > maxBytes) {
    throw new ImageValidationError(
      `Each photo must be under ${Math.round(maxBytes / (1024 * 1024))}MB.`,
      413,
    );
  }

  let metadata: SharpMetadata;
  try {
    metadata = await sharp(input, {
      failOn: "error",
      limitInputPixels: false,
      animated: false,
    }).metadata();
  } catch {
    throw new ImageValidationError(
      "That file is not a valid JPEG, PNG, WebP, or AVIF image.",
    );
  }

  const format = metadata.format;
  if (
    !format ||
    !(uploadLimits.allowedFormats as readonly string[]).includes(format)
  ) {
    throw new ImageValidationError(
      "Use a JPEG, PNG, WebP, or AVIF image. SVG and other file types are not allowed.",
    );
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < uploadLimits.minInputEdge || height < uploadLimits.minInputEdge) {
    throw new ImageValidationError(
      `Images must be at least ${uploadLimits.minInputEdge}px wide and tall.`,
    );
  }
  if (width > maxEdge || height > maxEdge) {
    throw new ImageValidationError(
      `Images must be no larger than ${maxEdge}px on either side.`,
    );
  }
  if (width * height > maxPixels) {
    throw new ImageValidationError(
      "That image has too many pixels to process safely.",
    );
  }
  if (typeof metadata.pages === "number" && metadata.pages > 1) {
    throw new ImageValidationError("Animated images are not supported.");
  }

  const target = outputDimensions(options.purpose);

  try {
    const { data, info } = await sharp(input, {
      failOn: "error",
      limitInputPixels: maxPixels,
      animated: false,
    })
      .rotate()
      .resize({
        width: target.width,
        height: target.height,
        fit: target.fit,
        withoutEnlargement: options.purpose !== "profile",
      })
      .webp({
        quality: uploadLimits.webpQuality,
        effort: 4,
      })
      .toBuffer({ resolveWithObject: true });

    if (data.byteLength > maxBytes) {
      throw new ImageValidationError(
        "The processed image is still too large. Try a smaller photo.",
        413,
      );
    }

    return {
      bytes: data,
      width: info.width,
      height: info.height,
      contentType: "image/webp",
      extension: "webp",
    };
  } catch (error) {
    if (error instanceof ImageValidationError) throw error;
    throw new ImageValidationError(
      "That image could not be processed. Try another photo.",
    );
  }
}

export function validateDeclaredImageType(
  declaredType: string,
): string | null {
  if (
    !(uploadLimits.allowedMimeTypes as readonly string[]).includes(
      declaredType.toLowerCase(),
    )
  ) {
    return "Use a JPEG, PNG, WebP, or AVIF image.";
  }
  return null;
}
