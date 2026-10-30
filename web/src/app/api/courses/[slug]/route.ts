import { NextResponse } from "next/server";
import { getCourseDetailData } from "@/lib/courses";
import { getSessionUser } from "@/lib/tenant";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const session = await getSessionUser();
  const data = await getCourseDetailData(slug, session?.authUser.id);

  if (!data) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  return NextResponse.json(data);
}
