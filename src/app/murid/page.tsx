"use client";
import { useState } from "react";
import Shell from "@/components/Shell";
import { supabase, useQuery, sisa, Student } from "@/lib/db";

const kosong = { name: "", parent_name: "", phone: "", package_name: "", quota_total: 8, price: 600000 };

export default function Murid() {
  const { rows, loading, reload } = useQuery<Student>(() => supabase.from("students").select("*").order("name"), []);
  const [f, setF] = useState(kosong);

  async function simpan() {
    if (!f.name.trim() || !f.phone.trim() || !f.package_name.trim() || f.quota_total < 1) return alert("Isi nama murid, nomor WhatsApp, paket, dan jumlah pertemuan.");
    const { error } = await supabase.from("students").insert({ ...f, name: f.name.trim() });
    if (error) return alert(error.message);
    setF(kosong); reload();
  }
  async function hapus(s: Student) { if (confirm(`Hapus ${s.name} beserta jadwalnya?`)) { await supabase.from("students").delete().eq("id", s.id); reload(); } }

  return (
    <Shell>
      <h1>Murid</h1>
      <p className="sub">{rows.length} murid terdaftar</p>
      {loading ? <p className="empty">Memuat…</p> : rows.length === 0 ? <div className="card empty">Belum ada murid. Tambah murid pertama di bawah.</div> :
        rows.map((s) => (
          <div className="card" key={s.id}>
            <div className="row"><div className="grow"><div className="name">{s.name}</div><div className="meta">{s.package_name} · {s.parent_name || "Orang tua"}</div></div>
              <span className={`pill ${sisa(s) <= 0 ? "bad" : sisa(s) <= 2 ? "warn" : "ok"}`}>Sisa {sisa(s)}</span></div>
            <div className={`bar${sisa(s) <= 1 ? " low" : ""}`}><i style={{ width: `${Math.min(100, (s.quota_used / s.quota_total) * 100)}%` }} /></div>
            <div className="row" style={{ marginTop: 8 }}><span className="meta grow">{s.quota_used} dari {s.quota_total} pertemuan terpakai</span><button className="btn ghost sm" onClick={() => hapus(s)}>Hapus</button></div>
          </div>
        ))}
      <h2>Tambah murid</h2>
      <div className="card">
        <label htmlFor="n">Nama murid</label><input id="n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <label htmlFor="p">Nama orang tua</label><input id="p" value={f.parent_name} onChange={(e) => setF({ ...f, parent_name: e.target.value })} />
        <label htmlFor="w">Nomor WhatsApp orang tua</label><input id="w" inputMode="tel" placeholder="08xxxxxxxxxx" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <label htmlFor="k">Paket</label><input id="k" placeholder="Contoh: Matematika SD" value={f.package_name} onChange={(e) => setF({ ...f, package_name: e.target.value })} />
        <label htmlFor="t">Jumlah pertemuan</label><input id="t" type="number" min={1} value={f.quota_total} onChange={(e) => setF({ ...f, quota_total: +e.target.value })} />
        <label htmlFor="h">Harga paket (Rp)</label><input id="h" type="number" min={0} value={f.price} onChange={(e) => setF({ ...f, price: +e.target.value })} />
        <button className="btn full" onClick={simpan}>Simpan murid</button>
      </div>
    </Shell>
  );
}