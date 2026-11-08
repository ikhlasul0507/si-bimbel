"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/db";
import { usePengaturan } from "@/lib/app";

export default function Pengaturan() {
  const { p, reload } = usePengaturan();
  const [f, setF] = useState(p);
  const [msg, setMsg] = useState("");
  useEffect(() => setF(p), [p]);

  async function simpan() {
    setMsg("");
    const ada = await supabase.from("settings").select("owner_id").maybeSingle();
    const data = { inst_name: f.inst_name.trim() || "Si-Bimbel", inst_tagline: f.inst_tagline.trim(), bank_info: f.bank_info.trim() };
    const { error } = ada.data ? await supabase.from("settings").update(data).eq("owner_id", ada.data.owner_id) : await supabase.from("settings").insert(data);
    setMsg(error ? (/settings|relation/.test(error.message) ? "Tabel baru belum ada di Supabase. Jalankan SQL dulu." : error.message) : "Tersimpan.");
    reload();
  }
  return (
    <Shell>
      <h1>Branding & pembayaran</h1>
      <p className="sub">Dipakai di pesan WA tagihan, rapor, dan halaman portal ortu.</p>
      <div className="card">
        <label htmlFor="s1" style={{ marginTop: 0 }}>Nama lembaga</label><input id="s1" value={f.inst_name} onChange={(e) => setF({ ...f, inst_name: e.target.value })} />
        <label htmlFor="s2">Keterangan singkat (nama lengkap atau kota)</label><input id="s2" placeholder="Bimbel Sahabat Ilmu, Kayuagung" value={f.inst_tagline} onChange={(e) => setF({ ...f, inst_tagline: e.target.value })} />
        <label htmlFor="s3">Info rekening pembayaran</label>
        <textarea id="s3" rows={6} placeholder={"BSI 1234567890\nBank Sumsel 1234567890\nDANA 0812xxxxxxx\n\nSemua atas nama: Nama Pemilik"} value={f.bank_info} onChange={(e) => setF({ ...f, bank_info: e.target.value })} />
        <p className="hint">Ditulis apa adanya di pesan tagihan dan tombol Bayar di portal.</p>
        {msg && <div className={msg === "Tersimpan." ? "ok" : "err"} role="status" style={{ marginTop: 12 }}>{msg}</div>}
        <button className="btn full" onClick={simpan}>Simpan</button>
      </div>
    </Shell>
  );
}