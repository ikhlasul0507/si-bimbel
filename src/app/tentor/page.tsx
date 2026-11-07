"use client";
import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import TentorForm from "@/components/TentorForm";
import { supabase, useQuery, rp, Tutor } from "@/lib/db";

const initials = (n: string) => n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function TentorPage() {
  const { rows, loading, reload } = useQuery<Tutor>(() => supabase.from("tutors").select("*").order("name"), []);
  const [baru, setBaru] = useState(false);
  const skema = (t: Tutor) => (t.pay_scheme === "bagi_hasil" ? `Bagi hasil · potongan lembaga ${t.cut_percent ?? 0}%` : `${rp(t.rate)} per pertemuan`);

  return (
    <Shell>
      <div className="head">
        <div><h1>Tentor</h1><p className="sub">{rows.length} tentor terdaftar. Klik tentor untuk lihat detail.</p></div>
        <button className="btn" onClick={() => setBaru(true)}>+ Tentor baru</button>
      </div>
      {loading ? <p className="empty">Memuat…</p> : rows.length === 0 ? (
        <div className="card empty"><b>Belum ada tentor</b><p className="meta">Tambah tentor pertama untuk mulai membuat jadwal.</p><button className="btn" onClick={() => setBaru(true)}>+ Tentor baru</button></div>
      ) : rows.map((t) => (
        <Link href={`/tentor/${t.id}`} className="card row link" key={t.id}>
          <span className="avatar">{initials(t.name)}</span>
          <div className="grow"><div className="name">{t.name}</div><div className="meta">{[t.area, t.subjects].filter(Boolean).join(" · ") || "Area dan mapel belum diisi"}</div><div className="meta">{skema(t)}</div></div>
          <span className={`pill ${t.active === false ? "bad" : "ok"}`}>{t.active === false ? "Nonaktif" : "Aktif"}</span>
          <span className="meta">›</span>
        </Link>
      ))}
      {baru && <TentorForm awal={null} onClose={() => setBaru(false)} onSaved={() => { setBaru(false); reload(); }} />}
    </Shell>
  );
}