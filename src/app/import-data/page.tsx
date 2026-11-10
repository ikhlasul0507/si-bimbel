"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import Shell from "@/components/Shell";
import { supabase, Slot } from "@/lib/db";

type Row = Record<string, unknown>;
type StudentRow = { name: string; parent_name: string | null; phone: string; student_phone: string | null; address: string | null; area: string | null; grade: string | null; status: string; start_date: string | null };
type TutorRow = { name: string; phone: string | null; area: string | null; subjects: string | null; pay_scheme: "tetap" | "bagi_hasil"; rate: number; cut_percent: number };
type ScheduleRow = { student: string; tutor: string; subject: string; class_type: string; day: string; start: string; end: string; quota: number; start_date: string; price: number; tutor_rate: number | null };
type Parsed = { students: StudentRow[]; tutors: TutorRow[]; schedules: ScheduleRow[] };

const HEADERS = {
  Murid: ["Nama Murid", "Nama Ortu", "WA Ortu", "WA Murid", "Alamat", "Area", "Kelas", "Status", "Mulai Les"],
  Tentor: ["Nama Tentor", "WA Tentor", "Area", "Mapel", "Skema Honor", "Honor Tetap", "Potongan Lembaga (%)"],
  Jadwal: ["Nama Murid", "Nama Tentor", "Mapel", "Jenis Kelas", "Hari", "Jam Mulai", "Jam Selesai", "Jumlah Pertemuan", "Mulai Tanggal", "Harga Paket", "Honor Tentor"],
};
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const text = (v: unknown) => String(v ?? "").trim();
const key = (s: string) => s.trim().toLocaleLowerCase("id-ID");
const amount = (v: unknown, fallback = 0) => { const n = Number(String(v ?? "").replace(/[^\d.-]/g, "")); return Number.isFinite(n) ? n : fallback; };
function dateValue(v: unknown): string {
  if (typeof v === "number") { const d = XLSX.SSF.parse_date_code(v); return d ? `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}` : ""; }
  const s = text(v); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}` : "";
}
function timeValue(v: unknown): string {
  if (typeof v === "number") { const mins = Math.round(v * 1440) % 1440; return `${String(Math.floor(mins / 60)).padStart(2,"0")}:${String(mins % 60).padStart(2,"0")}`; }
  const m = text(v).match(/^(\d{1,2}):(\d{2})/); return m ? `${m[1].padStart(2,"0")}:${m[2]}` : "";
}
function readRows(wb: XLSX.WorkBook, sheet: keyof typeof HEADERS) {
  const ws = wb.Sheets[sheet]; if (!ws) throw new Error(`Sheet “${sheet}” tidak ditemukan.`);
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: "", raw: true });
}
function parseWorkbook(wb: XLSX.WorkBook): { parsed: Parsed; errors: string[] } {
  const errors: string[] = [], parsed: Parsed = { students: [], tutors: [], schedules: [] };
  for (const [i, r] of readRows(wb, "Murid").entries()) {
    if (!Object.values(r).some((v) => text(v))) continue;
    const name = text(r["Nama Murid"]), status = text(r.Status) || "aktif";
    if (!name) errors.push(`Murid baris ${i + 2}: Nama Murid wajib diisi.`);
    if (!["aktif", "trial", "arsip"].includes(status.toLowerCase())) errors.push(`Murid baris ${i + 2}: Status harus aktif, trial, atau arsip.`);
    parsed.students.push({ name, parent_name: text(r["Nama Ortu"]) || null, phone: text(r["WA Ortu"]), student_phone: text(r["WA Murid"]) || null, address: text(r.Alamat) || null, area: text(r.Area) || null, grade: text(r.Kelas) || null, status: status.toLowerCase(), start_date: dateValue(r["Mulai Les"]) || null });
  }
  for (const [i, r] of readRows(wb, "Tentor").entries()) {
    if (!Object.values(r).some((v) => text(v))) continue;
    const name = text(r["Nama Tentor"]), scheme = (text(r["Skema Honor"]) || "bagi_hasil").toLowerCase(), cut = amount(r["Potongan Lembaga (%)"], 30);
    if (!name) errors.push(`Tentor baris ${i + 2}: Nama Tentor wajib diisi.`);
    if (!["tetap", "bagi_hasil"].includes(scheme)) errors.push(`Tentor baris ${i + 2}: Skema Honor harus tetap atau bagi_hasil.`);
    if (cut < 0 || cut > 100) errors.push(`Tentor baris ${i + 2}: Potongan Lembaga harus 0–100.`);
    parsed.tutors.push({ name, phone: text(r["WA Tentor"]) || null, area: text(r.Area) || null, subjects: text(r.Mapel) || null, pay_scheme: scheme === "tetap" ? "tetap" : "bagi_hasil", rate: amount(r["Honor Tetap"]), cut_percent: cut });
  }
  for (const [i, r] of readRows(wb, "Jadwal").entries()) {
    if (!Object.values(r).some((v) => text(v))) continue;
    const row: ScheduleRow = { student: text(r["Nama Murid"]), tutor: text(r["Nama Tentor"]), subject: text(r.Mapel), class_type: (text(r["Jenis Kelas"]) || "privat").toLowerCase(), day: text(r.Hari), start: timeValue(r["Jam Mulai"]), end: timeValue(r["Jam Selesai"]), quota: amount(r["Jumlah Pertemuan"]), start_date: dateValue(r["Mulai Tanggal"]), price: amount(r["Harga Paket"]), tutor_rate: text(r["Honor Tentor"]) ? amount(r["Honor Tentor"]) : null };
    if (!row.student || !row.tutor || !row.subject) errors.push(`Jadwal baris ${i + 2}: Nama Murid, Nama Tentor, dan Mapel wajib diisi.`);
    if (!DAYS.includes(row.day)) errors.push(`Jadwal baris ${i + 2}: Hari harus Senin sampai Minggu.`);
    if (!row.start || !row.end || row.end <= row.start) errors.push(`Jadwal baris ${i + 2}: Jam mulai dan selesai tidak valid.`);
    if (!row.start_date || row.quota < 1 || row.quota > 100) errors.push(`Jadwal baris ${i + 2}: Mulai Tanggal dan Jumlah Pertemuan (1–100) wajib valid.`);
    if (!["privat", "kelompok"].includes(row.class_type)) errors.push(`Jadwal baris ${i + 2}: Jenis Kelas harus privat atau kelompok.`);
    parsed.schedules.push(row);
  }
  const groups = new Map<string, ScheduleRow[]>();
  parsed.schedules.forEach((x) => { const k = `${key(x.student)}|${key(x.tutor)}|${key(x.subject)}`; groups.set(k, [...(groups.get(k) ?? []), x]); });
  for (const rows of groups.values()) if (rows.some((x) => x.quota !== rows[0].quota || x.start_date !== rows[0].start_date || x.class_type !== rows[0].class_type)) errors.push(`Jadwal ${rows[0].subject} untuk ${rows[0].student}: Jumlah Pertemuan, Jenis Kelas, dan Mulai Tanggal harus sama pada semua baris hari.`);
  return { parsed, errors };
}
function makeTemplate() {
  const wb = XLSX.utils.book_new();
  const data: [keyof typeof HEADERS, unknown[][]][] = [
    ["Murid", [HEADERS.Murid, ["Nisa Putri", "Ibu Sari", "081234567890", "", "Jl. Melati 10", "Antapani", "SD kelas 4", "aktif", "2026-11-10"]]],
    ["Tentor", [HEADERS.Tentor, ["Rina Kartika", "081234567891", "Antapani", "Matematika, IPA", "bagi_hasil", "", 30]]],
    ["Jadwal", [HEADERS.Jadwal, ["Nisa Putri", "Rina Kartika", "Matematika", "privat", "Senin", "15:30", "17:00", 8, "2026-11-10", 800000, ""]]],
  ];
  data.forEach(([name, rows]) => { const ws = XLSX.utils.aoa_to_sheet(rows); ws["!cols"] = HEADERS[name].map((h) => ({ wch: Math.max(18, h.length + 2) })); XLSX.utils.book_append_sheet(wb, ws, name); });
  const info = XLSX.utils.aoa_to_sheet([["Petunjuk Import Si-Bimbel"], ["1. Isi sheet Murid dan Tentor. Baris contoh boleh dihapus."], ["2. Sheet Jadwal: satu baris untuk satu hari/rentang jam. Nama murid/tentor harus cocok dengan sheet atau data yang sudah ada."], ["3. Jumlah Pertemuan adalah total sesi; beberapa baris hari digabung menjadi satu jadwal les."], ["4. Hari: Senin sampai Minggu. Jam: HH:mm. Tanggal: YYYY-MM-DD."], ["5. Skema Honor: tetap atau bagi_hasil. Jenis Kelas: privat atau kelompok. Honor Tentor kosong berarti mengikuti skema tentor."], ["6. Import menambahkan data baru dan memakai kembali nama yang ada tanpa menimpa data lama."]]);
  XLSX.utils.book_append_sheet(wb, info, "Petunjuk"); XLSX.writeFile(wb, "template-import-si-bimbel.xlsx");
}
const plusDays = (date: string, n: number) => { const d = new Date(date + "T00:00:00"); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); };
const dayOf = (date: string) => DAYS[(new Date(date + "T00:00:00").getDay() + 6) % 7];

export default function ImportDataPage() {
  const [parsed, setParsed] = useState<Parsed | null>(null), [errors, setErrors] = useState<string[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [fileName, setFileName] = useState("");
  async function pilihFile(file?: File) {
    setParsed(null); setErrors([]); setMessage(""); setFileName(file?.name ?? ""); if (!file) return;
    if (!/\.xlsx?$/i.test(file.name)) return setErrors(["Pilih file Excel .xlsx atau .xls."]);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false }), result = parseWorkbook(wb);
      if (!result.parsed.students.length && !result.parsed.tutors.length && !result.parsed.schedules.length) result.errors.push("File belum berisi data untuk diimport.");
      const [sRes, tRes] = await Promise.all([supabase.from("students").select("id,name"), supabase.from("tutors").select("id,name")]);
      if (sRes.error || tRes.error) result.errors.push(sRes.error?.message ?? tRes.error?.message ?? "Gagal membaca data yang sudah ada.");
      else {
        const sn = new Set([...(sRes.data ?? []).map((x) => key(x.name)), ...result.parsed.students.map((x) => key(x.name))]), tn = new Set([...(tRes.data ?? []).map((x) => key(x.name)), ...result.parsed.tutors.map((x) => key(x.name))]);
        result.parsed.schedules.forEach((x, i) => { if (!sn.has(key(x.student))) result.errors.push(`Jadwal baris ${i + 2}: Murid “${x.student}” tidak ada di sheet Murid atau database.`); if (!tn.has(key(x.tutor))) result.errors.push(`Jadwal baris ${i + 2}: Tentor “${x.tutor}” tidak ada di sheet Tentor atau database.`); });
      }
      setParsed(result.parsed); setErrors(result.errors);
    } catch (e) { setErrors([e instanceof Error ? e.message : "File Excel tidak dapat dibaca."]); }
  }

  async function importData() {
    if (!parsed || errors.length) return; setBusy(true); setMessage("");
    try {
      const [sRes, tRes] = await Promise.all([supabase.from("students").select("id,name"), supabase.from("tutors").select("id,name")]);
      if (sRes.error || tRes.error) throw new Error(sRes.error?.message ?? tRes.error?.message);
      const students = new Map((sRes.data ?? []).map((x) => [key(x.name), x.id])), tutors = new Map((tRes.data ?? []).map((x) => [key(x.name), x.id]));
      let newStudents = 0, newTutors = 0, newLessons = 0, newSessions = 0;
      for (const x of parsed.students) if (!students.has(key(x.name))) {
        const { data, error } = await supabase.from("students").insert({ ...x, paid: true }).select("id").single();
        if (error || !data) throw new Error(`Gagal menyimpan murid “${x.name}”: ${error?.message ?? "ID tidak diterima."}`); students.set(key(x.name), data.id); newStudents++;
      }
      for (const x of parsed.tutors) if (!tutors.has(key(x.name))) {
        const { data, error } = await supabase.from("tutors").insert({ ...x, active: true, availability: [] }).select("id").single();
        if (error || !data) throw new Error(`Gagal menyimpan tentor “${x.name}”: ${error?.message ?? "ID tidak diterima."}`); tutors.set(key(x.name), data.id); newTutors++;
      }
      const groups = new Map<string, ScheduleRow[]>();
      parsed.schedules.forEach((x) => { const k = `${key(x.student)}|${key(x.tutor)}|${key(x.subject)}`; groups.set(k, [...(groups.get(k) ?? []), x]); });
      for (const rows of groups.values()) {
        const first = rows[0], slots: Slot[] = [];
        rows.forEach((x) => { if (!slots.some((s) => s.day === x.day && s.start === x.start && s.end === x.end)) slots.push({ day: x.day, start: x.start, end: x.end }); });
        if (rows.some((x) => x.quota !== first.quota || x.start_date !== first.start_date || x.class_type !== first.class_type)) throw new Error(`Jadwal ${first.subject} untuk ${first.student}: Jumlah Pertemuan, Jenis Kelas, dan Mulai Tanggal harus sama pada semua baris hari.`);
        const studentId = students.get(key(first.student))!, tutorId = tutors.get(key(first.tutor))!;
        const { data: lesson, error } = await supabase.from("lessons").insert({ student_id: studentId, tutor_id: tutorId, subject: first.subject, class_type: first.class_type, slots, quota_per_package: first.quota, price: first.price, tutor_rate: first.tutor_rate, start_date: first.start_date, status: "aktif" }).select("id").single();
        if (error || !lesson) throw new Error(`Gagal membuat jadwal ${first.subject} untuk ${first.student}: ${error?.message ?? "ID tidak diterima."}`); newLessons++;
        const sessions: { student_id: string; tutor_id: string; lesson_id: string; date: string; time: string; end_time: string }[] = [];
        let d = first.start_date;
        for (let tries = 0; tries < 500 && sessions.length < first.quota; tries++, d = plusDays(d, 1)) for (const slot of slots.filter((s) => s.day === dayOf(d)).sort((a,b) => a.start.localeCompare(b.start))) if (sessions.length < first.quota) sessions.push({ student_id: studentId, tutor_id: tutorId, lesson_id: lesson.id, date: d, time: slot.start, end_time: slot.end });
        if (sessions.length < first.quota) throw new Error(`Tidak berhasil membentuk ${first.quota} sesi untuk ${first.student}.`);
        const { error: sessionError } = await supabase.from("sessions").insert(sessions);
        if (sessionError) throw new Error(`Jadwal les tersimpan, tetapi sesi gagal dibuat: ${sessionError.message}`); newSessions += sessions.length;
        const { error: studentError } = await supabase.from("students").update({ package_name: first.subject, quota_total: first.quota, quota_used: 0, price: first.price, paid: true }).eq("id", studentId);
        if (studentError) throw new Error(`Sesi tersimpan, tetapi paket murid gagal diperbarui: ${studentError.message}`);
        if (first.price > 0) { const { error: invoiceError } = await supabase.from("invoices").insert({ student_id: studentId, kind: "spp", title: `Paket ${first.subject} (${first.quota} pertemuan)`, amount: first.price, paid_amount: 0, due_date: plusDays(first.start_date, 7) }); if (invoiceError) throw new Error(`Sesi tersimpan, tetapi invoice gagal dibuat: ${invoiceError.message}`); }
      }
      setMessage(`Import selesai. Ditambahkan ${newStudents} murid, ${newTutors} tentor, ${newLessons} jadwal les, dan ${newSessions} sesi. Nama yang sudah terdaftar digunakan kembali tanpa ditimpa.`);
    } catch (e) { setErrors([e instanceof Error ? e.message : "Import gagal."]); }
    setBusy(false);
  }

  return <Shell>
    <h1>Import data Excel</h1><p className="sub">Import data murid, tentor, dan jadwal mengajar dari satu workbook Excel.</p>
    <div className="card" style={{ marginTop: 18 }}><h2 style={{ marginTop: 0 }}>1. Unduh template</h2><p className="meta">Template berisi sheet Murid, Tentor, Jadwal, dan Petunjuk. Satu baris jadwal mewakili satu hari/rentang jam.</p><button className="btn ghost" onClick={makeTemplate}>Unduh template Excel</button></div>
    <div className="card"><h2 style={{ marginTop: 0 }}>2. Isi dan pilih file</h2><p className="meta">Gunakan file .xlsx atau .xls. Data bernama sama dengan data yang sudah ada digunakan kembali tanpa menimpa data lama.</p>
      <label htmlFor="excel-file">File Excel</label><input id="excel-file" type="file" accept=".xlsx,.xls" onChange={(e) => pilihFile(e.target.files?.[0])} />{fileName && <p className="hint">Dipilih: {fileName}</p>}
      {parsed && <div className="statsbar" style={{ marginTop: 16 }}><div><span>Murid dalam file</span><b>{parsed.students.length}</b></div><div><span>Tentor dalam file</span><b>{parsed.tutors.length}</b></div><div><span>Baris jadwal</span><b>{parsed.schedules.length}</b></div></div>}
      {errors.length > 0 && <div className="err" role="alert"><b>Periksa file sebelum import:</b><ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>{errors.slice(0, 30).map((e, i) => <li key={i}>{e}</li>)}</ul>{errors.length > 30 && <p>Dan {errors.length - 30} kesalahan lainnya.</p>}</div>}
      {message && <div className="ok" role="status" style={{ marginTop: 14 }}>{message}</div>}
      <button className="btn full" disabled={!parsed || errors.length > 0 || busy || !!message} onClick={importData}>{busy ? "Mengimpor…" : message ? "Import selesai" : "Import data"}</button><p className="hint">Jadwal berulang dibuat menjadi sesi sebanyak Jumlah Pertemuan. Data yang masuk sebelum terjadi error tetap tersimpan.</p>
    </div>
  </Shell>;
}
