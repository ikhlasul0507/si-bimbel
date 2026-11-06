"use client";
import { useState } from "react";
import Shell from "@/components/Shell";
import { supabase, useQuery, rp, Tutor, Slot } from "@/lib/db";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const mk = (days: string[], start: string, end: string): Slot[] => days.map((day) => ({ day, start, end }));
const PRESET: { label: string; slots: () => Slot[]; tambah?: boolean }[] = [
  { label: "Sen–Jum Sore (14:00–20:30)", slots: () => mk(HARI.slice(0, 5), "14:00", "20:30") },
  { label: "Sen–Jum Sore + Sabtu Pagi", slots: () => [...mk(HARI.slice(0, 5), "14:00", "20:30"), ...mk(["Sabtu"], "08:00", "12:00")] },
  { label: "Sen–Sab Full (08:00–20:30)", slots: () => mk(HARI.slice(0, 6), "08:00", "20:30") },
  { label: "+ Sabtu & Minggu", slots: () => mk(["Sabtu", "Minggu"], "08:00", "17:00"), tambah: true },
];
const initials = (n: string) => n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function TentorForm({ awal, onClose, onSaved }: { awal: Tutor | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: awal?.name ?? "", phone: awal?.phone ?? "", area: awal?.area ?? "", subjects: awal?.subjects ?? "",
    pay_scheme: awal?.pay_scheme ?? "bagi_hasil", cut_percent: awal?.cut_percent ?? 30, rate: awal?.rate || 45000,
    active: awal?.active ?? true,
  });
  const [slots, setSlots] = useState<Slot[]>(awal?.availability ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const ubah = (i: number, patch: Partial<Slot>) => setSlots(slots.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const pakai = (p: (typeof PRESET)[number]) => {
    if (!p.tambah) return setSlots(p.slots());
    const baru = p.slots().filter((n) => !slots.some((c) => c.day === n.day && c.start === n.start && c.end === n.end));
    setSlots([...slots, ...baru]);
  };

  async function simpan() {
    setErr("");
    if (!f.name.trim()) return setErr("Isi nama tentor.");
    if (f.pay_scheme === "bagi_hasil" && (f.cut_percent < 0 || f.cut_percent > 100)) return setErr("Potongan lembaga harus antara 0 sampai 100.");
    const salah = slots.find((s) => !s.start || !s.end || s.end <= s.start);
    if (salah) return setErr(`Jam selesai harus lebih besar dari jam mulai (${salah.day}).`);
    setBusy(true);
    const data = {
      name: f.name.trim(), phone: f.phone.trim() || null, area: f.area.trim() || null, subjects: f.subjects.trim() || null,
      pay_scheme: f.pay_scheme, cut_percent: f.pay_scheme === "bagi_hasil" ? f.cut_percent : 0,
      rate: f.pay_scheme === "tetap" ? f.rate : 0, availability: slots, active: f.active,
    };
    const { error } = awal ? await supabase.from("tutors").update(data).eq("id", awal.id) : await supabase.from("tutors").insert(data);
    setBusy(false);
    if (error) return setErr(error.message.includes("column") ? "Kolom baru belum ada di Supabase. Jalankan SQL langkah 1 dulu." : error.message);
    onSaved();
  }

  return (
    <div className="ov" onClick={onClose}>
      <div className="dlg wide" role="dialog" aria-modal="true" aria-labelledby="tt" onClick={(e) => e.stopPropagation()}>
        <div className="row"><h2 id="tt" className="grow" style={{ margin: 0 }}>{awal ? "Ubah tentor" : "Tentor baru"}</h2><button className="btn ghost sm" aria-label="Tutup" onClick={onClose}>✕</button></div>

        <label htmlFor="tn">Nama tentor</label>
        <input id="tn" placeholder="mis. Rina Kartika" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="two">
          <div><label htmlFor="tw">WA tentor</label><input id="tw" inputMode="tel" placeholder="0812…" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><label htmlFor="ta">Area domisili</label><input id="ta" placeholder="Antapani" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></div>
        </div>
        <label htmlFor="tm">Mapel yang bisa diajar</label>
        <input id="tm" placeholder="Matematika, IPA, Bahasa Inggris" value={f.subjects} onChange={(e) => setF({ ...f, subjects: e.target.value })} />
        <p className="hint">Pisahkan dengan koma.</p>

        <label htmlFor="ts">Skema honor</label>
        <select id="ts" value={f.pay_scheme} onChange={(e) => setF({ ...f, pay_scheme: e.target.value as "tetap" | "bagi_hasil" })}>
          <option value="bagi_hasil">Bagi hasil: tarif murid dipotong % buat lembaga</option>
          <option value="tetap">Tarif tetap per pertemuan</option>
        </select>
        {f.pay_scheme === "bagi_hasil" ? (
          <>
            <label htmlFor="tc">Potongan lembaga (%)</label>
            <input id="tc" type="number" min={0} max={100} value={f.cut_percent} onChange={(e) => setF({ ...f, cut_percent: +e.target.value })} />
            <p className="hint">Dipotong dari tarif murid, sisanya jadi honor tentor.</p>
          </>
        ) : (
          <>
            <label htmlFor="tr">Honor per pertemuan (Rp)</label>
            <input id="tr" type="number" min={0} value={f.rate} onChange={(e) => setF({ ...f, rate: +e.target.value })} />
          </>
        )}

        <div className="box">
          <div className="boxhead"><span>Rentang jam bisa ngajar ({slots.length} slot)</span>{slots.length > 0 && <button type="button" className="linkbtn" onClick={() => setSlots([])}>Kosongkan semua</button>}</div>
          <p className="hint">Bisa tambah banyak rentang atau shift di hari yang sama (misal pagi 08:00–11:30 dan sore 14:00–20:30).</p>
          <div className="chips">{PRESET.map((p) => <button type="button" className="chip" key={p.label} onClick={() => pakai(p)}>{p.label}</button>)}</div>
          {slots.length > 0 && <div className="slot head"><span>Hari</span><span>Dari jam</span><span /><span>Sampai jam</span><span /></div>}
          {slots.map((s, i) => (
            <div className="slot" key={i}>
              <select aria-label="Hari" value={s.day} onChange={(e) => ubah(i, { day: e.target.value })}>{HARI.map((h) => <option key={h}>{h}</option>)}</select>
              <input aria-label="Dari jam" type="time" value={s.start} onChange={(e) => ubah(i, { start: e.target.value })} />
              <span>–</span>
              <input aria-label="Sampai jam" type="time" value={s.end} onChange={(e) => ubah(i, { end: e.target.value })} />
              <button type="button" className="x" aria-label="Hapus rentang" onClick={() => setSlots(slots.filter((_, k) => k !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="dashed" onClick={() => setSlots([...slots, { day: "Senin", start: "14:00", end: "20:30" }])}>+ Tambah rentang jam / shift mengajar</button>
        </div>

        <label htmlFor="tu">Status</label>
        <select id="tu" value={f.active ? "1" : "0"} onChange={(e) => setF({ ...f, active: e.target.value === "1" })}><option value="1">Aktif</option><option value="0">Nonaktif</option></select>

        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn full" disabled={busy} onClick={simpan}>{busy ? "Menyimpan…" : "Simpan data tentor"}</button>
      </div>
    </div>
  );
}

export default function TentorPage() {
  const { rows, loading, reload } = useQuery<Tutor>(() => supabase.from("tutors").select("*").order("name"), []);
  const [form, setForm] = useState<{ awal: Tutor | null } | null>(null);

  async function hapus(t: Tutor) { if (confirm(`Hapus ${t.name}? Jadwalnya ikut terhapus.`)) { await supabase.from("tutors").delete().eq("id", t.id); reload(); } }
  const skema = (t: Tutor) => (t.pay_scheme === "bagi_hasil" ? `Bagi hasil · potongan lembaga ${t.cut_percent ?? 0}%` : `${rp(t.rate)} per pertemuan`);
  const jam = (t: Tutor) => {
    const a = t.availability ?? [];
    if (a.length === 0) return "Jam mengajar belum diatur";
    return a.slice(0, 3).map((s) => `${s.day.slice(0, 3)} ${s.start}–${s.end}`).join(" · ") + (a.length > 3 ? ` · +${a.length - 3} lagi` : "");
  };

  return (
    <Shell>
      <div className="head">
        <div><h1>Tentor</h1><p className="sub">{rows.length} tentor terdaftar</p></div>
        <button className="btn" onClick={() => setForm({ awal: null })}>+ Tentor baru</button>
      </div>
      {loading ? <p className="empty">Memuat…</p> : rows.length === 0 ? (
        <div className="card empty"><b>Belum ada tentor</b><p className="meta">Tambah tentor pertama untuk mulai membuat jadwal.</p><button className="btn" onClick={() => setForm({ awal: null })}>+ Tentor baru</button></div>
      ) : rows.map((t) => (
        <div className="card" key={t.id}>
          <div className="row">
            <span className="avatar">{initials(t.name)}</span>
            <div className="grow"><div className="name">{t.name}</div><div className="meta">{[t.area, t.subjects].filter(Boolean).join(" · ") || "Area dan mapel belum diisi"}</div></div>
            <span className={`pill ${t.active === false ? "bad" : "ok"}`}>{t.active === false ? "Nonaktif" : "Aktif"}</span>
          </div>
          <div className="meta" style={{ marginTop: 10 }}>{skema(t)}</div>
          <div className="meta">{jam(t)}</div>
          <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost sm" onClick={() => setForm({ awal: t })}>Ubah</button>
            <button className="btn ghost sm" onClick={() => hapus(t)}>Hapus</button>
          </div>
        </div>
      ))}
      {form && <TentorForm awal={form.awal} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
    </Shell>
  );
}