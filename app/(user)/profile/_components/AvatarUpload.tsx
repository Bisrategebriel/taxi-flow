"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarUrl } from "../_actions";

interface Props {
  userId: string;
  avatarUrl: string | null;
  initials: string;
}

export default function AvatarUpload({ userId, avatarUrl, initials }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(avatarUrl);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;
    const supabase = createClient();

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    // Cache-bust so the browser fetches the new image
    const finalUrl = `${publicUrl}?t=${Date.now()}`;
    const result = await updateAvatarUrl(finalUrl);
    if (result.error) {
      setError(result.error);
    } else {
      setLocalUrl(finalUrl);
    }

    setUploading(false);
    e.target.value = "";
  }

  return (
    <div className="relative">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-card bg-primary text-primary-foreground text-2xl font-bold shadow-lg overflow-hidden">
        {localUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={localUrl}
            alt="Profile photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        title="Upload profile photo"
        className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {uploading ? (
          <span className="h-2.5 w-2.5 animate-spin rounded-full border border-white border-t-transparent" />
        ) : (
          <Camera size={11} />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFileChange}
      />

      {error && (
        <p className="absolute top-full left-0 mt-1 text-[10px] text-destructive whitespace-nowrap max-w-40 leading-tight">
          {error}
        </p>
      )}
    </div>
  );
}
