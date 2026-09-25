import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-57fcb0ee`;
const cache = new Map<string, string>();

async function loadPhoto(id: string): Promise<string> {
  const hit = cache.get(id);
  if (hit) return hit;
  const res = await fetch(`${BASE_URL}/judges/${encodeURIComponent(id)}/photo`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
  if (!res.ok) return "";
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  cache.set(id, url);
  return url;
}

export function JudgeMark({
  id,
  hasPhoto,
  name,
  className = "",
}: {
  id: string;
  hasPhoto: boolean;
  name: string;
  className?: string;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!hasPhoto) {
      setSrc("");
      return;
    }
    let cancel = false;
    loadPhoto(id).then((url) => {
      if (!cancel) setSrc(url);
    }).catch(() => {
      if (!cancel) setSrc("");
    });
    return () => {
      cancel = true;
    };
  }, [id, hasPhoto]);

  if (src) {
    return <img src={src} alt="" className={className} />;
  }
  return (
    <div className={`flex items-center justify-center bg-[#0B1120] text-[#E8ECF0] ${className}`} aria-hidden>
      <Scale className="w-5 h-5" />
      <span className="sr-only">{name}</span>
    </div>
  );
}
