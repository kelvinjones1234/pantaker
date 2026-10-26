import type { S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import {
  deleteObject,
  getObjectBytes,
  getPublicBaseUrl,
  headObject,
  isR2Configured,
  loadR2Credentials,
  putObject,
} from "@/lib/storage/cloudflare-r2";

const CONFIG = {
  bucket: "pantaker-test",
  endpoint: "https://account.r2.cloudflarestorage.com",
  accessKeyId: "test-access",
  secretAccessKey: "test-secret",
};

const KEY = "listings/11111111-1111-1111-1111-111111111111/33333333-3333-3333-3333-333333333333.webp";

function mockClient(send: ReturnType<typeof vi.fn>): S3Client {
  return { send } as unknown as S3Client;
}

describe("R2 configuration", () => {
  it("builds the client config from the existing environment names", () => {
    const config = loadR2Credentials({
      CLOUDFLARE_R2_BUCKET: "pantaker-test",
      CLOUDFLARE_R2_BUCKET_ENDPOINT:
        "https://account.r2.cloudflarestorage.com/",
      CLOUDFLARE_R2_ACCESS_KEY: "test-access",
      CLOUDFLARE_R2_SECRET_KEY: "test-secret",
    });
    expect(config).toEqual(CONFIG);
  });

  it("names missing variables without exposing values", () => {
    try {
      loadR2Credentials({});
      throw new Error("expected config to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("CLOUDFLARE_R2_BUCKET");
      expect((error as Error).message).toContain("CLOUDFLARE_R2_ACCESS_KEY");
      expect((error as Error).message).not.toContain("test-secret");
    }
  });

  it("rejects a malformed endpoint", () => {
    expect(() =>
      loadR2Credentials({
        CLOUDFLARE_R2_BUCKET: "bucket",
        CLOUDFLARE_R2_BUCKET_ENDPOINT: "not-a-url",
        CLOUDFLARE_R2_ACCESS_KEY: "key",
        CLOUDFLARE_R2_SECRET_KEY: "secret",
      }),
    ).toThrow(/CLOUDFLARE_R2_BUCKET_ENDPOINT/);
  });

  it("rejects a plaintext endpoint", () => {
    expect(() =>
      loadR2Credentials({
        CLOUDFLARE_R2_BUCKET: "bucket",
        CLOUDFLARE_R2_BUCKET_ENDPOINT: "http://localhost:9000",
        CLOUDFLARE_R2_ACCESS_KEY: "key",
        CLOUDFLARE_R2_SECRET_KEY: "secret",
      }),
    ).toThrow(/https/);
  });

  it("requires a valid public delivery domain", () => {
    expect(() => getPublicBaseUrl({})).toThrow(
      /NEXT_PUBLIC_R2_PUBLIC_DOMAIN/,
    );
    expect(() =>
      getPublicBaseUrl({
        NEXT_PUBLIC_R2_PUBLIC_DOMAIN: "https://cdn.example.com/path",
      }),
    ).toThrow();
    expect(
      getPublicBaseUrl({ NEXT_PUBLIC_R2_PUBLIC_DOMAIN: "https://cdn.example.com/" }),
    ).toBe("https://cdn.example.com");
  });

  it("reports whether the full public configuration is present", () => {
    expect(isR2Configured({})).toBe(false);
    expect(
      isR2Configured({
        CLOUDFLARE_R2_BUCKET: "bucket",
        CLOUDFLARE_R2_BUCKET_ENDPOINT: "https://account.r2.cloudflarestorage.com",
        CLOUDFLARE_R2_ACCESS_KEY: "key",
        CLOUDFLARE_R2_SECRET_KEY: "secret",
        NEXT_PUBLIC_R2_PUBLIC_DOMAIN: "https://cdn.example.com",
      }),
    ).toBe(true);
  });
});

describe("R2 operations", () => {
  it("uploads with the configured bucket, content type, and cache headers", async () => {
    const send = vi.fn().mockResolvedValue({});
    await putObject(
      { key: KEY, body: Buffer.from("webp"), contentType: "image/webp" },
      { config: CONFIG, client: mockClient(send) },
    );

    const command = send.mock.calls[0][0];
    expect(command.input).toMatchObject({
      Bucket: CONFIG.bucket,
      Key: KEY,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    });
  });

  it("deletes the configured key", async () => {
    const send = vi.fn().mockResolvedValue({});
    await deleteObject(KEY, { config: CONFIG, client: mockClient(send) });
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: CONFIG.bucket,
      Key: KEY,
    });
  });

  it("returns null when an object is missing", async () => {
    const send = vi.fn().mockRejectedValue({ $metadata: { httpStatusCode: 404 } });
    await expect(
      headObject(KEY, { config: CONFIG, client: mockClient(send) }),
    ).resolves.toBeNull();
  });

  it("returns object metadata", async () => {
    const send = vi.fn().mockResolvedValue({
      ContentLength: 123,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    });
    await expect(
      headObject(KEY, { config: CONFIG, client: mockClient(send) }),
    ).resolves.toMatchObject({ size: 123, contentType: "image/webp" });
  });

  it("reads a bounded object stream and rejects oversized downloads", async () => {
    const body = async function* () {
      yield Buffer.from("abc");
      yield Buffer.from("def");
    };
    const send = vi.fn().mockResolvedValue({ ContentLength: 6, Body: body() });
    await expect(
      getObjectBytes(KEY, 10, { config: CONFIG, client: mockClient(send) }),
    ).resolves.toEqual(Buffer.from("abcdef"));

    const oversized = vi.fn().mockResolvedValue({
      ContentLength: 100,
      Body: (async function* () {
        yield Buffer.alloc(100);
      })(),
    });
    await expect(
      getObjectBytes(KEY, 10, {
        config: CONFIG,
        client: mockClient(oversized),
      }),
    ).rejects.toThrow(/too large/i);
  });

  it("rejects unsafe keys before calling R2", async () => {
    const send = vi.fn();
    await expect(
      deleteObject("../secret", { config: CONFIG, client: mockClient(send) }),
    ).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
