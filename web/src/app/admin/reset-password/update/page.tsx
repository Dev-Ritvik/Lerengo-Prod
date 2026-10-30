import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminResetPasswordUpdatePage() {
  redirect("/admin/login");
}
