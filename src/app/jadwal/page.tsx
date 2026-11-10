"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import JadwalModal from "@/components/JadwalModal";
import { CatatModal } from "@/components/PertemuanModals";
import { supabase, useQuery, localDate, hhmm, Student, Tutor } from "@/lib/db";
import { SesiX, geserHari, labelOutcome } from "@/lib/app";

type Les = { id: string; subject: string };
const mulaiMinggu = (d: string) => {
  const x = new Date(d + "T00:00:00");
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toLocaleDateString("sv-SE");
};
const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", opts);

export default function JadwalMingguan() {
  const [anchor, setAnchor] = useState(localDate());
  const [tambah, setTambah] = useState<string | null>(null);
  const [catat, setCatat] = useState<SesiX | null>(null);
  const start = useMemo(() => mulaiMinggu(anchor), [anchor]);
  const end = geserHari(start, 7);
  const sesi = useQuery<SesiX>(() => supabase.from("sessions").select("*").gte("date", start).lt("date", end).order("date").order("time"), [start, end]);
  const murid = useQuery<Student>(() => supabase.from("students").select("*"), []);
  const tentor = useQuery<Tutor>(() => supabase.from("tutors").select("*"), []);
  const les = useQuery<Les>(() => supabase.from("lessons").select("id,subject"), []);
  const hari = Array.from({ length: 7 }, (_, i) => geserHari(start, i));
  const muridById = (id: string) => murid.rows.find((x) => x.id === id);
  const tentorById = (id: string) => tentor.rows.find((x) => x.id === id);
  const reload = () => sesi.reload();

  async function hapus(x: SesiX) {
    if (!confirm("Hapus jadwal ini?")) return;
    const { error } = await supabase.from("sessions").delete().eq("id", x.id);
    if (error) alert(error.message); else reload();
  }

  return <Shell>
    <div className="head">
      <div><h1>Jadwal mingguan</h1><p className="sub">{fmt(start, { day: "numeric", month: "long" })} – {fmt(geserHari(end, -1), { day: "numeric", month: "long", year: "numeric" })} · {sesi.rows.length} sesi</p></div>
      <button className="btn" onClick={() => setTambah(anchor)}>+ Jadwal les</button>
    </div>
    <div className="toolbar" style={{ marginBottom: 16 }}>
      <div className="datenav">
        <button aria-label="Minggu sebelumnya" onClick={() => setAnchor(geserHari(start, -7))}>‹</button>
        <input type="date" aria-label="Pilih tanggal dalam minggu" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} />
        <button aria-label="Minggu berikutnya" onClick={() => setAnchor(geserHari(start, 7))}>›</button>
      </div>
      <button className="btn ghost sm" onClick={() => setAnchor(localDate())}>Minggu ini</button>
    </div>
    {sesi.loading ? <p className="empty">Memuat jadwal…</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 12 }}>
      {hari.map((d) => {
        const rows = sesi.rows.filter((x) => x.date === d);
        const today = d === localDate();
        return <section className="card" key={d} style={{ margin: 0, padding: 0, overflow: "hidden", borderColor: today ? "var(--brand)" : undefined }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><b style={{ color: today ? "var(--brand)" : undefined }}>{fmt(d, { weekday: "long" })}{today ? " · Hari ini" : ""}</b><div className="meta">{fmt(d, { day: "numeric", month: "long" })} · {rows.length} sesi</div></div>
            <button className="btn ghost sm" onClick={() => setTambah(d)}>+ Tambah</button>
          </div>
          {rows.length === 0 ? <div className="empty" style={{ padding: 20 }}>Belum ada sesi</div> : rows.map((x) => {
            const s = muridById(x.student_id);
            const t = tentorById(x.tutor_id);
            const subject = les.rows.find((l) => l.id === x.lesson_id)?.subject;
            return <div className="srow" key={x.id} style={{ alignItems: "flex-start", padding: "12px 14px" }}>
              <div className="stime" style={{ width: 48 }}>{hhmm(x.time)}{x.end_time && <small className="meta" style={{ display: "block", fontWeight: 500 }}>–{hhmm(x.end_time)}</small>}</div>
              <div className="grow"><div className="name">{s?.name ?? "Murid dihapus"}</div><div className="meta">{subject ?? "Les"} · {t?.name ?? "Tentor"}</div>{x.outcome && <span className={`pill ${x.outcome === "hadir" ? "ok" : "warn"}`}>{labelOutcome(x.outcome)}</span>}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}><button className="btn ghost sm" onClick={() => setCatat(x)}>{x.outcome ? "Ubah" : "Catat"}</button><button className="btn ghost sm" aria-label="Hapus jadwal" onClick={() => hapus(x)}>Hapus</button></div>
              </div>
            </div>;
          })}
        </section>;
      })}
    </div>}
    {tambah && <JadwalModal students={murid.rows} tutors={tentor.rows} date={tambah} tid="" onClose={() => setTambah(null)} onSaved={() => { setTambah(null); reload(); }} />}
    {catat && <CatatModal sesi={catat} murid={muridById(catat.student_id)} tutor={tentorById(catat.tutor_id)} mapel={les.rows.find((l) => l.id === catat.lesson_id)?.subject ?? "Les"} onClose={() => setCatat(null)} onSaved={() => { setCatat(null); reload(); }} />}
  </Shell>;
}
