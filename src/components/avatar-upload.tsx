"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { removeAvatarAction, updateAvatarAction } from "@/server/actions/profile";
import { Avatar } from "./ui";
import { cn } from "@/lib/utils";

/** Redimensiona/recorta a imagem para 256×256 JPEG (~30-80 KB) antes de salvar. */
async function fileToSquareDataUrl(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function AvatarUpload({
  name,
  initialAvatar,
  size = 96,
}: {
  name: string;
  initialAvatar: string | null;
  size?: number;
}) {
  const [avatar, setAvatar] = useState(initialAvatar);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const busy = pending || saving;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(undefined);
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Imagem muito grande (máx. 8 MB).");
      return;
    }
    setSaving(true);
    try {
      const dataUrl = await fileToSquareDataUrl(file);
      startTransition(async () => {
        const res = await updateAvatarAction(dataUrl);
        setSaving(false);
        if (res?.error) {
          setError(res.error);
          return;
        }
        setAvatar(dataUrl);
        router.refresh();
      });
    } catch {
      setSaving(false);
      setError("Não foi possível processar a imagem. Tente outro arquivo.");
    }
  };

  const handleRemove = () => {
    setError(undefined);
    startTransition(async () => {
      const res = await removeAvatarAction();
      if (res?.error) {
        setError(res.error);
        return;
      }
      setAvatar(null);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name} src={avatar} size={size} className="rounded-2xl shadow-md" />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
          title="Alterar foto"
          aria-label="Alterar foto do perfil"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-700">Foto do perfil</p>
        <p className="mt-0.5 text-xs text-slate-400">JPG, PNG ou WebP · recortada em quadrado automaticamente</p>
        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="text-xs font-semibold text-[var(--primary)] hover:underline disabled:opacity-50"
          >
            {avatar ? "Trocar foto" : "Adicionar foto"}
          </button>
          {avatar && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRemove}
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-[var(--danger)]",
                busy && "opacity-50",
              )}
            >
              <Trash2 size={12} /> Remover
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    </div>
  );
}
