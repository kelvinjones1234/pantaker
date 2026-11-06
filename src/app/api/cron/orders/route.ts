import { NextResponse } from "next/server";
import {
  expireStaleCheckouts,
  reconcilePendingTransfers,
  recoverRefundedOrders,
  releaseDueOrders,
} from "@/features/orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [expired, releases, reconciliations, recoveries] = await Promise.all([
    expireStaleCheckouts(),
    releaseDueOrders(),
    reconcilePendingTransfers(),
    recoverRefundedOrders(),
  ]);

  return NextResponse.json({
    ok: true,
    expired,
    releases,
    reconciliations,
    recoveries,
    ranAt: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
