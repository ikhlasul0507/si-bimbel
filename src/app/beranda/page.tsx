"use client";
import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import JadwalModal from "@/components/JadwalModal";
import { CatatModal } from "@/components/PertemuanModals";
import { supabase, useQuery, rp, localDate, sisa, hhmm, Student, Tutor } from "@/lib/db";
import { SesiX, Invoice, Makeup, sisaTagihan, labelOutcome, geserHari } from "@/lib/app";

type Les = { id: string; subject: string };
const initials = (n: string) => n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function Beranda() {
  const today = localDate();
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState<"semua" | "belum" | "dicatat">("semua");
  const [view, setView] = useState<"tentor" | "jam">("tentor");
  const [modal, setModal] = useState<{ tid: string } | null>(null);
  const [catat, setCatat] = useState<SesiX | null>(null);

  const st = useQuery<Student>(() => supabase.from("students").select("*").order("name"), []);
  const tu = useQuery<Tutor>(() => supabase.from("tutors").select("*").order("name"), []);
  const le = useQuery<Les>(() => supabase.from("lessons").select("id,subject"), []);
  const se = useQuery<SesiX>(() => supabase.from("sessions").select("*").eq("date", date).order("time"), [date]);
  const lama = useQuery<SesiX>(() => supabase.from("sessions").select("*").is("outcome", null).gte("date", geserHari(today, -7)).lt("date", today).order("date"), [today]);
  const iv = useQuery<Invoice>(() => supabase.from("invoices").select("*"), []);
  const mk = useQuery<Makeup>(() => supabase.from("makeups").select("*").eq("done", false), []);
  const reloadAll = () => { se.reload(); st.reload(); lama.reload(); iv.reload(); mk.reload(); };

  const stu = (id: string) => st.rows.find((s) => s.id === id);
  const tut = (id: string) => tu.rows.find((t) => t.id === id);
  const mapel = (id?: string | null) => le.rows.find((l) => l.id === id)?.subject ?? "Les";
  const all = se.rows;
  const dicatat = all.filter((x) => x.outcome).length;
  const shown = all.filter((x) => filter === "semua" || (filter === "belum" ? !x.outcome : !!x.outcome));
  const tutorAktif = tu.rows.filter((t) => shown.some((x) => x.tutor_id === t.id));
  const belum = iv.rows.filter((i) => sisaTagihan(i) > 0);
  const piutang = belum.reduce((a, i) => a + sisaTagihan(i), 0);
  const menipis = st.rows.filter((s) => (s as Student & { status?: string }).status !== "arsip" && s.quota_total > 0 && s.quota_used > 0 && sisa(s) <= 2);
  const urus = (lama.rows.length > 0 ? 1 : 0) + (menipis.length > 0 ? 1 : 0) + (mk.rows.length > 0 ? 1 : 0);
  const isToday = date === today;

  async function hapus(x: SesiX) {
    if (!confirm("Hapus jadwal ini?")) return;
    await supabase.from("sessions").delete().eq("id", x.id);
    reloadAll();
  }
  function waTentor(t: Tutor) {
    const no = (t.phone || "").replace(/\D/g, "").replace(/^0/, "62");
    const baris = all.filter((x) => x.tutor_id === t.id).map((x) => `${hhmm(x.time)} ${stu(x.student_id)?.name ?? ""}`).join("\n");
    return `https://wa.me/${no}?text=${encodeURIComponent(`Halo ${t.name}, jadwal mengajar ${new Date(date + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long" })}:\n${baris}`)}`;
  }

  const Baris = ({ x, tentor }: { x: SesiX; tentor?: string }) => {
    const s = stu(x.student_id);
    return (
      <div className="srow">
        <div className="stime">{hhmm(x.time)}{x.end_time && <small className="meta" style={{ display: "block", fontWeight: 500 }}>s/d {hhmm(x.end_time)}</small>}</div>
        <div className="grow">
          <div className="name">{s?.name ?? "Murid dihapus"}</div>
          <div className="meta">{mapel(x.lesson_id)}{tentor ? ` · ${tentor}` : ""}{s ? ` · sisa ${sisa(s)}` : ""}</div>
          {x.outcome && <span className={`pill ${x.outcome === "hadir" ? "ok" : "warn"}`}>{labelOutcome(x.outcome)}</span>}
        </div>
        <button className="btn ghost sm" aria-label="Hapus jadwal" onClick={() => hapus(x)}>✕</button>
        <button className={`btn sm${x.outcome ? " ghost" : ""}`} onClick={() => setCatat(x)}>{x.outcome ? "Ubah" : "Catat"}</button>
      </div>
    );
  };

  return (
    <Shell>
      <div className="head">
        <div>
          <h1>{isToday ? "Hari ini" : "Jadwal les"}</h1>
          <p className="sub">{new Date(date + "T00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {all.length} sesi terjadwal ({dicatat} dicatat)</p>
        </div>
        <button className="btn" onClick={() => setModal({ tid: "" })}>+ Jadwal les</button>
      </div>

      <div className="statsbar">
        <div><span>{isToday ? "Pertemuan hari ini" : "Pertemuan di tanggal ini"}</span><b>{dicatat}<small> / {all.length}</small></b><span>{new Set(all.map((x) => x.tutor_id)).size} tentor bertugas</span></div>
        <div><span>Piutang belum masuk</span><b className="warn">{rp(piutang)}</b><span>{belum.length} tagihan menunggu</span></div>
        <div><span>Kuota mau habis</span><b>{menipis.length}<small> murid</small></b><span>sisa 2 pertemuan atau kurang</span></div>
        <div><span>Pengganti</span><b>{mk.rows.length}<small> antrean</small></b><span>utang pertemuan murid</span></div>
      </div>

      <div className="toolbar">
        <div className="datenav">
          <button aria-label="Hari sebelumnya" onClick={() => setDate(geserHari(date, -1))}>‹</button>
          <input type="date" aria-label="Tanggal" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button aria-label="Hari berikutnya" onClick={() => setDate(geserHari(date, 1))}>›</button>
        </div>
        <div className="seg" role="group" aria-label="Filter">
          <button aria-pressed={filter === "semua"} onClick={() => setFilter("semua")}>Semua ({all.length})</button>
          <button aria-pressed={filter === "belum"} onClick={() => setFilter("belum")}>Belum ({all.length - dicatat})</button>
          <button aria-pressed={filter === "dicatat"} onClick={() => setFilter("dicatat")}>Dicatat ({dicatat})</button>
        </div>
        <div className="seg right" role="group" aria-label="Tampilan">
          <button aria-pressed={view === "tentor"} onClick={() => setView("tentor")}>Per tentor</button>
          <button aria-pressed={view === "jam"} onClick={() => setView("jam")}>Urut jam</button>
        </div>
      </div>

      <div className="cols">
        <section>
          <h2>Tentor ke mana aja <span className="mute">· {shown.length} sesi</span></h2>
          {se.loading ? <p className="empty">Memuat…</p> : shown.length === 0 ? (
            <div className="card empty">
              <b>Nggak ada jadwal les</b>
              <p className="meta">{all.length === 0 ? "Belum ada jadwal di tanggal ini. Geser tanggal untuk lihat hari lain." : "Tidak ada sesi di filter ini."}</p>
              <button className="btn" onClick={() => setModal({ tid: "" })}>+ Tambah jadwal les</button>
            </div>
          ) : view === "tentor" ? tutorAktif.map((t) => {
            const rows = shown.filter((x) => x.tutor_id === t.id);
            return (
              <div className="card flush" key={t.id}>
                <div className="thead">
                  <span className="avatar">{initials(t.name)}</span>
                  <div className="grow"><div className="name">{t.name}</div><div className="meta">{rows.length} sesi · {rows.filter((x) => x.outcome).length} udah dicatat</div></div>
                  <button className="btn ghost sm" onClick={() => setModal({ tid: t.id })}>+ Jam</button>
                  {t.phone && <a className="btn wa sm" target="_blank" rel="noopener noreferrer" href={waTentor(t)}>WA</a>}
                </div>
                {rows.map((x) => <Baris key={x.id} x={x} />)}
              </div>
            );
          }) : (
            <div className="card flush">{shown.map((x) => <Baris key={x.id} x={x} tentor={tut(x.tutor_id)?.name} />)}</div>
          )}
        </section>

        <aside>
          <h2>Perlu kamu urus <span className="mute">· {urus}</span></h2>
          {urus === 0 && <div className="card empty">Semua beres. Tidak ada yang perlu diurus.</div>}
          {lama.rows.length > 0 && (
            <button className="alert" onClick={() => setDate(lama.rows[0].date)}>
              <div className="grow"><b>Pertemuan 7 hari terakhir belum dicatat</b><small>Catat supaya kuota dan honor tentor akurat.</small></div>
              <span className="pill warn">{lama.rows.length} sesi</span>
            </button>
          )}
          {mk.rows.length > 0 && (
            <Link href="/murid" className="alert">
              <div className="grow"><b>Ada utang pertemuan pengganti</b><small>Jadwalkan dari halaman detail murid.</small></div>
              <span className="pill warn">{mk.rows.length} sesi</span>
            </Link>
          )}
          {menipis.length > 0 && (
            <Link href="/murid" className="alert">
              <div className="grow"><b>Kuota murid hampir habis</b><small>{menipis.slice(0, 2).map((s) => s.name).join(", ")}{menipis.length > 2 ? ` dan ${menipis.length - 2} lainnya` : ""}</small></div>
              <span className="pill warn">{menipis.length} murid</span>
            </Link>
          )}
          <h2>Aksi cepat</h2>
          <div className="card flush">
            <button className="qa" onClick={() => setModal({ tid: "" })}>Tambah jadwal les<span>›</span></button>
            <Link className="qa" href="/murid">Murid<span>›</span></Link>
            <Link className="qa" href="/tentor">Tentor<span>›</span></Link>
            <Link className="qa" href="/tagihan">Tagihan<span>›</span></Link>
            <Link className="qa" href="/akhir-bulan">Akhir bulan<span>›</span></Link>
            <Link className="qa" href="/pengaturan">Branding & pembayaran<span>›</span></Link>
          </div>
        </aside>
      </div>

      {modal && <JadwalModal students={st.rows} tutors={tu.rows} date={date} tid={modal.tid} onClose={() => setModal(null)} onSaved={(d) => { setModal(null); reloadAll(); if (d !== date) setDate(d); }} />}
      {catat && <CatatModal sesi={catat} murid={stu(catat.student_id)} tutor={tut(catat.tutor_id)} mapel={mapel(catat.lesson_id)} onClose={() => setCatat(null)} onSaved={() => { setCatat(null); reloadAll(); }} />}
    </Shell>
  );
}