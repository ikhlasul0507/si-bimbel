"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase, rp, localDate, hhmm } from "@/lib/db";
import { geserBulan, namaBulan, labelOutcome, tglPendek } from "@/lib/app";

type Portal = {
  ok: boolean; lembaga: string; tagline: string; bank: string; murid: string; jenjang: string;
  tagihan: { id: string; title: string; sisa: number; due: string | null }[];
  total: number; hadir: number; rata: number | null;
  nilai: { date: string; title: string; subject: string | null; score: number; max: number }[];
  pertemuan: { date: string; time: string; outcome: string; materi: string | null }[];
  catatan: string | null;
};

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [bulan, setBulan] = useState(localDate().slice(0, 7));
  const [d, setD] = useState<Portal | null>(null);
  const [gagal, setGagal] = useState(false);
  const [bayar, setBayar] = useState<string | null>(null);

  useEffect(() => { const b = new URLSearchParams(location.search).get("b"); if (b && /^\d{4}-\d{2}$/.test(b)) setBulan(b); }, []);
  useEffect(() => {
    supabase.rpc("portal_buka", { p_token: token, p_month: bulan }).then(({ data, error }) => {
      if (error || !data?.ok) setGagal(true); else { setGagal(false); setD(data as Portal); }
    });
  }, [token, bulan]);

  if (gagal) return <div className="pub"><div className="card empty"><b>Link tidak ditemukan</b><p className="meta">Link portal salah atau sudah dinonaktifkan. Hubungi lembaga bimbel.</p></div></div>;
  if (!d) return <p className="empty">Memuat…</p>;

  return (
    <div className="pub portal">
      <div className="card row"><span className="blogo">{d.lembaga[0]}</span><div className="grow"><b>{d.lembaga}</b><div className="meta">{d.tagline}</div></div><span className="pill ok">RESMI</span></div>
      <h1 style={{ fontSize: 24, marginTop: 16 }}>Portal belajar {d.murid}</h1>
      <p className="sub">Kehadiran, materi, nilai, rapor bulanan, dan tagihan les{d.jenjang ? ` · ${d.jenjang}` : ""}. Simpan link ini, bisa dibuka ortu dan murid dari HP mana aja.</p>

      {d.tagihan.length > 0 && (
        <div className="card noprint"><b>Tagihan belum dibayar</b>
          {d.tagihan.map((t) => (
            <div key={t.id} style={{ marginTop: 10 }}>
              <div className="row"><div className="grow">{t.title}<div className="meta">{t.due ? `sebelum ${tglPendek(t.due)}` : ""}</div></div><b>{rp(t.sisa)}</b><button className="btn ghost sm" onClick={() => setBayar(bayar === t.id ? null : t.id)}>Bayar</button></div>
              {bayar === t.id && <pre className="pesan">{d.bank ? `Transfer ${rp(t.sisa)} ke:\n${d.bank}` : "Silakan hubungi lembaga untuk info pembayaran."}</pre>}
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ margin: "20px 0 10px" }}><h2 className="grow" style={{ margin: 0 }}>Rapor bulan ini</h2><button className="btn ghost sm noprint" onClick={() => window.print()}>Cetak PDF Rapor</button></div>
      <div className="datenav noprint" style={{ margin: "0 auto 12px", width: "fit-content" }}>
        <button aria-label="Bulan sebelumnya" onClick={() => setBulan(geserBulan(bulan, -1))}>‹</button><b style={{ padding: "0 14px" }}>{namaBulan(bulan)}</b><button aria-label="Bulan berikutnya" onClick={() => setBulan(geserBulan(bulan, 1))}>›</button>
      </div>
      <div className="two">
        <div className="card"><span className="meta">Hadir</span><b style={{ display: "block", fontSize: 26 }}>{d.hadir}<span className="meta">/{d.total}</span></b><span className="meta">pertemuan tercatat</span></div>
        <div className="card"><span className="meta">Rata-rata nilai</span><b style={{ display: "block", fontSize: 26 }}>{d.rata ?? "–"}</b><span className="meta">{d.nilai.length} latihan/ulangan</span></div>
      </div>
      {d.catatan && <div className="card"><span className="meta">Catatan perkembangan</span><div>{d.catatan}</div></div>}

      <h2>Nilai</h2>
      {d.nilai.length === 0 ? <p className="meta">Belum ada nilai bulan ini.</p> : <div className="card flush">{d.nilai.map((n, i) => <div className="jrow" key={i}><div className="grow"><div className="name">{n.title}</div><div className="meta">{tglPendek(n.date)}{n.subject ? ` · ${n.subject}` : ""}</div></div><b>{n.score}<span className="meta">/{n.max}</span></b></div>)}</div>}
      <h2>Pertemuan</h2>
      {d.pertemuan.length === 0 ? <p className="meta">Belum ada catatan pertemuan bulan ini.</p> : <div className="card flush">{d.pertemuan.map((x, i) => <div className="jrow" key={i}><div className="jday"><b>{tglPendek(x.date)}</b><small>{hhmm(x.time)}</small></div><div className="grow"><div className="name">{labelOutcome(x.outcome)}</div><div className="meta">{x.materi ?? ""}</div></div></div>)}</div>}
      <div className="card row" style={{ marginTop: 18 }}><div className="grow"><span className="meta">DISAHKAN OLEH</span><div><b>{d.lembaga}</b></div></div><span className="blogo">{d.lembaga[0]}</span></div>
    </div>
  );
}