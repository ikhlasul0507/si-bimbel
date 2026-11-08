"use client";
import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import TentorForm from "@/components/TentorForm";
import { supabase, useQuery, rp, localDate, Tutor } from "@/lib/db";
import { SesiX, batasBulan } from "@/lib/app";

const initials = (n: string) => n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function TentorPage() {
  const { dari, sampai } = batasBulan(localDate().slice(0, 7));
  const { rows, loading, reload } = useQuery<Tutor>(() => supabase.from("tutors").select("*").order("name"), []);
  const le = useQuery<{ tutor_id: string; student_id: string }>(() => supabase.from("lessons").select("tutor_id,student_id").eq("status", "aktif"), []);
  const se = useQuery<SesiX>(() => supabase.from("sessions").select("tutor_id,honor_amount").not("outcome", "is", null).gte("date", dari).lt("date", sampai), []);
  const [baru, setBaru] = useState(false);
  const jmlMurid = (id: string) => new Set(le.rows.filter((l) => l.tutor_id === id).map((l) => l.student_id)).size;
  const honor = (id: string) => se.rows.filter((x) => x.tutor_id === id).reduce((a, x) => a + (x.honor_amount ?? 0), 0);

  return (
    <Shell>
      <div className="head">
        <div><h1>Tentor</h1><p className="sub">{rows.filter((t) => t.active !== false).length} aktif</p></div>
        <button className="btn" onClick={() => setBaru(true)}>+ Tentor</button>
      </div>
      {loading ? <p className="empty">Memuat…</p> : rows.length === 0 ? (
        <div className="card empty"><b>Belum ada tentor</b><p className="meta">Tambah tentor pertama untuk mulai membuat jadwal.</p><button className="btn" onClick={() => setBaru(true)}>+ Tentor</button></div>
      ) : rows.map((t) => (
        <Link href={`/tentor/${t.id}`} className="card row link" key={t.id}>
          <span className="avatar">{initials(t.name)}</span>
          <div className="grow"><div className="name">{t.name}{t.active === false && <span className="pill bad" style={{ marginLeft: 8 }}>Nonaktif</span>}</div><div className="meta">{[t.subjects, `${jmlMurid(t.id)} murid`].filter(Boolean).join(" · ")}</div></div>
          <div style={{ textAlign: "right" }}><span className="meta">bulan ini</span><div><b>{rp(honor(t.id))}</b></div></div>
          <span className="meta">›</span>
        </Link>
      ))}
      {baru && <TentorForm awal={null} onClose={() => setBaru(false)} onSaved={() => { setBaru(false); reload(); }} />}
    </Shell>
  );
}