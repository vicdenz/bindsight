import { NextResponse } from "next/server";

import { analyzeCachedSubmissions } from "../../../lib/cache/analysis";

export const dynamic = "force-dynamic";

export function POST() {
  return NextResponse.json(analyzeCachedSubmissions());
}
