import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jobs = vi.hoisted(() => ({
  expireStaleCheckouts: vi.fn(),
  releaseDueOrders: vi.fn(),
  reconcilePendingTransfers: vi.fn(),
  recoverRefundedOrders: vi.fn(),
}));

vi.mock("@/features/orders/service", () => jobs);

import { GET, POST } from "./route";

const SECRET = "test-cron-secret";

function request(authorization?: string) {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  return new Request("http://localhost/api/cron/orders", { headers });
}

describe("cron orders route", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    jobs.expireStaleCheckouts.mockReset().mockResolvedValue(2);
    jobs.releaseDueOrders.mockReset().mockResolvedValue(3);
    jobs.reconcilePendingTransfers.mockReset().mockResolvedValue(4);
    jobs.recoverRefundedOrders.mockReset().mockResolvedValue(5);
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("returns 503 and runs no jobs when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(request(`Bearer ${SECRET}`));
    expect(response.status).toBe(503);
    expect(jobs.releaseDueOrders).not.toHaveBeenCalled();
  });

  it("returns 503 when CRON_SECRET is blank", async () => {
    process.env.CRON_SECRET = "   ";
    const response = await POST(request("Bearer    "));
    expect(response.status).toBe(503);
    expect(jobs.expireStaleCheckouts).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token is missing", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(jobs.releaseDueOrders).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token is wrong", async () => {
    const response = await GET(request("Bearer wrong"));
    expect(response.status).toBe(401);
    expect(jobs.reconcilePendingTransfers).not.toHaveBeenCalled();
  });

  it("runs all four jobs and reports their counts on GET", async () => {
    const response = await GET(request(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(jobs.expireStaleCheckouts).toHaveBeenCalledTimes(1);
    expect(jobs.releaseDueOrders).toHaveBeenCalledTimes(1);
    expect(jobs.reconcilePendingTransfers).toHaveBeenCalledTimes(1);
    expect(jobs.recoverRefundedOrders).toHaveBeenCalledTimes(1);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: true,
      expired: 2,
      releases: 3,
      reconciliations: 4,
      recoveries: 5,
    });
    expect(typeof body.ranAt).toBe("string");
  });

  it("accepts POST with the same auth and job set", async () => {
    const response = await POST(request(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(jobs.releaseDueOrders).toHaveBeenCalledTimes(1);
  });
});
