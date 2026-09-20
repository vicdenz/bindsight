import { NextResponse } from "next/server";
import { startCachedAnalysis } from "../../../lib/analysis/run-store";

export function POST() { return NextResponse.json(startCachedAnalysis(), { status: 201 }); }
