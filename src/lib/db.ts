"use client";
import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);

export type Student = { id: string; name: string; parent_name: string | null; phone: string; package_name: string; quota_total: number; quota_used: number; price: number; paid: boolean };
export type Slot = { day: string; start: string; end: string };
export type Tutor = { id: string; name: string; phone: string | null; rate: number; area?: string | null; subjects?: string | null; pay_scheme?: "tetap" | "bagi_hasil"; cut_percent?: number; availability?: Slot[]; active?: boolean };
export type Session = { id: string; student_id: string; tutor_id: string; date: string; time: string; attended: boolean };

export const rp = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
export const localDate = () => new Date().toLocaleDateString("sv-SE");
export const sisa = (s: Student) => s.quota_total - s.quota_used;
export const hhmm = (t: string) => t.slice(0, 5);

export function waLink(s: Student, kind: "tagih" | "habis") {
  const no = s.phone.replace(/\D/g, "").replace(/^0/, "62");
  const ortu = s.parent_name || "Bapak/Ibu";
  const msg = kind === "habis"
    ? `Halo ${ortu}, paket ${s.package_name} untuk ${s.name} tersisa ${sisa(s)} pertemuan. Untuk lanjut, mohon transfer ${rp(s.price)}. Terima kasih.`
    : `Halo ${ortu}, mengingatkan tagihan paket ${s.package_name} untuk ${s.name} sebesar ${rp(s.price)}. Terima kasih.`;
  return `https://wa.me/${no}?text=${encodeURIComponent(msg)}`;
}

export function useQuery<T>(fn: () => PromiseLike<{ data: unknown }>, deps: unknown[]) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => { const { data } = await fn(); setRows((data ?? []) as T[]); setLoading(false); }, deps);
  useEffect(() => { load(); }, [load]);
  return { rows, loading, reload: load };
}