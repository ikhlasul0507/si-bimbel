"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import MuridForm, { MuridX } from "@/components/MuridForm";
import JadwalModal from "@/components/JadwalModal";
import { CatatModal, PindahModal } from "@/components/PertemuanModals";
import { NilaiModal, TagihanModal, PortalModal, RaporModal } from "@/components/MuridModals";
import { supabase, useQuery, rp, localDate, hhmm, Tutor, Slot } from "@/lib/db";
import { SesiX, Makeup, Invoice, Score, sisaTagihan, labelOutcome, noWa, tglPendek, pesanTagihan, usePengaturan } from "@/lib/app";

type Les = { id: string; student_id: string; tutor_id: string; subject: string; class_type: string; slots: Slot[]; quota_per_package: number; price: number; status: string };
const mnt = (x: string) => { const [h, m] = x.split(":").map(Number); return h * 60 + m; };
const durasi = (s: Slot) => mnt(s.end) - mnt(s.start);

export default function DetailMurid() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const today = localDate();
  const { p } = usePengaturan();
  const [edit, setEdit] = useState(false);
  const [les, setLes] = useState(false);
  const [catat, setCatat] = useState<{ sesi: SesiX; mapel: string } | null>(null);
  const [pindah, setPindah] = useState<Les | null>(null);
  const [pengganti, setPengganti] = useState<Makeup | null>(null);
  const [nilai, setNilai] = useState(false);
  const [tagihan, setTagihan] = useState(false);
  const [portal, setPortal] = useState(false);
  const [rapor, setRapor] = useState(false);

  const mu = useQuery<MuridX & { portal_token?: string | null }>(() => supabase.from("students").select("*").eq("id", id), [id]);
  const tu = useQuery<Tutor>(() => supabase.from("tutors").select("*"), []);
  const le = useQuery<Les>(() => supabase.from("lessons").select("*").eq("student_id", id).order("created_at"), [id]);
  const se = useQuery<SesiX>(() => supabase.from("sessions").select("*").eq("student_id", id).order("date", { ascending: false }).order("time", { ascending: false }).limit(300), [id]);
  const mk = useQuery<Makeup>(() => supabase.from("makeups").select("*").eq("student_id", id).eq("done", false).order("due_date"), [id]);
  const sc = useQuery<Score>(() => supabase.from("scores").select("*").eq("student_id", id).order("date", { ascending: false }).limit(10), [id]);
  const iv = useQuery<Invoice>(() => supabase.from("invoices").select("*").eq("student_id", id).order("created_at", { ascending: false }), [id]);

  const m = mu.rows[0];
  if (mu.loading) return <Shell><p className="empty">Memuat…</p></Shell>;
  if (!m) return <Shell><div className="card empty"><b>Murid tidak ditemukan</b><p><Link href="/murid">Kembali ke daftar murid</Link></p></div></Shell>;

  const reloadAll = () => { mu.reload(); le.reload(); se.reload(); mk.reload(); sc.reload(); iv.reload(); };
  const tut = (tid: string) => tu.rows.find((t) => t.id === tid);
  const lesObj = (lid?: string | null) => le.rows.find((l) => l.id === lid);
  const riwayat = se.rows.filter((x) => x.outcome);
  const peta = m.maps_url || (m.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address)}` : "");
  const tak = (l: Les) => se.rows.filter((x) => x.lesson_id === l.id && !x.outcome);

  function sesiCatat(l: Les): SesiX {
    const t = tak(l);
    const lalu = t.filter((x) => x.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0];
    const depan = t.filter((x) => x.date > today).sort((a, b) => a.date.localeCompare(b.date))[0];
    const s = lalu ?? depan;
    if (s) return s;
    const slot = (l.slots ?? [])[0];
    return { id: "", student_id: m.id, tutor_id: l.tutor_id, lesson_id: l.id, date: today, time: slot?.start ?? "15:30", end_time: slot?.end ?? null, attended: false } as SesiX;
  }
  async function akhiri(l: Les) {
    if (!confirm(`Akhiri les ${l.subject}? Jadwal yang belum dicatat dari hari ini ke depan akan dihapus.`)) return;
    await supabase.from("sessions").delete().eq("lesson_id", l.id).is("outcome", null).gte("date", today);
    await supabase.from("lessons").update({ status: "selesai" }).eq("id", l.id);
    reloadAll();
  }
  async function lunas(i: Invoice) { await supabase.from("invoices").update({ paid_amount: i.amount }).eq("id", i.id); iv.reload(); }
  async function hapusTagihan(i: Invoice) { if (confirm("Hapus tagihan ini?")) { await supabase.from("invoices").delete().eq("id", i.id); iv.reload(); } }
  async function hapus() {
    if (!confirm(`Hapus ${m.name} beserta semua les, jadwal, nilai, dan tagihannya?`)) return;
    await supabase.from("students").delete().eq("id", m.id);
    r.replace("/murid");
  }
  const mapelAktif = le.rows.find((l) => l.status === "aktif")?.subject ?? "";

  return (
    <Shell>
      <div className="dhead">
        <Link href="/murid" className="back" aria-label="Kembali">‹</Link>
        <div className="grow"><h1>{m.name}</h1><div className="meta">{[m.grade, m.area].filter(Boolean).join(" · ") || "Kelas belum diisi"}{m.status && m.status !== "aktif" ? ` · ${m.status === "trial" ? "Trial" : "Arsip"}` : ""}</div></div>
        <button className="btn ghost sm" onClick={() => setEdit(true)}>✎ Ubah</button>
      </div>

      <div className="card">
        <div className="row">
          <span className="avatar">{m.name[0]?.toUpperCase()}</span>
          <div className="grow"><div className="name">{m.parent_name || "Ortu belum diisi"}</div><div className="meta">Ortu: {m.phone || "WA belum diisi"}</div></div>
        </div>
        <div className="acts" style={{ marginTop: 12 }}>
          <button className="btn ghost sm" onClick={() => setRapor(true)}>Laporan ke ortu</button>
          {m.phone ? <a className="btn wa sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${noWa(m.phone)}`}>Chat WA ortu</a> : null}
          {m.student_phone ? <a className="btn ghost sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${noWa(m.student_phone)}`}>Chat WA murid</a> : null}
          <button className="btn sm" onClick={() => setLes(true)}>+ Tambah les</button>
        </div>
      </div>

      {(m.address || m.tutor_note || m.owner_note) && (
        <div className="card">
          {m.address && <div><span className="meta">Alamat</span><div>{m.address}{m.area ? `, ${m.area}` : ""}</div>{peta && <a href={peta} target="_blank" rel="noopener noreferrer" className="meta"><b>Buka di peta</b></a>}</div>}
          {m.tutor_note && <div style={{ marginTop: 10 }}><span className="meta">Catatan buat tentor</span><div>{m.tutor_note}</div></div>}
          {m.owner_note && <div style={{ marginTop: 10 }}><span className="meta">Catatan pribadi owner (tidak terlihat tentor)</span><div>{m.owner_note}</div></div>}
        </div>
      )}

      {le.rows.map((l) => (
        <div className="card" key={l.id}>
          <div><b>{l.subject}</b> <span className="pill ok">{l.class_type === "kelompok" ? "Kelompok" : "Privat"}</span>{l.status !== "aktif" && <span className="pill warn" style={{ marginLeft: 6 }}>{l.status === "selesai" ? "Selesai" : "Nonaktif"}</span>}</div>
          <div className="meta" style={{ marginTop: 6 }}>{tut(l.tutor_id)?.name ?? "Tentor dihapus"} · {(l.slots ?? []).map((s) => `${s.day.slice(0, 3)} ${s.start}–${s.end} (${durasi(s)}m)`).join(", ")}</div>
          <div className="meta">Paket {l.quota_per_package} pertemuan · {rp(l.price)} · {tak(l).filter((x) => x.date >= today).length} sesi terjadwal ke depan</div>
          {l.status === "aktif" && (
            <div className="acts" style={{ marginTop: 10 }}>
              <button className="btn sm grow" onClick={() => setCatat({ sesi: sesiCatat(l), mapel: l.subject })}>+ Catat pertemuan</button>
              <button className="btn ghost sm" onClick={() => setPindah(l)}>Pindah jadwal</button>
              <button className="btn ghost sm" onClick={() => akhiri(l)}>Akhiri les</button>
            </div>
          )}
        </div>
      ))}
      {le.rows.length === 0 && <div className="card empty">Belum ada les. Klik <b>+ Tambah les</b> untuk membuat jadwal.</div>}

      {mk.rows.length > 0 && (
        <>
          <div className="sec"><h2>Utang pertemuan <span className="mute">· {mk.rows.length}</span></h2></div>
          <div className="card flush">{mk.rows.map((x) => (
            <div className="jrow" key={x.id}><div className="grow"><div className="name">{lesObj(x.lesson_id)?.subject ?? "Les"}</div><div className="meta">Pengganti sebelum {tglPendek(x.due_date)}</div></div><button className="btn sm" onClick={() => setPengganti(x)}>Jadwalkan</button></div>
          ))}</div>
        </>
      )}

      <div className="sec"><h2>Riwayat pertemuan</h2><span className="meta">{riwayat.length} catatan</span></div>
      {riwayat.length === 0 ? <p className="meta">Belum ada.</p> : (
        <div className="card flush">
          {riwayat.slice(0, 20).map((x) => (
            <button className="jrow rowbtn" key={x.id} onClick={() => setCatat({ sesi: x, mapel: lesObj(x.lesson_id)?.subject ?? "Les" })}>
              <div className="jday"><b>{tglPendek(x.date)}</b><small>{hhmm(x.time)}</small></div>
              <div className="grow"><div className="name">{lesObj(x.lesson_id)?.subject ?? "Les"}</div><div className="meta">{tut(x.tutor_id)?.name}{x.materi ? ` · ${x.materi}` : ""}</div></div>
              <span className={`pill ${x.outcome === "hadir" ? "ok" : "warn"}`}>{labelOutcome(x.outcome)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="sec"><h2>Nilai</h2><button className="btn ghost sm" onClick={() => setNilai(true)}>+ Input nilai</button></div>
      {sc.rows.length === 0 ? <p className="meta">Belum ada nilai. Input nilai ulangan atau latihan murid.</p> : (
        <div className="card flush">{sc.rows.map((x) => <div className="jrow" key={x.id}><div className="grow"><div className="name">{x.title}</div><div className="meta">{tglPendek(x.date)}{x.subject ? ` · ${x.subject}` : ""}</div></div><b>{x.score}<span className="meta">/{x.max_score}</span></b></div>)}</div>
      )}
      <div className="two" style={{ marginTop: 10 }}>
        <button className="btn ghost" onClick={() => setPortal(true)}>Portal ortu & murid</button>
        <button className="btn ghost" onClick={() => setRapor(true)}>Rapor bulanan</button>
      </div>

      <div className="sec"><h2>Tagihan</h2><button className="btn ghost sm" onClick={() => setTagihan(true)}>+ Buat tagihan</button></div>
      {iv.rows.length === 0 ? <p className="meta">Belum ada tagihan.</p> : iv.rows.map((i) => (
        <div className="card" key={i.id}>
          <div className="row"><div className="grow"><div className="name">{i.title}</div><div className="meta">{i.due_date ? `Jatuh tempo ${tglPendek(i.due_date)}` : ""}</div></div><b>{rp(i.amount)}</b><span className={`pill ${sisaTagihan(i) <= 0 ? "ok" : i.paid_amount > 0 ? "warn" : "bad"}`}>{sisaTagihan(i) <= 0 ? "Lunas" : i.paid_amount > 0 ? "Sebagian" : "Belum"}</span></div>
          <div className="acts" style={{ marginTop: 10, justifyContent: "flex-end" }}>
            {sisaTagihan(i) > 0 && m.phone && <a className="btn wa sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${noWa(m.phone)}?text=${encodeURIComponent(pesanTagihan(p, m.parent_name, m.name, i.title, i.amount, sisaTagihan(i), i.due_date))}`}>Tagih via WA</a>}
            {sisaTagihan(i) > 0 && <button className="btn ghost sm" onClick={() => lunas(i)}>Tandai lunas</button>}
            <button className="btn ghost sm" aria-label="Hapus tagihan" onClick={() => hapusTagihan(i)}>✕</button>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 24 }}><button className="btn ghost" style={{ color: "var(--bad)" }} onClick={hapus}>Hapus murid</button></div>

      {edit && <MuridForm awal={m} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reloadAll(); }} />}
      {les && <JadwalModal students={[m]} tutors={tu.rows} date={today} tid="" muridId={m.id} onClose={() => setLes(false)} onSaved={() => { setLes(false); reloadAll(); }} />}
      {catat && <CatatModal sesi={catat.sesi} murid={m} tutor={tut(catat.sesi.tutor_id)} mapel={catat.mapel} onClose={() => setCatat(null)} onSaved={() => { setCatat(null); reloadAll(); }} />}
      {pindah && <PindahModal mode="pindah" kandidat={tak(pindah).filter((x) => x.date >= today).sort((a, b) => a.date.localeCompare(b.date))} tutorNama={tut(pindah.tutor_id)?.name ?? ""} mapel={pindah.subject} onClose={() => setPindah(null)} onSaved={() => { setPindah(null); reloadAll(); }} />}
      {pengganti && <PindahModal mode="pengganti" makeup={pengganti} tutorNama={tut(pengganti.tutor_id)?.name ?? ""} mapel={lesObj(pengganti.lesson_id)?.subject ?? "Les"} onClose={() => setPengganti(null)} onSaved={() => { setPengganti(null); reloadAll(); }} />}
      {nilai && <NilaiModal murid={m} onClose={() => setNilai(false)} onSaved={() => { setNilai(false); sc.reload(); }} />}
      {tagihan && <TagihanModal murid={m} mapel={mapelAktif} onClose={() => setTagihan(false)} onSaved={() => { setTagihan(false); iv.reload(); }} />}
      {portal && <PortalModal murid={m} onClose={() => setPortal(false)} onToken={() => mu.reload()} />}
      {rapor && <RaporModal murid={m} onClose={() => setRapor(false)} onToken={() => mu.reload()} />}
    </Shell>
  );
}