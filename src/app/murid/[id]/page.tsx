"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import MuridForm, { MuridX } from "@/components/MuridForm";
import JadwalModal from "@/components/JadwalModal";
import { supabase, useQuery, rp, localDate, hhmm, Tutor, Session, Slot } from "@/lib/db";

type Les = { id: string; student_id: string; tutor_id: string; subject: string; class_type: string; slots: Slot[]; quota_per_package: number; price: number; status: string };
type SesiX = Session & { lesson_id?: string | null };
const durasi = (s: Slot) => { const t = (x: string) => { const [h, m] = x.split(":").map(Number); return h * 60 + m; }; return t(s.end) - t(s.start); };
const noWa = (p: string) => p.replace(/\D/g, "").replace(/^0/, "62");

export default function DetailMurid() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const today = localDate();
  const [edit, setEdit] = useState(false);
  const [les, setLes] = useState(false);

  const mu = useQuery<MuridX>(() => supabase.from("students").select("*").eq("id", id), [id]);
  const tu = useQuery<Tutor>(() => supabase.from("tutors").select("*"), []);
  const le = useQuery<Les>(() => supabase.from("lessons").select("*").eq("student_id", id).order("created_at"), [id]);
  const se = useQuery<SesiX>(() => supabase.from("sessions").select("*").eq("student_id", id).order("date", { ascending: false }).order("time", { ascending: false }).limit(300), [id]);

  const m = mu.rows[0];
  if (mu.loading) return <Shell><p className="empty">Memuat…</p></Shell>;
  if (!m) return <Shell><div className="card empty"><b>Murid tidak ditemukan</b><p><Link href="/murid">Kembali ke daftar murid</Link></p></div></Shell>;

  const reloadAll = () => { mu.reload(); le.reload(); se.reload(); };
  const tutorNama = (tid: string) => tu.rows.find((t) => t.id === tid)?.name ?? "Tentor dihapus";
  const lesNama = (lid?: string | null) => le.rows.find((l) => l.id === lid)?.subject ?? "";
  const riwayat = se.rows.filter((x) => x.attended);
  const mendatang = (lid: string) => se.rows.filter((x) => x.lesson_id === lid && !x.attended && x.date >= today).length;
  const peta = m.maps_url || (m.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address)}` : "");

  async function akhiri(l: Les) {
    if (!confirm(`Akhiri les ${l.subject}? Jadwal yang belum dicatat dari hari ini ke depan akan dihapus.`)) return;
    await supabase.from("sessions").delete().eq("lesson_id", l.id).eq("attended", false).gte("date", today);
    await supabase.from("lessons").update({ status: "selesai" }).eq("id", l.id);
    reloadAll();
  }
  async function hapus() {
    if (!confirm(`Hapus ${m.name} beserta semua les dan jadwalnya?`)) return;
    await supabase.from("students").delete().eq("id", m.id);
    r.replace("/murid");
  }

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

      <div className="sec"><h2>Les <span className="mute">· {le.rows.length}</span></h2></div>
      {le.rows.length === 0 ? <div className="card empty">Belum ada les. Klik <b>+ Tambah les</b> untuk membuat jadwal.</div> : le.rows.map((l) => (
        <div className="card" key={l.id}>
          <div className="row">
            <div className="grow"><b>{l.subject}</b> <span className="pill ok">{l.class_type === "kelompok" ? "Kelompok" : "Privat"}</span>{l.status !== "aktif" && <span className="pill warn" style={{ marginLeft: 6 }}>{l.status === "selesai" ? "Selesai" : "Nonaktif"}</span>}</div>
          </div>
          <div className="meta" style={{ marginTop: 6 }}>{tutorNama(l.tutor_id)} · {(l.slots ?? []).map((s) => `${s.day.slice(0, 3)} ${s.start}–${s.end} (${durasi(s)}m)`).join(", ")}</div>
          <div className="meta">Paket {l.quota_per_package} pertemuan · {rp(l.price)} · {mendatang(l.id)} sesi terjadwal ke depan</div>
          {l.status === "aktif" && <div className="acts" style={{ marginTop: 10 }}><button className="btn ghost sm" onClick={() => akhiri(l)}>Akhiri les</button></div>}
        </div>
      ))}

      <div className="sec"><h2>Riwayat pertemuan</h2><span className="meta">{riwayat.length} catatan</span></div>
      {riwayat.length === 0 ? <p className="meta">Belum ada.</p> : (
        <div className="card flush">
          {riwayat.slice(0, 20).map((x) => (
            <div className="jrow" key={x.id}>
              <div className="jday"><b>{new Date(x.date + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</b><small>{hhmm(x.time)}</small></div>
              <div className="grow"><div className="name">{lesNama(x.lesson_id) || "Les"}</div><div className="meta">{tutorNama(x.tutor_id)}</div></div>
              <span className="pill ok">Hadir</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}><button className="btn ghost" style={{ color: "var(--bad)" }} onClick={hapus}>Hapus murid</button></div>

      {edit && <MuridForm awal={m} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reloadAll(); }} />}
      {les && <JadwalModal students={[m]} tutors={tu.rows} date={today} tid="" muridId={m.id} onClose={() => setLes(false)} onSaved={() => { setLes(false); reloadAll(); }} />}
    </Shell>
  );
}