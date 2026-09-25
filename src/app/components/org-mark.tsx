import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-57fcb0ee`;
const cache = new Map<string, string>();

async function loadLogo(id: string): Promise<string> {
  const hit = cache.get(id);
  if (hit) return hit;
  const res = await fetch(`${BASE_URL}/organizations/${encodeURIComponent(id)}/logo`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
  if (!res.ok) return "";
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  cache.set(id, url);
  return url;
}

export function OrgMark({
  id,
  hasLogo,
  name,
  featured = false,
  className = "",
}: {
  id: string;
  hasLogo: boolean;
  name: string;
  featured?: boolean;
  className?: string;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!hasLogo) {
      setSrc("");
      return;
    }
    let cancel = false;
    loadLogo(id).then((url) => {
      if (!cancel) setSrc(url);
    }).catch(() => {
      if (!cancel) setSrc("");
    });
    return () => {
      cancel = true;
    };
  }, [id, hasLogo]);

  if (src) {
    return <img src={src} alt="" className={className} />;
  }
  if (featured) {
    return <img src={botbShield} alt="" className={className} />;
  }
  return (
    <div className={`flex items-center justify-center bg-[#0B1120] ${className}`} aria-hidden>
      <Building2 className="w-8 h-8 text-[#4274B9]/40" />
      <span className="sr-only">{name}</span>
    </div>
  );
}
