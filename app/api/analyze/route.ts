import { NextResponse } from "next/server";

import { getDecisionData } from "../../../lib/analysis/live";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(await getDecisionData());
}
