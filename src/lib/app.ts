"use client";
import { useEffect, useState } from "react";
import { supabase, rp, Session, Student, Tutor } from "@/lib/db";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const namaBulan = (m: string) => { const [y, mo] = m.split("-").map(Number); return `${BULAN[mo - 1]} ${y}`; };
export const geserBulan = (m: string, n: number) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
export const batasBulan = (m: string) => ({ dari: `${m}-01`, sampai: `${geserBulan(m, 1)}-01` });
export const geserHari = (d: string, n: number) => { const x = new Date(d + "T00:00"); x.setDate(x.getDate() + n); return x.toLocaleDateString("sv-SE"); };
export const noWa = (p: string) => p.replace(/\D/g, "").replace(/^0/, "62");
export const tglPendek = (d: string) => new Date(d + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long" });
export const ribu = (n: number) => (n ? n.toLocaleString("id-ID") : "");
export const angka = (s: string) => Number(s.replace(/\D/g, ""));

export type SesiX = Session & { lesson_id?: string | null; end_time?: string | null; outcome?: string | null; honor_amount?: number; materi?: string | null; catatan?: string | null };
export type Makeup = { id: string; session_id: string | null; student_id: string; tutor_id: string; lesson_id: string | null; due_date: string; done: boolean };
export type Invoice = { id: string; student_id: string; kind: string; title: string; amount: number; paid_amount: number; due_date: string | null };
export type Score = { id: string; student_id: string; date: string; title: string; subject: string | null; score: number; max_score: number; note: string | null };
export const sisaTagihan = (i: Invoice) => i.amount - i.paid_amount;

export type Outcome = "hadir" | "izin_dikabari" | "izin_mendadak" | "murid_absen" | "tentor_halangan";
export const OUTCOMES: { key: Outcome; label: string; tag?: string; sub: string; pakaiKuota: boolean; pct: number; pengganti: boolean }[] = [
  { key: "hadir", label: "Hadir", sub: "kuota kepake 1 · honor penuh", pakaiKuota: true, pct: 100, pengganti: false },
  { key: "izin_dikabari", label: "Izin (dikabari)", tag: "≥12 jam sebelumnya", sub: "kuota nggak kepake · tanpa honor · jadi utang pertemuan (pengganti 14 hari)", pakaiKuota: false, pct: 0, pengganti: true },
  { key: "izin_mendadak", label: "Izin mendadak", tag: "<12 jam", sub: "kuota kepake 1 · honor 50%", pakaiKuota: true, pct: 50, pengganti: false },
  { key: "murid_absen", label: "Murid nggak ada", sub: "kuota kepake 1 · honor penuh", pakaiKuota: true, pct: 100, pengganti: false },
  { key: "tentor_halangan", label: "Tentor berhalangan", sub: "kuota nggak kepake · tanpa honor · jadi utang pertemuan (pengganti 14 hari)", pakaiKuota: false, pct: 0, pengganti: true },
];
export const labelOutcome = (k?: string | null) => OUTCOMES.find((o) => o.key === k)?.label ?? "";

type LesHonor = { price: number; quota_per_package: number; tutor_rate: number | null };
export function hitungHonor(t: Tutor | undefined, les: LesHonor | null | undefined, s: Student | undefined, pct: number) {
  if (!t || pct <= 0) return 0;
  let base = t.rate;
  if (les?.tutor_rate != null) base = les.tutor_rate;
  else if (t.pay_scheme === "bagi_hasil") {
    const harga = les ? les.price : s?.price ?? 0;
    const q = les ? les.quota_per_package : s?.quota_total ?? 0;
    base = q > 0 ? ((harga / q) * (100 - (t.cut_percent ?? 0))) / 100 : 0;
  }
  return Math.round((base * pct) / 100);
}

export type Pengaturan = { inst_name: string; inst_tagline: string; bank_info: string };
export function usePengaturan() {
  const [p, setP] = useState<Pengaturan>({ inst_name: "Si-Bimbel", inst_tagline: "", bank_info: "" });
  const load = async () => {
    const { data } = await supabase.from("settings").select("*").maybeSingle();
    if (data) setP({ inst_name: data.inst_name || "Si-Bimbel", inst_tagline: data.inst_tagline || "", bank_info: data.bank_info || "" });
  };
  useEffect(() => { load(); }, []);
  return { p, reload: load };
}

export async function pastikanPortal(m: { id: string; portal_token?: string | null }) {
  if (m.portal_token) return m.portal_token;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const { error } = await supabase.from("students").update({ portal_token: token, portal_on: true }).eq("id", m.id);
  return error ? null : token;
}

export function pesanTagihan(p: Pengaturan, ortu: string | null, murid: string, judul: string, total: number, sisa: number, due: string | null) {
  return `*${p.inst_name}*\nHalo Bapak/Ibu ${ortu ?? ""}, berikut rekap & invoice les ananda *${murid}*:\n\n*Rincian Tagihan*\n• Item: *${judul}*\n• Total Tagihan: *${rp(total)}*\n${sisa < total ? `• Sisa: *${rp(sisa)}*\n` : ""}${due ? `Mohon dibayar sebelum ${tglPendek(due)}.\n` : ""}${p.bank_info ? `\n*Rekening Pembayaran:*\n${p.bank_info}\n` : ""}\nTerima kasih.`;
}
export function pesanRapor(p: Pengaturan, ortu: string | null, murid: string, bulan: string, hadir: number, total: number, rata: number | null, catatan: string, link: string) {
  return `*${p.inst_name} · Rapor Perkembangan Bulanan*\nHalo Bapak/Ibu ${ortu ?? ""}, berikut rapor belajar ananda *${murid}* periode *${namaBulan(bulan)}*:\n\n*Rekap Kehadiran:* ${hadir} dari ${total} pertemuan tercatat.\n${rata != null ? `*Rata-rata Nilai:* ${rata}\n` : ""}${catatan ? `*Catatan Perkembangan:* ${catatan}\n` : ""}\n*Disahkan Oleh:* ${p.inst_name}\n\n*Portal Belajar Resmi (Rapor PDF, Nilai & Invoice):*\n${link}`;
}