import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminResetPasswordPage() {
  redirect("/admin/login");
}
