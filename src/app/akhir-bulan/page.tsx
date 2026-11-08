"use client";
import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { supabase, useQuery, rp, localDate, Tutor } from "@/lib/db";
import { SesiX, batasBulan, geserBulan, namaBulan, labelOutcome, OUTCOMES } from "@/lib/app";

export default function AkhirBulan() {
  const [bulan, setBulan] = useState(localDate().slice(0, 7));
  const { dari, sampai } = batasBulan(bulan);
  const se = useQuery<SesiX>(() => supabase.from("sessions").select("*").not("outcome", "is", null).gte("date", dari).lt("date", sampai), [bulan]);
  const tu = useQuery<Tutor>(() => supabase.from("tutors").select("*").order("name"), []);
  const rekap = tu.rows.map((t) => { const rows = se.rows.filter((x) => x.tutor_id === t.id); return { t, rows, honor: rows.reduce((a, x) => a + (x.honor_amount ?? 0), 0) }; }).filter((r) => r.rows.length > 0);
  const total = rekap.reduce((a, r) => a + r.honor, 0);

  return (
    <Shell>
      <h1>Akhir bulan</h1>
      <p className="sub">Rekap honor tentor dari pertemuan yang sudah dicatat.</p>
      <div className="datenav" style={{ width: "fit-content", marginBottom: 14 }}>
        <button aria-label="Bulan sebelumnya" onClick={() => setBulan(geserBulan(bulan, -1))}>‹</button><b style={{ padding: "0 14px" }}>{namaBulan(bulan)}</b><button aria-label="Bulan berikutnya" onClick={() => setBulan(geserBulan(bulan, 1))}>›</button>
      </div>
      <div className="statsbar" style={{ gridTemplateColumns: "1fr 1fr" }}><div><span>Total honor tentor</span><b>{rp(total)}</b></div><div><span>Pertemuan tercatat</span><b>{se.rows.length}</b></div></div>
      {se.loading ? <p className="empty">Memuat…</p> : rekap.length === 0 ? <div className="card empty">Belum ada pertemuan yang dicatat di bulan ini.</div> : rekap.map(({ t, rows, honor }) => (
        <div className="card" key={t.id}>
          <div className="row"><div className="grow"><Link href={`/tentor/${t.id}`}><b>{t.name}</b></Link><div className="meta">{rows.length} pertemuan · {OUTCOMES.map((o) => ({ l: labelOutcome(o.key), n: rows.filter((x) => x.outcome === o.key).length })).filter((x) => x.n > 0).map((x) => `${x.l} ${x.n}`).join(", ")}</div></div><b>{rp(honor)}</b></div>
        </div>
      ))}
      <p className="hint">Honor dihitung saat pertemuan dicatat, sesuai skema honor tentor atau honor khusus les. Mengubah tarif nanti tidak mengubah honor yang sudah tercatat.</p>
    </Shell>
  );
}