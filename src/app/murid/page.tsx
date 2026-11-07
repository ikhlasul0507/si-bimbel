"use client";
import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import MuridForm, { MuridX } from "@/components/MuridForm";
import { supabase, useQuery, rp, sisa, Tutor } from "@/lib/db";

type Les = { id: string; student_id: string; tutor_id: string; subject: string };
const TABS = [["aktif", "Aktif"], ["trial", "Trial"], ["arsip", "Arsip"], ["semua", "Semua"]] as const;

export default function Murid() {
  const mu = useQuery<MuridX>(() => supabase.from("students").select("*").order("name"), []);
  const tu = useQuery<Tutor>(() => supabase.from("tutors").select("*"), []);
  const le = useQuery<Les>(() => supabase.from("lessons").select("id,student_id,tutor_id,subject").eq("status", "aktif"), []);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("aktif");
  const [q, setQ] = useState("");
  const [baru, setBaru] = useState(false);

  const status = (m: MuridX) => m.status ?? "aktif";
  const hitung = (k: string) => (k === "semua" ? mu.rows.length : mu.rows.filter((m) => status(m) === k).length);
  const lesOf = (m: MuridX) => le.rows.filter((l) => l.student_id === m.id);
  const tutorNama = (id: string) => tu.rows.find((t) => t.id === id)?.name ?? "";
  const cari = q.trim().toLowerCase();
  const daftar = mu.rows.filter((m) => (tab === "semua" || status(m) === tab) &&
    (!cari || [m.name, m.parent_name ?? "", ...lesOf(m).flatMap((l) => [l.subject, tutorNama(l.tutor_id)])].join(" ").toLowerCase().includes(cari)));

  return (
    <Shell>
      <div className="head">
        <div><h1>Murid</h1><p className="sub">{hitung("aktif")} aktif</p></div>
        <button className="btn" onClick={() => setBaru(true)}>+ Murid</button>
      </div>
      <div className="toolbar" style={{ marginBottom: 14 }}>
        <div className="seg" role="group" aria-label="Status murid">
          {TABS.map(([k, l]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{l} ({hitung(k)})</button>)}
        </div>
        <input className="right" style={{ maxWidth: 280 }} type="search" placeholder="Cari nama, ortu, mapel, tentor…" aria-label="Cari murid" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {mu.loading ? <p className="empty">Memuat…</p> : daftar.length === 0 ? (
        <div className="card empty"><b>{mu.rows.length === 0 ? "Belum ada murid" : "Tidak ada murid di tampilan ini"}</b><p className="meta">{mu.rows.length === 0 ? "Tambah murid pertama untuk mulai." : "Ubah tab atau kata pencarian."}</p>{mu.rows.length === 0 && <button className="btn" onClick={() => setBaru(true)}>+ Murid</button>}</div>
      ) : daftar.map((m) => {
        const ls = lesOf(m);
        const info = ls.length === 0 ? "Belum ada les" : `${ls[0].subject} · ${tutorNama(ls[0].tutor_id)}${ls.length > 1 ? ` · +${ls.length - 1} les` : ""}`;
        return (
          <Link href={`/murid/${m.id}`} className="card row link" key={m.id}>
            <span className="avatar">{m.name[0]?.toUpperCase()}</span>
            <div className="grow"><div className="name">{m.name}{status(m) !== "aktif" && <span className="pill warn" style={{ marginLeft: 8 }}>{status(m) === "trial" ? "Trial" : "Arsip"}</span>}</div><div className="meta">{info}</div></div>
            {!m.paid && m.price > 0 ? <span className="pill warn">{rp(m.price)}</span> : ls.length > 0 ? <span className="pill ok">Sisa {sisa(m)}</span> : null}
            <span className="meta">›</span>
          </Link>
        );
      })}
      {baru && <MuridForm awal={null} onClose={() => setBaru(false)} onSaved={() => { setBaru(false); mu.reload(); }} />}
    </Shell>
  );
}