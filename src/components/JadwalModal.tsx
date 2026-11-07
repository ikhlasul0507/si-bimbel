"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase, rp, Student, Tutor, Slot } from "@/lib/db";

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const PAKET_HARI: [string, string[]][] = [
  ["Sen & Kam", ["Senin", "Kamis"]], ["Sel & Jum", ["Selasa", "Jumat"]], ["Rab & Sab", ["Rabu", "Sabtu"]],
  ["Sen, Rab, Jum", ["Senin", "Rabu", "Jumat"]], ["Sen–Jum (5×)", ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]],
];
const DURASI = [45, 60, 75, 90, 120, 150, 180];

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toHm = (n: number) => { const x = Math.min(Math.max(n, 0), 1439); return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };
const shift = (d: string, n: number) => { const x = new Date(d + "T00:00"); x.setDate(x.getDate() + n); return x.toLocaleDateString("sv-SE"); };
const ribu = (n: number) => (n ? n.toLocaleString("id-ID") : "");
const cocok = (t: Tutor, slots: Slot[]) => { const a = t.availability ?? []; return slots.every((s) => a.some((x) => x.day === s.day && x.start <= s.start && x.end >= s.end)); };

function buatSesi(slots: Slot[], mulai: string, jumlah: number) {
  const out: { date: string; start: string; end: string }[] = [];
  let d = mulai;
  for (let i = 0; i < 500 && out.length < jumlah; i++) {
    const hari = NAMA_HARI[new Date(d + "T00:00").getDay()];
    for (const s of slots.filter((x) => x.day === hari).sort((a, b) => a.start.localeCompare(b.start))) {
      if (out.length < jumlah) out.push({ date: d, start: s.start, end: s.end });
    }
    d = shift(d, 1);
  }
  return out;
}

