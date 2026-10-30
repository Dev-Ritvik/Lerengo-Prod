import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export function setFlashMessage(response: NextResponse, type: "error" | "notice" | "detail", message: string) {
  response.cookies.set(`flash_${type}`, message, {
    path: "/",
    maxAge: 10, // Expires in 10 seconds (enough for redirect + render)
    httpOnly: false,
    sameSite: "lax",
  });
  return response;
}

export async function setFlashMessageCookie(type: "error" | "notice" | "detail", message: string) {
  const cookieStore = await cookies();
  cookieStore.set(`flash_${type}`, message, {
    path: "/",
    maxAge: 10,
    httpOnly: false,
    sameSite: "lax",
  });
}

export async function getFlashMessage(type: "error" | "notice" | "detail") {
  const cookieStore = await cookies();
  return cookieStore.get(`flash_${type}`)?.value ?? null;
}
