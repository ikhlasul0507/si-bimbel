"use client";
import { useState } from "react";
import Shell from "@/components/Shell";
import { supabase, useQuery, rp, Tutor } from "@/lib/db";

export default function TentorPage() {
  const { rows, loading, reload } = useQuery<Tutor>(() => supabase.from("tutors").select("*").order("name"), []);
  const [f, setF] = useState({ name: "", phone: "", rate: 45000 });

  async function simpan() {
    if (!f.name.trim()) return alert("Isi nama tentor.");
    const { error } = await supabase.from("tutors").insert({ ...f, name: f.name.trim() });
    if (error) return alert(error.message);
    setF({ name: "", phone: "", rate: 45000 }); reload();
  }
  async function hapus(t: Tutor) { if (confirm(`Hapus ${t.name}? Jadwalnya ikut terhapus.`)) { await supabase.from("tutors").delete().eq("id", t.id); reload(); } }

  return (
    <Shell>
      <h1>Tentor</h1>
      <p className="sub">Honor dihitung dari tarif per pertemuan.</p>
      {loading ? <p className="empty">Memuat…</p> : rows.length === 0 ? <div className="card empty">Belum ada tentor. Tambah tentor pertama di bawah.</div> :
        rows.map((t) => (
          <div className="card row" key={t.id}>
            <div className="grow"><div className="name">{t.name}</div><div className="meta">{t.phone || "Tanpa nomor"} · {rp(t.rate)} per pertemuan</div></div>
            <button className="btn ghost sm" onClick={() => hapus(t)}>Hapus</button>
          </div>
        ))}
      <h2>Tambah tentor</h2>
      <div className="card">
        <label htmlFor="n">Nama tentor</label><input id="n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <label htmlFor="p">Nomor WhatsApp</label><input id="p" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <label htmlFor="r">Honor per pertemuan (Rp)</label><input id="r" type="number" min={0} value={f.rate} onChange={(e) => setF({ ...f, rate: +e.target.value })} />
        <button className="btn full" onClick={simpan}>Simpan tentor</button>
      </div>
    </Shell>
  );
}