export default function JadwalModal({ students, tutors, date, tid, muridId, onClose, onSaved }: {
  students: Student[]; tutors: Tutor[]; date: string; tid: string; muridId?: string; onClose: () => void; onSaved: (d: string) => void;
}) {
  const [sid, setSid] = useState(muridId ?? "");
  const [mapel, setMapel] = useState("");
  const [jenis, setJenis] = useState("privat");
  const [tutorId, setTutorId] = useState(tid);
  const [cari, setCari] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([{ day: "Senin", start: "15:30", end: "17:00" }]);
  const [jumlah, setJumlah] = useState(8);
  const [harga, setHarga] = useState(students.find((s) => s.id === muridId)?.price ?? 0);
  const [honor, setHonor] = useState<number | "">("");
  const [mulai, setMulai] = useState(date);
  const [status, setStatus] = useState("aktif");
  const [paket, setPaket] = useState<"tagihan" | "lunas" | "ada">("tagihan");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const aktif = tutors.filter((t) => t.active !== false || t.id === tutorId);
  const daftar = cari ? aktif.filter((t) => cocok(t, slots) || t.id === tutorId) : aktif;
  const tutor = tutors.find((t) => t.id === tutorId);
  const luar = tutor && (tutor.availability ?? []).length > 0 ? slots.filter((s) => !cocok(tutor, [s])) : [];
  const saran = (tutor?.subjects ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const honorBawaan = tutor ? (tutor.pay_scheme === "bagi_hasil" ? `bagi hasil, lembaga ${tutor.cut_percent ?? 0}%` : rp(tutor.rate)) : "";
  const kosong = students.length === 0 || tutors.length === 0;

  const setSlot = (i: number, p: Partial<Slot>) => setSlots(slots.map((s, k) => (k === i ? { ...s, ...p } : s)));
  const pakaiHari = (days: string[]) => { const b = slots[0] ?? { start: "15:30", end: "17:00" }; setSlots(days.map((day) => ({ day, start: b.start, end: b.end }))); };
  const gagal = (m: string) => { setBusy(false); setErr(/lesson|end_time/.test(m) ? "Tabel atau kolom baru belum ada di Supabase. Jalankan SQL langkah 1 dulu." : m); };

  async function simpan() {
    setErr("");
    if (!sid) return setErr("Pilih murid dulu.");
    if (!mapel.trim()) return setErr("Isi mapel.");
    if (!tutorId) return setErr("Pilih tentor pengajar.");
    if (slots.length === 0) return setErr("Tambahkan minimal satu hari mengajar.");
    const salah = slots.find((s) => !s.start || !s.end || s.end <= s.start);
    if (salah) return setErr(`Jam selesai harus lebih besar dari jam mulai (${salah.day}).`);
    if (jumlah < 1 || jumlah > 100) return setErr("Jumlah pertemuan harus antara 1 sampai 100.");
    const murid = students.find((s) => s.id === sid);
    setBusy(true);

    const sesi = buatSesi(slots, mulai, jumlah);
    if (status === "aktif" && sesi.length > 0) {
      const { data: ada } = await supabase.from("sessions").select("date,time,end_time").eq("tutor_id", tutorId).gte("date", sesi[0].date).lte("date", sesi[sesi.length - 1].date);
      const bentrok = sesi.filter((n) => (ada ?? []).some((a: { date: string; time: string; end_time: string | null }) =>
        a.date === n.date && toMin(n.start) < (a.end_time ? toMin(a.end_time) : toMin(a.time) + 60) && toMin(a.time) < toMin(n.end))).length;
      if (bentrok > 0 && !confirm(`${tutor?.name} sudah punya ${bentrok} sesi yang bentrok dengan jadwal ini. Tetap simpan?`)) return setBusy(false);
    }
    if (paket !== "ada" && murid && murid.quota_used > 0 && murid.quota_used < murid.quota_total &&
      !confirm(`${murid.name} masih punya sisa ${murid.quota_total - murid.quota_used} pertemuan di paket lama. Ganti dengan paket baru?`)) return setBusy(false);

    const { data: les, error: e1 } = await supabase.from("lessons").insert({
      student_id: sid, tutor_id: tutorId, subject: mapel.trim(), class_type: jenis, slots, quota_per_package: jumlah,
      price: harga, tutor_rate: honor === "" ? null : honor, start_date: mulai, status,
    }).select("id").single();
    if (e1 || !les) return gagal(e1?.message ?? "Gagal menyimpan jadwal les.");

    if (status === "aktif") {
      const { error: e2 } = await supabase.from("sessions").insert(sesi.map((n) => ({ student_id: sid, tutor_id: tutorId, date: n.date, time: n.start, end_time: n.end, lesson_id: les.id })));
      if (e2) { await supabase.from("lessons").delete().eq("id", les.id); return gagal(e2.message); }
    }
    if (paket !== "ada") {
      const { error: e3 } = await supabase.from("students").update({ package_name: mapel.trim(), quota_total: jumlah, quota_used: 0, price: harga, paid: paket === "lunas" }).eq("id", sid);
      if (e3) return gagal(e3.message);
    }
    setBusy(false);
    onSaved(mulai);
  }

  return (
    <div className="ov" onClick={onClose}>
      <div className="dlg full" role="dialog" aria-modal="true" aria-labelledby="jl" onClick={(e) => e.stopPropagation()}>
        <div className="mhead"><h2 id="jl">Tambah jadwal les</h2><button className="btn ghost sm" aria-label="Tutup" onClick={onClose}>✕</button></div>
        <div className="mbody">
          {kosong ? (
            <p className="meta">Tambahkan dulu data <Link href="/murid"><b>murid</b></Link> dan <Link href="/tentor"><b>tentor</b></Link>, baru jadwal bisa dibuat.</p>
          ) : (
            <>
              <div className="grp">
                <div className="gtop"><span>Murid yang diajar</span><Link href="/murid">+ Buat murid baru</Link></div>
                <select aria-label="Murid" value={sid} onChange={(e) => { setSid(e.target.value); const m = students.find((s) => s.id === e.target.value); if (m && harga === 0) setHarga(m.price); }}>
                  <option value="">Pilih murid</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="two">
                <div><label htmlFor="jl1">Mapel</label><input id="jl1" list="mapelList" value={mapel} onChange={(e) => setMapel(e.target.value)} placeholder="Matematika SD" /><datalist id="mapelList">{saran.map((s) => <option key={s} value={s} />)}</datalist></div>
                <div><label htmlFor="jl2">Jenis kelas</label><select id="jl2" value={jenis} onChange={(e) => setJenis(e.target.value)}><option value="privat">Privat (1 Murid)</option><option value="kelompok">Kelompok</option></select></div>
              </div>

              <div className="grp" style={{ marginTop: 14 }}>
                <div className="gtop"><span>Tentor pengajar</span><Link href="/tentor">+ Buat tentor baru</Link></div>
                <div className="searchrow">
                  <select aria-label="Tentor" value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
                    <option value="">Pilih tentor</option>{daftar.map((t) => <option key={t.id} value={t.id}>{t.name}{t.subjects ? ` (${t.subjects})` : ""}</option>)}
                  </select>
                  <button type="button" className="iconbtn" aria-pressed={cari} aria-label="Tampilkan hanya tentor yang jamnya cocok" onClick={() => setCari(!cari)}>🔍</button>
                </div>
                {cari && <p className="hint">Hanya tentor yang rentang jamnya cocok dengan jadwal di bawah ({daftar.length}).</p>}
                {tutor && <p className="hint">{(tutor.availability ?? []).length > 0 ? <>Jam bisa {tutor.name}: <b>{(tutor.availability ?? []).map((a) => `${a.day.slice(0, 3)} ${a.start}–${a.end}`).join(" · ")}</b></> : `Jam bisa ngajar ${tutor.name} belum diisi.`}</p>}
              </div>

              <div className="grp">
                <div className="gtop"><span>Jadwal &amp; rentang jam mengajar ({slots.length}×/minggu)</span></div>
                <div className="chips" style={{ alignItems: "center" }}><span className="hint" style={{ margin: 0 }}>Paket hari:</span>{PAKET_HARI.map(([l, d]) => <button type="button" className="chip" key={l} onClick={() => pakaiHari(d)}>{l}</button>)}</div>
                {slots.map((s, i) => {
                  const dur = toMin(s.end) - toMin(s.start);
                  return (
                    <div className="sesi" key={i}>
                      <div className="cap">Sesi #{i + 1} · {s.day} ({s.start} – {s.end}{dur > 0 ? ` · ${dur} mnt` : ""}){slots.length > 1 && <button type="button" className="linkbtn" style={{ float: "right" }} onClick={() => setSlots(slots.filter((_, k) => k !== i))}>Hapus</button>}</div>
                      <div className="tri">
                        <div><label>Hari</label><select value={s.day} onChange={(e) => setSlot(i, { day: e.target.value })}>{HARI.map((h) => <option key={h}>{h}</option>)}</select></div>
                        <div><label>Jam mulai</label><input type="time" value={s.start} onChange={(e) => setSlot(i, { start: e.target.value, end: dur > 0 ? toHm(toMin(e.target.value) + dur) : s.end })} /></div>
                        <span className="sd">s/d</span>
                        <div><label>Jam selesai</label><input type="time" value={s.end} onChange={(e) => setSlot(i, { end: e.target.value })} /></div>
                      </div>
                      <div className="durs">Durasi cepat:{DURASI.map((d) => <button type="button" className="dur" key={d} aria-pressed={dur === d} onClick={() => setSlot(i, { end: toHm(toMin(s.start) + d) })}>{d} mnt</button>)}</div>
                    </div>
                  );
                })}
                <button type="button" className="dashed" onClick={() => setSlots([...slots, { day: "Senin", start: "15:30", end: "17:00" }])}>+ Tambah hari / rentang jam mengajar</button>
                {luar.length > 0 && <div className="warnbox">Di luar jam bisa ngajar {tutor?.name}: {luar.map((s) => `${s.day} ${s.start}–${s.end}`).join(", ")}. Jadwal tetap bisa disimpan.</div>}
              </div>

              <label htmlFor="jl3">Cara bayar</label>
              <select id="jl3" value="paket" onChange={() => {}}><option value="paket">Paket pertemuan</option></select>
              <div className="two">
                <div><label htmlFor="jl4">Jumlah pertemuan / paket</label><input id="jl4" type="number" min={1} max={100} value={jumlah} onChange={(e) => setJumlah(+e.target.value)} /></div>
                <div><label htmlFor="jl5">Harga paket</label><input id="jl5" inputMode="numeric" placeholder="0" value={ribu(harga)} onChange={(e) => setHarga(Number(e.target.value.replace(/\D/g, "")))} /></div>
              </div>
              <label htmlFor="jl6">Honor tentor per pertemuan (khusus les ini)</label>
              <input id="jl6" inputMode="numeric" value={honor === "" ? "" : ribu(honor)} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setHonor(v === "" ? "" : Number(v)); }} />
              {tutor && <p className="hint">Kosong = pakai honor {tutor.name}: {honorBawaan}</p>}
              <div className="two">
                <div><label htmlFor="jl7">Mulai</label><input id="jl7" type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} /></div>
                <div><label htmlFor="jl8">Status</label><select id="jl8" value={status} onChange={(e) => setStatus(e.target.value)}><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></div>
              </div>
              <label htmlFor="jl9">Paket pertama</label>
              <select id="jl9" value={paket} onChange={(e) => setPaket(e.target.value as "tagihan" | "lunas" | "ada")}>
                <option value="tagihan">Buat tagihan (belum bayar)</option>
                <option value="lunas">Buat tagihan (sudah dibayar)</option>
                <option value="ada">Pakai paket murid yang sekarang</option>
              </select>
              {err && <div className="err" role="alert">{err}</div>}
            </>
          )}
        </div>
        {!kosong && <div className="mfoot"><button className="btn full" style={{ margin: 0 }} disabled={busy} onClick={simpan}>{busy ? "Menyimpan…" : "Simpan jadwal les"}</button></div>}
      </div>
    </div>
  );
}