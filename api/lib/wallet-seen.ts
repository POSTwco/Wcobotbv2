/**
 * Same registry the Edge function counts: kv_store_f75faf6c key wallet:seen:<accountId>.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type WalletSource = "hashpack" | "walletconnect" | "magic";

export async function touchWalletSeen(
  supabase: SupabaseClient,
  table: string,
  accountId: string,
  source: WalletSource,
): Promise<void> {
  if (!/^0\.0\.\d+$/.test(accountId)) return;
  const key = `wallet:seen:${accountId}`;
  const now = new Date().toISOString();
  const { data, error } = await supabase.from(table).select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  const existing = data?.value;
  let value: any;
  if (!existing || typeof existing !== "object") {
    value = { firstSeenAt: now, lastSeenAt: now, sources: [source], loginCount: 1 };
  } else {
    const sources = new Set<string>(Array.isArray(existing.sources) ? existing.sources : []);
    sources.add(source);
    value = {
      firstSeenAt: typeof existing.firstSeenAt === "string" ? existing.firstSeenAt : now,
      lastSeenAt: now,
      sources: [...sources],
      loginCount: (Number(existing.loginCount) || 0) + 1,
    };
  }
  const write = await supabase.from(table).upsert({ key, value });
  if (write.error) throw new Error(write.error.message);
}
