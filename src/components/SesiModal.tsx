"use client";
import { useState } from "react";
import { supabase, Student, Session } from "@/lib/db";

export default function SesiModal({ students, tutorId, sesi, tanggal, onClose, onSaved }: {
  students: Student[]; tutorId: string; sesi: Session | null; tanggal: string; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({ sid: sesi?.student_id ?? "", date: sesi?.date ?? tanggal, time: sesi ? sesi.time.slice(0, 5) : "14:00" });
  const [busy, setBusy] = useState(false);

  async function simpan() {
    if (!f.sid) return alert("Pilih murid dulu.");
    setBusy(true);
    const data = { student_id: f.sid, tutor_id: tutorId, date: f.date, time: f.time };
    const { error } = sesi ? await supabase.from("sessions").update(data).eq("id", sesi.id) : await supabase.from("sessions").insert(data);
    setBusy(false);
    if (error) return alert(error.message);
    onSaved();
  }
  async function hapus() {
    if (!sesi || !confirm("Hapus jadwal ini?")) return;
    await supabase.from("sessions").delete().eq("id", sesi.id);
    onSaved();
  }

  return (
    <div className="ov" onClick={onClose}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="sm" onClick={(e) => e.stopPropagation()}>
        <div className="row"><h2 id="sm" className="grow" style={{ margin: 0 }}>{sesi ? "Ubah jadwal" : "Tambah jadwal"}</h2><button className="btn ghost sm" aria-label="Tutup" onClick={onClose}>✕</button></div>
        {students.length === 0 ? <p className="meta" style={{ marginTop: 14 }}>Tambahkan dulu data murid di menu Murid.</p> : (
          <>
            <label htmlFor="sm1">Murid</label>
            <select id="sm1" value={f.sid} onChange={(e) => setF({ ...f, sid: e.target.value })}><option value="">Pilih murid</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.package_name}</option>)}</select>
            <div className="two">
              <div><label htmlFor="sm2">Tanggal</label><input id="sm2" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
              <div><label htmlFor="sm3">Jam</label><input id="sm3" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
            </div>
            <button className="btn full" disabled={busy} onClick={simpan}>{busy ? "Menyimpan…" : "Simpan"}</button>
            {sesi && <button className="btn ghost full" style={{ marginTop: 8 }} onClick={hapus}>Hapus jadwal ini</button>}
          </>
        )}
      </div>
    </div>
  );
}