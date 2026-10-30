import { NextResponse } from "next/server";
import { getCoursesHomeData, listCourseCatalog } from "@/lib/courses";

function parseLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 24;
  }

  return Math.min(parsed, 60);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const focus = searchParams.get("focus") ?? undefined;
  const view = searchParams.get("view");

  if (view === "catalog") {
    const data = await listCourseCatalog({
      focus,
      limit: parseLimit(searchParams.get("limit")),
    });

    return NextResponse.json(data);
  }

  const data = await getCoursesHomeData({ focus });
  return NextResponse.json(data);
}
