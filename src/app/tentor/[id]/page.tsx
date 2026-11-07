"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import TentorForm from "@/components/TentorForm";
import SesiModal from "@/components/SesiModal";
import { supabase, useQuery, rp, localDate, hhmm, Student, Tutor, Session } from "@/lib/db";

type TutorX = Tutor & { attend_token?: string | null; attend_pin?: string | null; attend_on?: boolean };
const shift = (d: string, n: number) => { const x = new Date(d + "T00:00"); x.setDate(x.getDate() + n); return x.toLocaleDateString("sv-SE"); };
const nextMonth = (m: string) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const noWa = (p: string) => p.replace(/\D/g, "").replace(/^0/, "62");

export default function DetailTentor() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const today = localDate();
  const bulan = today.slice(0, 7);
  const [origin, setOrigin] = useState("");
  const [salin, setSalin] = useState(false);
  const [edit, setEdit] = useState(false);
  const [sesiModal, setSesiModal] = useState<{ sesi: Session | null } | null>(null);
  useEffect(() => setOrigin(location.origin), []);

  const tu = useQuery<TutorX>(() => supabase.from("tutors").select("*").eq("id", id), [id]);
  const st = useQuery<Student>(() => supabase.from("students").select("*").order("name"), []);
  const mendatang = useQuery<Session>(() => supabase.from("sessions").select("*").eq("tutor_id", id).gte("date", today).lte("date", shift(today, 13)).order("date").order("time"), [id]);
  const hadirBulan = useQuery<Session>(() => supabase.from("sessions").select("*").eq("tutor_id", id).eq("attended", true).gte("date", `${bulan}-01`).lt("date", `${nextMonth(bulan)}-01`), [id]);

  const t = tu.rows[0];
  if (tu.loading) return <Shell><p className="empty">Memuat…</p></Shell>;
  if (!t) return <Shell><div className="card empty"><b>Tentor tidak ditemukan</b><p><Link href="/tentor">Kembali ke daftar tentor</Link></p></div></Shell>;

  const stu = (sid: string) => st.rows.find((s) => s.id === sid);
  const bagiHasil = t.pay_scheme === "bagi_hasil";
  const honor = bagiHasil
    ? hadirBulan.rows.reduce((a, x) => { const s = stu(x.student_id); return a + (s && s.quota_total > 0 ? (s.price / s.quota_total) * (100 - (t.cut_percent ?? 0)) / 100 : 0); }, 0)
    : hadirBulan.rows.length * t.rate;
  const link = t.attend_token ? `${origin}/absen/${t.attend_token}` : "";
  const reloadAll = () => { tu.reload(); mendatang.reload(); hadirBulan.reload(); };

  async function buatLink() {
    if (t.attend_token && !confirm("Link dan PIN lama tidak akan berlaku lagi. Lanjutkan?")) return;
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    const pin = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, "0");
    const { error } = await supabase.from("tutors").update({ attend_token: token, attend_pin: pin, attend_on: true, attend_fails: 0 }).eq("id", t.id);
    if (error) return alert(error.message.includes("column") ? "Kolom baru belum ada di Supabase. Jalankan SQL langkah 1 dulu." : error.message);
    tu.reload();
  }
  async function aktifkan(on: boolean) { await supabase.from("tutors").update({ attend_on: on, attend_fails: 0 }).eq("id", t.id); tu.reload(); }
  async function salinLink() { await navigator.clipboard.writeText(link); setSalin(true); setTimeout(() => setSalin(false), 1800); }
  async function hapus() { if (confirm(`Hapus ${t.name}? Jadwalnya ikut terhapus.`)) { await supabase.from("tutors").delete().eq("id", t.id); r.replace("/tentor"); } }
  const waLink = `https://wa.me/${noWa(t.phone || "")}?text=${encodeURIComponent(`Halo ${t.name}, ini link absen Si-Bimbel:\n${link}\nPIN: ${t.attend_pin}\n\nBuka dari HP, masukkan PIN, lalu centang hadir tiap selesai les.`)}`;
  const chatLink = `https://wa.me/${noWa(t.phone || "")}`;

  return (
    <Shell>
      <div className="dhead">
        <Link href="/tentor" className="back" aria-label="Kembali">‹</Link>
        <div className="grow"><h1>{t.name}</h1><div className="meta">{t.subjects || "Mapel belum diisi"}</div></div>
        <button className="btn ghost sm" onClick={() => setEdit(true)}>✎ Ubah</button>
      </div>

      <div className="linkcard">
        <b>Link absen tentor</b>
        {!t.attend_token ? (
          <>
            <p className="meta">Tentor buka link dari HP (tanpa install, tanpa akun), masukkan PIN, lalu centang hadir tiap selesai les. Jadwal hari itu juga ada di situ.</p>
            <button className="btn sm" onClick={buatLink}>Buat link absen</button>
          </>
        ) : (
          <>
            <p className="meta">{t.attend_on ? "Tentor buka link ini dari HP, masukkan PIN, lalu centang hadir tiap selesai les." : "Link sedang dimatikan. Tentor tidak bisa membukanya."}</p>
            <div className="linkbox"><span className="grow">{link}</span><button className="btn ghost sm" onClick={salinLink}>{salin ? "Tersalin" : "Salin"}</button></div>
            <div className="meta">PIN: <b style={{ color: "var(--ink)", fontFamily: "ui-monospace,Consolas,monospace" }}>{t.attend_pin}</b></div>
            <div className="acts" style={{ marginTop: 12 }}>
              {t.phone && <a className="btn wa sm" target="_blank" rel="noopener noreferrer" href={waLink}>Kirim ke WA tentor</a>}
              <button className="btn ghost sm" onClick={buatLink}>Ganti link &amp; PIN</button>
              <button className="btn ghost sm" onClick={() => aktifkan(!t.attend_on)}>{t.attend_on ? "Matikan" : "Aktifkan"}</button>
            </div>
          </>
        )}
      </div>

      <div className="two">
        <div className="card"><span className="meta">Skema honor</span><b style={{ display: "block", fontSize: 18 }}>{bagiHasil ? `Bagi hasil · lembaga ${t.cut_percent ?? 0}%` : `${rp(t.rate)}/pertemuan`}</b></div>
        <div className="card"><span className="meta">Honor bulan ini</span><b style={{ display: "block", fontSize: 18 }}>{rp(honor)} <span className="meta">· {hadirBulan.rows.length} hadir</span></b></div>
      </div>

      <div className="sec"><h2>Jadwal mengajar <span className="mute">· {mendatang.rows.length} sesi, 14 hari ke depan</span></h2><button className="btn sm" onClick={() => setSesiModal({ sesi: null })}>+ Tambah jadwal</button></div>
      {mendatang.rows.length === 0 ? <div className="card empty">Belum ada jadwal dalam 14 hari ke depan.</div> : (
        <div className="card flush">
          {mendatang.rows.map((x) => { const s = stu(x.student_id); return (
            <div className="jrow" key={x.id}>
              <div className="jday"><b>{new Date(x.date + "T00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</b><small>{hhmm(x.time)}</small></div>
              <div className="grow"><div className="name">{s?.name ?? "Murid dihapus"}</div><div className="meta">{s?.package_name}</div></div>
              <button className="btn ghost sm" onClick={() => setSesiModal({ sesi: x })}>✎ Ubah jam</button>
            </div>); })}
        </div>
      )}

      <div className="sec"><h2>Rentang jam bisa ngajar <span className="mute">· {(t.availability ?? []).length} slot</span></h2><button className="btn ghost sm" onClick={() => setEdit(true)}>✎ Ubah / Tambah jam</button></div>
      <div className="card">
        {(t.availability ?? []).length === 0 ? <span className="meta">Jam mengajar belum diatur.</span> : <div className="tags">{(t.availability ?? []).map((s, i) => <span className="tag" key={i}>{s.day} {s.start}–{s.end}</span>)}</div>}
        <p className="hint">Dipakai untuk mengecek kecocokan saat membuat jadwal les.</p>
      </div>

      <div className="acts" style={{ marginTop: 18 }}>
        {t.phone && <a className="btn wa" target="_blank" rel="noopener noreferrer" href={chatLink}>Chat tentor</a>}
        <button className="btn ghost" style={{ color: "var(--bad)" }} onClick={hapus}>Hapus tentor</button>
      </div>

      {edit && <TentorForm awal={t} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reloadAll(); }} />}
      {sesiModal && <SesiModal students={st.rows} tutorId={t.id} sesi={sesiModal.sesi} tanggal={today} onClose={() => setSesiModal(null)} onSaved={() => { setSesiModal(null); reloadAll(); }} />}
    </Shell>
  );
}