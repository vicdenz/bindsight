import { NextResponse } from "next/server";
import { californiaTargetToAcceptableDiff } from "../../../../lib/analysis/appetite-studio";

export function POST() { return NextResponse.json(californiaTargetToAcceptableDiff()); }
