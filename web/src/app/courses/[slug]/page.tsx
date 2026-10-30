import { notFound } from "next/navigation";
import { CourseDetailShell } from "./course-detail-shell";
import { allowCoursesFallback, getCourseDetailData } from "@/lib/courses";
import { getSessionUser } from "@/lib/tenant";
import styles from "./page.module.css";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSessionUser();
  const data = await getCourseDetailData(slug, session?.authUser.id);

  if (!data) {
    notFound();
  }

  const fallbackAllowed = allowCoursesFallback();

  return (
    <main className={styles.page}>
      <CourseDetailShell
        data={data}
        session={session ? { authUser: session.authUser } : null}
        fallbackAllowed={fallbackAllowed}
      />
    </main>
  );
}
