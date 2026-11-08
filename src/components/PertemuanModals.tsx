"use client";
import { useState } from "react";
import { supabase, hhmm, Student, Tutor } from "@/lib/db";
import { OUTCOMES, Outcome, SesiX, Makeup, hitungHonor, geserHari } from "@/lib/app";

const mnt = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export function CatatModal({ sesi, murid, tutor, mapel, onClose, onSaved }: { sesi: SesiX; murid?: Student; tutor?: Tutor; mapel: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ date: sesi.date, start: hhmm(sesi.time), end: sesi.end_time ? hhmm(sesi.end_time) : "", materi: sesi.materi ?? "", catatan: sesi.catatan ?? "" });
  const [pilih, setPilih] = useState<Outcome>((sesi.outcome as Outcome) ?? "hadir");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function simpan() {
    setErr("");
    const o = OUTCOMES.find((x) => x.key === pilih)!;
    if (f.end && f.end <= f.start) return setErr("Jam selesai harus lebih besar dari jam mulai.");
    if (o.pakaiKuota && !sesi.attended && murid && murid.quota_used >= murid.quota_total) return setErr("Paket murid sudah habis. Buat paket baru lewat Tambah les.");
    setBusy(true);
    let les = null;
    if (sesi.lesson_id) { const r = await supabase.from("lessons").select("price,quota_per_package,tutor_rate").eq("id", sesi.lesson_id).maybeSingle(); les = r.data; }
    let id = sesi.id;
    if (!id) {
      const ins = await supabase.from("sessions").insert({ student_id: sesi.student_id, tutor_id: sesi.tutor_id, lesson_id: sesi.lesson_id ?? null, date: f.date, time: f.start }).select("id").single();
      if (ins.error || !ins.data) { setBusy(false); return setErr(ins.error?.message ?? "Gagal menyimpan."); }
      id = ins.data.id as string;
    }
    const up = await supabase.from("sessions").update({ date: f.date, time: f.start, end_time: f.end || null, outcome: o.key, attended: o.pakaiKuota, honor_pct: o.pct, honor_amount: hitungHonor(tutor, les, murid, o.pct), materi: f.materi.trim() || null, catatan: f.catatan.trim() || null }).eq("id", id);
    if (up.error) { setBusy(false); return setErr(/outcome|honor|materi|column/.test(up.error.message) ? "Kolom baru belum ada di Supabase. Jalankan SQL dulu." : up.error.message); }
    if (o.pengganti) {
      const { data: ada } = await supabase.from("makeups").select("id").eq("session_id", id).maybeSingle();
      if (!ada) await supabase.from("makeups").insert({ session_id: id, student_id: sesi.student_id, tutor_id: sesi.tutor_id, lesson_id: sesi.lesson_id ?? null, due_date: geserHari(f.date, 14) });
    } else await supabase.from("makeups").delete().eq("session_id", id).eq("done", false);
    setBusy(false);
    onSaved();
  }
  async function batalkan() {
    if (!sesi.id || !confirm("Batalkan catatan pertemuan ini?")) return;
    await supabase.from("sessions").update({ outcome: null, attended: false, honor_pct: 0, honor_amount: 0 }).eq("id", sesi.id);
    await supabase.from("makeups").delete().eq("session_id", sesi.id).eq("done", false);
    onSaved();
  }
  const dur = f.end ? mnt(f.end) - mnt(f.start) : 0;

  return (
    <div className="ov" onClick={onClose}>
      <div className="dlg full" role="dialog" aria-modal="true" aria-labelledby="ct" onClick={(e) => e.stopPropagation()}>
        <div className="mhead"><h2 id="ct">Catat pertemuan</h2><button className="btn ghost sm" aria-label="Tutup" onClick={onClose}>✕</button></div>
        <div className="mbody">
          <div className="grp"><b>{murid?.name ?? "Murid"}</b><div className="meta">{mapel} · {tutor?.name ?? "Tentor"} · {f.start}{f.end ? `–${f.end}` : ""}{dur > 0 ? ` (${dur} mnt)` : ""}</div></div>
          <div className="three">
            <div><label htmlFor="c1">Tanggal</label><input id="c1" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div><label htmlFor="c2">Jam mulai</label><input id="c2" type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
            <div><label htmlFor="c3">Jam selesai</label><input id="c3" type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
          </div>
          <label>Gimana pertemuannya</label>
          {OUTCOMES.map((o) => (
            <button type="button" key={o.key} className="opt" aria-pressed={pilih === o.key} onClick={() => setPilih(o.key)}>
              <span><b>{o.label}</b>{o.tag && <small style={{ display: "inline", marginLeft: 6 }}>{o.tag}</small>}</span><small>{o.sub}</small>
            </button>
          ))}
          <label htmlFor="c4">Materi hari ini</label>
          <input id="c4" placeholder="mis. Pecahan campuran, latihan 10 soal" value={f.materi} onChange={(e) => setF({ ...f, materi: e.target.value })} />
          <label htmlFor="c5">Catatan perkembangan</label>
          <textarea id="c5" rows={3} placeholder="mis. Udah lancar, minggu depan lanjut bab baru" value={f.catatan} onChange={(e) => setF({ ...f, catatan: e.target.value })} />
          {err && <div className="err" role="alert">{err}</div>}
        </div>
        <div className="mfoot">
          <button className="btn full" style={{ margin: 0 }} disabled={busy} onClick={simpan}>{busy ? "Menyimpan…" : "Simpan"}</button>
          {sesi.outcome && <button className="btn ghost full" style={{ marginTop: 8 }} onClick={batalkan}>Batalkan catatan</button>}
        </div>
      </div>
    </div>
  );
}

