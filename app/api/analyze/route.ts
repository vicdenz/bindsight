import { NextResponse } from "next/server";

import { getDecisionData } from "../../../lib/analysis/live";

export const dynamic = "force-dynamic";

async function analyze() {
  const data = await getDecisionData();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, no-store",
      "X-BindSight-Data-Source": data.source,
      "X-BindSight-Schema-Version": data.schemaVersion,
    },
  });
}

export const GET = analyze;
export const POST = analyze;
