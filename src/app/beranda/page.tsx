"use client";
import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { supabase, useQuery, rp, localDate, sisa, hhmm, Student, Tutor, Session } from "@/lib/db";

const shift = (d: string, n: number) => { const x = new Date(d + "T00:00"); x.setDate(x.getDate() + n); return x.toLocaleDateString("sv-SE"); };
const initials = (n: string) => n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function JadwalModal({ students, tutors, date, tid, onClose, onSaved }: { students: Student[]; tutors: Tutor[]; date: string; tid: string; onClose: () => void; onSaved: (d: string) => void }) {
  const [f, setF] = useState({ sid: "", tid, date, time: "14:00" });
  const [busy, setBusy] = useState(false);
  const kosong = students.length === 0 || tutors.length === 0;

  async function simpan() {
    if (!f.sid || !f.tid) return alert("Pilih murid dan tentor dulu.");
    setBusy(true);
    const { error } = await supabase.from("sessions").insert({ student_id: f.sid, tutor_id: f.tid, date: f.date, time: f.time });
    setBusy(false);
    if (error) return alert(error.message);
    onSaved(f.date);
  }

  return (
    <div className="ov" onClick={onClose}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="jt" onClick={(e) => e.stopPropagation()}>
        <div className="row"><h2 id="jt" className="grow" style={{ margin: 0 }}>Jadwal les baru</h2><button className="btn ghost sm" onClick={onClose}>Tutup</button></div>
        {kosong ? (
          <p className="meta" style={{ marginTop: 14 }}>Tambahkan dulu data <Link href="/murid"><b>murid</b></Link> dan <Link href="/tentor"><b>tentor</b></Link>, baru jadwal bisa dibuat.</p>
        ) : (
          <>
            <label htmlFor="jm">Murid</label>
            <select id="jm" value={f.sid} onChange={(e) => setF({ ...f, sid: e.target.value })}><option value="">Pilih murid</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.package_name}</option>)}</select>
            <label htmlFor="jt2">Tentor</label>
            <select id="jt2" value={f.tid} onChange={(e) => setF({ ...f, tid: e.target.value })}><option value="">Pilih tentor</option>{tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <div className="two">
              <div><label htmlFor="jd">Tanggal</label><input id="jd" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
              <div><label htmlFor="jj">Jam</label><input id="jj" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
            </div>
            <button className="btn full" disabled={busy} onClick={simpan}>{busy ? "Menyimpan…" : "Simpan jadwal"}</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Beranda() {
  const today = localDate();
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState<"semua" | "belum" | "dicatat">("semua");
  const [view, setView] = useState<"tentor" | "jam">("tentor");
  const [modal, setModal] = useState<{ tid: string } | null>(null);

  const st = useQuery<Student>(() => supabase.from("students").select("*").order("name"), []);
  const tu = useQuery<Tutor>(() => supabase.from("tutors").select("*").order("name"), []);
  const se = useQuery<Session>(() => supabase.from("sessions").select("*").eq("date", date).order("time"), [date]);
  const lama = useQuery<Session>(() => supabase.from("sessions").select("*").eq("attended", false).gte("date", shift(today, -7)).lt("date", today).order("date"), [today]);

  const stu = (id: string) => st.rows.find((s) => s.id === id);
  const tut = (id: string) => tu.rows.find((t) => t.id === id);
  const all = se.rows;
  const dicatat = all.filter((x) => x.attended).length;
  const shown = all.filter((x) => filter === "semua" || (filter === "belum" ? !x.attended : x.attended));
  const tutorAktif = tu.rows.filter((t) => shown.some((x) => x.tutor_id === t.id));
  const unpaid = st.rows.filter((s) => !s.paid);
  const piutang = unpaid.reduce((a, s) => a + s.price, 0);
  const menipis = st.rows.filter((s) => sisa(s) <= 2);
  const urus = (lama.rows.length > 0 ? 1 : 0) + (menipis.length > 0 ? 1 : 0);
  const isToday = date === today;

  async function catat(x: Session) {
    const s = stu(x.student_id);
    if (!x.attended && s && sisa(s) <= 0) return alert(`Paket ${s.name} sudah habis. Perpanjang paketnya dulu.`);
    await supabase.from("sessions").update({ attended: !x.attended }).eq("id", x.id);
    se.reload(); st.reload(); lama.reload();
  }
  async function hapus(x: Session) {
    if (!confirm("Hapus jadwal ini?")) return;
    await supabase.from("sessions").delete().eq("id", x.id);
    se.reload(); st.reload(); lama.reload();
  }
  function waTentor(t: Tutor) {
    const no = (t.phone || "").replace(/\D/g, "").replace(/^0/, "62");
    const baris = all.filter((x) => x.tutor_id === t.id).map((x) => `${hhmm(x.time)} ${stu(x.student_id)?.name ?? ""}`).join("\n");
    return `https://wa.me/${no}?text=${encodeURIComponent(`Halo ${t.name}, jadwal mengajar ${new Date(date + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long" })}:\n${baris}`)}`;
  }

  const Baris = ({ x, tentor }: { x: Session; tentor?: string }) => {
    const s = stu(x.student_id);
    return (
      <div className="srow">
        <div className="stime">{hhmm(x.time)}</div>
        <div className="grow">
          <div className="name">{s?.name ?? "Murid dihapus"}</div>
          <div className="meta">{s?.package_name}{tentor ? ` · ${tentor}` : ""}{s ? ` · sisa ${sisa(s)}` : ""}</div>
        </div>
        <button className="btn ghost sm" aria-label="Hapus jadwal" onClick={() => hapus(x)}>✕</button>
        <button className={`btn sm${x.attended ? " done" : ""}`} onClick={() => catat(x)}>{x.attended ? "✓ Dicatat" : "Catat"}</button>
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
        <div><span>Piutang belum masuk</span><b className="warn">{rp(piutang)}</b><span>{unpaid.length} tagihan menunggu</span></div>
        <div><span>Kuota mau habis</span><b>{menipis.length}<small> murid</small></b><span>sisa 2 pertemuan atau kurang</span></div>
        <div><span>Murid aktif</span><b>{st.rows.length}</b><span>{tu.rows.length} tentor terdaftar</span></div>
      </div>

      <div className="toolbar">
        <div className="datenav">
          <button aria-label="Hari sebelumnya" onClick={() => setDate(shift(date, -1))}>‹</button>
          <input type="date" aria-label="Tanggal" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button aria-label="Hari berikutnya" onClick={() => setDate(shift(date, 1))}>›</button>
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
                  <div className="grow"><div className="name">{t.name}</div><div className="meta">{rows.length} sesi · {rows.filter((x) => x.attended).length} udah dicatat</div></div>
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
          {menipis.length > 0 && (
            <Link href="/murid" className="alert">
              <div className="grow"><b>Kuota murid hampir habis</b><small>{menipis.slice(0, 2).map((s) => s.name).join(", ")}{menipis.length > 2 ? ` dan ${menipis.length - 2} lainnya` : ""}</small></div>
              <span className="pill warn">{menipis.length} murid</span>
            </Link>
          )}
          <h2>Aksi cepat</h2>
          <div className="card flush">
            <button className="qa" onClick={() => setModal({ tid: "" })}>Tambah jadwal les<span>›</span></button>
            <Link className="qa" href="/murid">Tambah murid baru<span>›</span></Link>
            <Link className="qa" href="/tentor">Tambah tentor baru<span>›</span></Link>
          </div>
        </aside>
      </div>

      {modal && (
        <JadwalModal students={st.rows} tutors={tu.rows} date={date} tid={modal.tid} onClose={() => setModal(null)}
          onSaved={(d) => { setModal(null); if (d !== date) setDate(d); else se.reload(); }} />
      )}
    </Shell>
  );
}