export function PindahModal({ mode, kandidat = [], makeup, tutorNama, mapel, onClose, onSaved }: {
  mode: "pindah" | "pengganti"; kandidat?: SesiX[]; makeup?: Makeup; tutorNama: string; mapel: string; onClose: () => void; onSaved: () => void;
}) {
  const [sel, setSel] = useState(kandidat[0]?.id ?? "");
  const awal = kandidat[0];
  const [f, setF] = useState({ date: awal?.date ?? new Date().toLocaleDateString("sv-SE"), start: awal ? hhmm(awal.time) : "15:30", end: awal?.end_time ? hhmm(awal.end_time) : "17:00" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pilihSesi = (id: string) => { setSel(id); const k = kandidat.find((x) => x.id === id); if (k) setF({ date: k.date, start: hhmm(k.time), end: k.end_time ? hhmm(k.end_time) : f.end }); };
  const tutorId = makeup?.tutor_id ?? kandidat.find((x) => x.id === sel)?.tutor_id ?? "";

  async function simpan() {
    setErr("");
    if (!f.date || !f.start || !f.end || f.end <= f.start) return setErr("Isi tanggal dan jam dengan benar (jam selesai harus lebih besar).");
    if (mode === "pindah" && !sel) return setErr("Tidak ada jadwal yang bisa dipindah.");
    setBusy(true);
    const { data: ada } = await supabase.from("sessions").select("id,time,end_time").eq("tutor_id", tutorId).eq("date", f.date);
    const bentrok = (ada ?? []).filter((a: { id: string; time: string; end_time: string | null }) => a.id !== sel && mnt(f.start) < (a.end_time ? mnt(a.end_time) : mnt(a.time) + 60) && mnt(a.time) < mnt(f.end)).length;
    if (bentrok > 0 && !confirm(`${tutorNama} sudah punya ${bentrok} sesi yang bentrok di jam itu. Tetap simpan?`)) return setBusy(false);
    if (mode === "pindah") {
      const { error } = await supabase.from("sessions").update({ date: f.date, time: f.start, end_time: f.end }).eq("id", sel);
      if (error) { setBusy(false); return setErr(error.message); }
    } else if (makeup) {
      const { error } = await supabase.from("sessions").insert({ student_id: makeup.student_id, tutor_id: makeup.tutor_id, lesson_id: makeup.lesson_id, date: f.date, time: f.start, end_time: f.end });
      if (error) { setBusy(false); return setErr(error.message); }
      await supabase.from("makeups").update({ done: true }).eq("id", makeup.id);
    }
    setBusy(false);
    onSaved();
  }
  const dur = f.end > f.start ? mnt(f.end) - mnt(f.start) : 0;

  return (
    <div className="ov" onClick={onClose}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="pj" onClick={(e) => e.stopPropagation()}>
        <div className="row"><h2 id="pj" className="grow" style={{ margin: 0 }}>{mode === "pindah" ? "Pindah jadwal" : "Jadwalkan pengganti"}</h2><button className="btn ghost sm" aria-label="Tutup" onClick={onClose}>✕</button></div>
        <p className="meta" style={{ marginTop: 10 }}>{mapel} · {tutorNama}</p>
        {mode === "pindah" && (kandidat.length === 0 ? <p className="meta">Tidak ada jadwal mendatang yang belum dicatat.</p> : (
          <><label htmlFor="p1">Jadwal rutin yang dipindah</label>
            <select id="p1" value={sel} onChange={(e) => pilihSesi(e.target.value)}>{kandidat.map((k) => <option key={k.id} value={k.id}>{new Date(k.date + "T00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {hhmm(k.time)}</option>)}</select></>
        ))}
        {mode === "pengganti" && makeup && <p className="hint">Pengganti sebaiknya sebelum {new Date(makeup.due_date + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long" })}.</p>}
        <label>{mode === "pindah" ? "Pindah ke tanggal & rentang jam" : "Tanggal & rentang jam"}</label>
        <div className="three">
          <div><input aria-label="Tanggal" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div><input aria-label="Jam mulai" type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
          <div><input aria-label="Jam selesai" type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
        </div>
        {dur > 0 && <p className="hint">Rentang waktu: {f.start} – {f.end} ({dur} mnt). Dicek terhadap jadwal tentor.</p>}
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn full" disabled={busy || (mode === "pindah" && kandidat.length === 0)} onClick={simpan}>{busy ? "Menyimpan…" : "Simpan jadwal"}</button>
      </div>
    </div>
  );
}