"use client";
import { useState } from "react";
import { supabase, localDate, Student } from "@/lib/db";

export type MuridX = Student & {
  student_phone?: string | null; address?: string | null; maps_url?: string | null; area?: string | null; grade?: string | null;
  status?: "aktif" | "trial" | "arsip"; start_date?: string | null; tutor_note?: string | null; owner_note?: string | null;
};

export default function MuridForm({ awal, onClose, onSaved }: { awal: MuridX | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: awal?.name ?? "", parent_name: awal?.parent_name ?? "", phone: awal?.phone ?? "", student_phone: awal?.student_phone ?? "",
    address: awal?.address ?? "", maps_url: awal?.maps_url ?? "", area: awal?.area ?? "", grade: awal?.grade ?? "",
    status: awal?.status ?? "aktif", start_date: awal?.start_date ?? localDate(), tutor_note: awal?.tutor_note ?? "", owner_note: awal?.owner_note ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function simpan() {
    setErr("");
    if (!f.name.trim()) return setErr("Isi nama murid.");
    setBusy(true);
    const data = {
      name: f.name.trim(), parent_name: f.parent_name.trim() || null, phone: f.phone.trim(), student_phone: f.student_phone.trim() || null,
      address: f.address.trim() || null, maps_url: f.maps_url.trim() || null, area: f.area.trim() || null, grade: f.grade.trim() || null,
      status: f.status, start_date: f.start_date || null, tutor_note: f.tutor_note.trim() || null, owner_note: f.owner_note.trim() || null,
    };
    const { error } = awal ? await supabase.from("students").update(data).eq("id", awal.id) : await supabase.from("students").insert({ ...data, paid: true });
    setBusy(false);
    if (error) return setErr(error.message.includes("column") ? "Kolom baru belum ada di Supabase. Jalankan SQL langkah 1 dulu." : error.message);
    onSaved();
  }

  return (
    <div className="ov" onClick={onClose}>
      <div className="dlg full" role="dialog" aria-modal="true" aria-labelledby="mf" onClick={(e) => e.stopPropagation()}>
        <div className="mhead"><h2 id="mf">{awal ? "Ubah murid" : "Murid baru"}</h2><button className="btn ghost sm" aria-label="Tutup" onClick={onClose}>✕</button></div>
        <div className="mbody">
          <label htmlFor="m1" style={{ marginTop: 0 }}>Nama murid</label>
          <input id="m1" placeholder="mis. Naura Azzahra" value={f.name} onChange={set("name")} />
          <div className="two">
            <div><label htmlFor="m2">Nama ortu</label><input id="m2" placeholder="Bu Dewi" value={f.parent_name} onChange={set("parent_name")} /></div>
            <div><label htmlFor="m3">WA ortu</label><input id="m3" inputMode="tel" placeholder="0812…" value={f.phone} onChange={set("phone")} /></div>
          </div>
          <label htmlFor="m4">WA murid (opsional)</label>
          <input id="m4" inputMode="tel" placeholder="0857…" value={f.student_phone} onChange={set("student_phone")} />
          <p className="hint">Buat kirim latihan soal dan nilai langsung ke murid. Kosongkan untuk murid kecil.</p>
          <label htmlFor="m5">Alamat (buat tentor datang)</label>
          <textarea id="m5" rows={3} placeholder="Jl. Melati No. 12, Antapani" value={f.address} onChange={set("address")} />
          <label htmlFor="m6">Link Google Maps (opsional)</label>
          <input id="m6" placeholder="https://maps.app.goo.gl/…" value={f.maps_url} onChange={set("maps_url")} />
          <p className="hint">Kosong = otomatis cari dari alamat.</p>
          <div className="two">
            <div><label htmlFor="m7">Area</label><input id="m7" placeholder="Antapani" value={f.area} onChange={set("area")} /></div>
            <div><label htmlFor="m8">Kelas / jenjang</label><input id="m8" placeholder="SD kelas 4" value={f.grade} onChange={set("grade")} /></div>
          </div>
          <div className="two">
            <div><label htmlFor="m9">Status</label><select id="m9" value={f.status} onChange={set("status")}><option value="aktif">Aktif</option><option value="trial">Trial</option><option value="arsip">Arsip</option></select></div>
            <div><label htmlFor="m10">Mulai les</label><input id="m10" type="date" value={f.start_date} onChange={set("start_date")} /></div>
          </div>
          <label htmlFor="m11">Catatan buat tentor</label>
          <input id="m11" placeholder="mis. Pagar hijau, bel di kiri" value={f.tutor_note} onChange={set("tutor_note")} />
          <label htmlFor="m12">Catatan pribadi owner</label>
          <input id="m12" placeholder="mis. Bayar biasanya tgl 5" value={f.owner_note} onChange={set("owner_note")} />
          <p className="hint">Nggak keliatan tentor.</p>
          {err && <div className="err" role="alert">{err}</div>}
        </div>
        <div className="mfoot"><button className="btn full" style={{ margin: 0 }} disabled={busy} onClick={simpan}>{busy ? "Menyimpan…" : "Simpan"}</button></div>
      </div>
    </div>
  );
}