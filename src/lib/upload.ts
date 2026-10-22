import { supabase } from "@/integrations/supabase/client";

/** Uploads an image to the member's folder and returns a long-lived link. */
export async function uploadImage(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be under 5 MB");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("uploads").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2 || !data) throw e2 ?? new Error("Upload failed");
  return data.signedUrl;
}
