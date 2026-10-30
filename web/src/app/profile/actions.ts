"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function updateProfile(formData: {
  fullName: string;
  department: string;
  programDomain: string;
  batch: string;
  avatarUrl: string;
}) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 1. Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // 2. Update auth user_metadata if avatar URL is provided
    if (formData.avatarUrl !== undefined) {
      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: formData.avatarUrl || null }
      });
      if (authError) {
        return { success: false, error: `Auth update failed: ${authError.message}` };
      }
    }

    // 3. Update profile fields in database
    const { error: dbError } = await supabase
      .from("users")
      .update({
        full_name: formData.fullName.trim() || null,
        department: formData.department.trim() || null,
        program_domain: formData.programDomain.trim() || null,
        batch: formData.batch.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (dbError) {
      return { success: false, error: `Database update failed: ${dbError.message}` };
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}
