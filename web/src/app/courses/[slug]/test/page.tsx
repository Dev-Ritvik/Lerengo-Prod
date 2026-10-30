import { notFound } from "next/navigation";
import { AssessmentRoom } from "@/components/assessment-room";
import { getCourseDetailData } from "@/lib/courses";
import { getSessionUser } from "@/lib/tenant";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CourseTestPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSessionUser();
  const data = await getCourseDetailData(slug, session?.authUser.id);

  if (!data) {
    notFound();
  }

  const { assessment, certificate, course, purchase } = data;

  if (!assessment) {
    notFound();
  }

  return (
    <AssessmentRoom
      backHref={`/courses/${course.slug}`}
      backLabel="Back to course"
      certificate={
        certificate
          ? {
              certificateNumber: certificate.certificateNumber,
              href: certificate.href,
              issuedAt: certificate.issuedAt,
              title: certificate.title,
            }
          : null
      }
      eyebrow="SkillGO Test Room"
      initialAttemptCount={assessment.attemptCount}
      initialLatestPassed={assessment.latestPassed}
      initialLatestScorePercent={assessment.latestScorePercent}
      initialReport={assessment.report}
      lockedBody={
        !session
          ? "Sign in first. SkillGO keeps the test history, rank, badge, and certificate attached to one learner profile."
          : purchase.hasAccess
            ? undefined
            : "Buy the course first. The lesson library, final test room, and certificate all stay under the same SkillGO access."
      }
      lockedTitle={!session ? "Sign in required" : purchase.hasAccess ? undefined : "SkillGO test locked"}
      maxAttempts={assessment.maxAttempts}
      passPercent={assessment.passPercent}
      questions={assessment.questions}
      submitEndpoint={`/api/courses/${course.slug}/assessment`}
      submitLabel="Submit SkillGO test"
      subtitle={
        assessment.summary ??
        "A focused final assessment room for SkillGO with rank, badge, and certificate feedback."
      }
      timerMinutes={assessment.durationMinutes}
      title={assessment.title}
    />
  );
}
