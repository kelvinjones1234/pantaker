import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ImageValidationError } from "@/lib/storage/errors";
import {
  processUploadedImage,
  validateDeclaredImageType,
} from "@/lib/storage/image-processing";

async function png(width = 120, height = 80): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 30, g: 90, b: 160 },
    },
  })
    .png()
    .toBuffer();
}

describe("processUploadedImage", () => {
  it("converts a listing image to WebP without enlarging it", async () => {
    const result = await processUploadedImage(await png(), {
      purpose: "listing",
    });
    expect(result.contentType).toBe("image/webp");
    expect(result.extension).toBe("webp");
    expect(result.bytes.byteLength).toBeGreaterThan(0);
    expect(result.width).toBe(120);
    expect(result.height).toBe(80);
    expect((await sharp(result.bytes).metadata()).format).toBe("webp");
  });

  it("downscales large listing images to the configured edge", async () => {
    const result = await processUploadedImage(await png(3000, 1500), {
      purpose: "listing",
    });
    expect(result.width).toBe(2400);
    expect(result.height).toBe(1200);
  });

  it("crops profile images to the configured square", async () => {
    const result = await processUploadedImage(await png(64, 32), {
      purpose: "profile",
    });
    expect(result.width).toBe(512);
    expect(result.height).toBe(512);
  });

  it("rejects empty, malformed, and unsupported images", async () => {
    await expect(
      processUploadedImage(Buffer.alloc(0), { purpose: "listing" }),
    ).rejects.toThrow(/empty/i);

    await expect(
      processUploadedImage(Buffer.from("not an image"), {
        purpose: "listing",
      }),
    ).rejects.toThrow(/not a valid/i);

    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100"/></svg>',
    );
    await expect(
      processUploadedImage(svg, { purpose: "listing" }),
    ).rejects.toThrow(/JPEG, PNG, WebP, or AVIF/i);
  });

  it("rejects images over the byte, edge, and pixel limits", async () => {
    const image = await png();

    await expect(
      processUploadedImage(image, { purpose: "listing", maxBytes: 10 }),
    ).rejects.toMatchObject({ status: 413 });

    await expect(
      processUploadedImage(image, { purpose: "listing", maxEdge: 50 }),
    ).rejects.toThrow(/50px/);

    await expect(
      processUploadedImage(image, { purpose: "listing", maxPixels: 9_000 }),
    ).rejects.toThrow(/too many pixels/i);
  });

  it("rejects images below the minimum edge", async () => {
    await expect(
      processUploadedImage(await png(8, 8), { purpose: "listing" }),
    ).rejects.toThrow(/at least 16px/);
  });

  it("strips metadata during conversion", async () => {
    const withMetadata = await sharp({
      create: {
        width: 120,
        height: 80,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .withMetadata({ orientation: 1 })
      .jpeg()
      .toBuffer();

    const result = await processUploadedImage(withMetadata, {
      purpose: "listing",
    });
    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
  });
});

describe("validateDeclaredImageType", () => {
  it("accepts declared browser image types case-insensitively", () => {
    expect(validateDeclaredImageType("image/jpeg")).toBeNull();
    expect(validateDeclaredImageType("IMAGE/WEBP")).toBeNull();
    expect(validateDeclaredImageType("image/avif")).toBeNull();
  });

  it("rejects SVG and unknown types", () => {
    expect(validateDeclaredImageType("image/svg+xml")).toMatch(/JPEG/);
    expect(validateDeclaredImageType("application/pdf")).toMatch(/JPEG/);
  });
});

describe("ImageValidationError", () => {
  it("preserves an HTTP status", () => {
    const error = new ImageValidationError("too large", 413);
    expect(error.status).toBe(413);
  });
});
