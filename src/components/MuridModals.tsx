"use client";
import { useEffect, useState } from "react";
import { supabase, localDate, Student } from "@/lib/db";
import { geserBulan, geserHari, namaBulan, batasBulan, noWa, ribu, angka, pastikanPortal, pesanRapor, pesanTagihan, usePengaturan } from "@/lib/app";

type MuridP = Student & { portal_token?: string | null };
const Kepala = ({ judul, onClose }: { judul: string; onClose: () => void }) => (
  <div className="mhead"><h2>{judul}</h2><button className="btn ghost sm" aria-label="Tutup" onClick={onClose}>✕</button></div>
);

export function NilaiModal({ murid, onClose, onSaved }: { murid: Student; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ date: localDate(), title: "", subject: "", score: "", max: "100", note: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function simpan() {
    setErr("");
    const sc = Number(f.score), mx = Number(f.max);
    if (!f.title.trim()) return setErr("Isi judul, misalnya Ulangan harian bab 3.");
    if (f.score === "" || isNaN(sc) || !mx || sc < 0 || sc > mx) return setErr("Nilai harus berupa angka dan tidak boleh lebih besar dari nilai maksimal.");
    setBusy(true);
    const { error } = await supabase.from("scores").insert({ student_id: murid.id, date: f.date, title: f.title.trim(), subject: f.subject.trim() || null, score: sc, max_score: mx, note: f.note.trim() || null });
    setBusy(false);
    if (error) return setErr(/scores|relation/.test(error.message) ? "Tabel baru belum ada di Supabase. Jalankan SQL dulu." : error.message);
    onSaved();
  }
  return (
    <div className="ov" onClick={onClose}>
      <div className="dlg full" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <Kepala judul="Input nilai" onClose={onClose} />
        <div className="mbody">
          <div className="grp"><b>{murid.name}</b></div>
          <label htmlFor="n1" style={{ marginTop: 0 }}>Tanggal</label><input id="n1" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <div className="two">
            <div><label htmlFor="n2">Judul</label><input id="n2" placeholder="Ulangan harian bab 3" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div><label htmlFor="n3">Mapel</label><input id="n3" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></div>
          </div>
          <div className="two">
            <div><label htmlFor="n4">Nilai</label><input id="n4" inputMode="decimal" placeholder="85" value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} /></div>
            <div><label htmlFor="n5">Dari (maksimal)</label><input id="n5" inputMode="decimal" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /></div>
          </div>
          <label htmlFor="n6">Catatan buat murid & ortu (opsional)</label>
          <textarea id="n6" rows={3} placeholder="mis. Udah paham konsepnya, masih suka salah hitung di langkah akhir." value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          {err && <div className="err" role="alert">{err}</div>}
        </div>
        <div className="mfoot"><button className="btn full" style={{ margin: 0 }} disabled={busy} onClick={simpan}>{busy ? "Menyimpan…" : "Simpan nilai"}</button></div>
      </div>
    </div>
  );
}

export function TagihanModal({ murid, mapel, onClose, onSaved }: { murid: Student; mapel: string; onClose: () => void; onSaved: () => void }) {
  const { p } = usePengaturan();
  const bulanIni = namaBulan(localDate().slice(0, 7));
  const [jenis, setJenis] = useState("spp");
  const [judul, setJudul] = useState(`SPP ${mapel || "les"} ${bulanIni}`);
  const [total, setTotal] = useState(murid.price || 0);
  const [due, setDue] = useState(geserHari(localDate(), 10));
  const [dp, setDp] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const gantiJenis = (j: string) => { setJenis(j); setJudul(j === "spp" ? `SPP ${mapel || "les"} ${bulanIni}` : "Uang Pendaftaran / Modul"); };

  async function simpan() {
    setErr("");
    if (!judul.trim()) return setErr("Isi keterangan tagihan.");
    if (total <= 0) return setErr("Total tagihan harus lebih dari 0.");
    if (dp < 0 || dp > total) return setErr("Jumlah yang sudah dibayar tidak boleh lebih besar dari total.");
    setBusy(true);
    const { error } = await supabase.from("invoices").insert({ student_id: murid.id, kind: jenis, title: judul.trim(), amount: total, paid_amount: dp, due_date: due || null });
    setBusy(false);
    if (error) return setErr(/invoices|relation/.test(error.message) ? "Tabel baru belum ada di Supabase. Jalankan SQL dulu." : error.message);
    onSaved();
  }
  return (
    <div className="ov" onClick={onClose}>
      <div className="dlg full" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <Kepala judul="Buat tagihan baru" onClose={onClose} />
        <div className="mbody">
          <div className="two">
            <div><label style={{ marginTop: 0 }}>Murid</label><input value={murid.name} disabled /></div>
            <div><label htmlFor="t1" style={{ marginTop: 0 }}>Jenis tagihan</label><select id="t1" value={jenis} onChange={(e) => gantiJenis(e.target.value)}><option value="spp">SPP / Paket bulanan</option><option value="lain">Pendaftaran / Modul / Lainnya</option></select></div>
          </div>
          <label htmlFor="t2">Keterangan tagihan</label><input id="t2" value={judul} onChange={(e) => setJudul(e.target.value)} />
          <div className="two">
            <div><label htmlFor="t3">Total tagihan</label><input id="t3" inputMode="numeric" value={ribu(total)} onChange={(e) => setTotal(angka(e.target.value))} /></div>
            <div><label htmlFor="t4">Jatuh tempo</label><input id="t4" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          </div>
          <label htmlFor="t5">Sudah dibayar / DP / Cicilan (opsional)</label>
          <input id="t5" inputMode="numeric" placeholder="0 (belum ada DP)" value={ribu(dp)} onChange={(e) => setDp(angka(e.target.value))} />
          <p className="hint">Isi kalau wali murid baru bayar DP atau nyicil sebagian.</p>
          <details className="grp"><summary><b>Lihat isi pesan WA</b></summary><pre className="pesan">{pesanTagihan(p, murid.parent_name, murid.name, judul, total, total - dp, due)}</pre></details>
          {err && <div className="err" role="alert">{err}</div>}
        </div>
        <div className="mfoot"><button className="btn full" style={{ margin: 0 }} disabled={busy} onClick={simpan}>{busy ? "Menyimpan…" : "Simpan tagihan"}</button></div>
      </div>
    </div>
  );
}

export function PortalModal({ murid, onClose, onToken }: { murid: MuridP; onClose: () => void; onToken: () => void }) {
  const [token, setToken] = useState<string | null>(murid.portal_token ?? null);
  const [salin, setSalin] = useState(false);
  const { p } = usePengaturan();
  useEffect(() => { if (!token) pastikanPortal(murid).then((t) => { setToken(t); onToken(); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const link = token ? `${location.origin}/portal/${token}` : "";
  const teks = (nama: string) => encodeURIComponent(`Halo ${nama}, ini portal belajar ${murid.name} di ${p.inst_name}: kehadiran, nilai, rapor bulanan, dan tagihan.\n${link}`);
  const ortu = murid.phone, anak = (murid as { student_phone?: string | null }).student_phone;
  return (
    <div className="ov" onClick={onClose}>
      <div className="dlg" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="row"><h2 className="grow" style={{ margin: 0 }}>Portal · {murid.name}</h2><button className="btn ghost sm" aria-label="Tutup" onClick={onClose}>✕</button></div>
        <p className="meta" style={{ marginTop: 10 }}>Satu link buat ortu dan murid. Isinya kehadiran, materi tiap pertemuan, nilai, rapor bulanan, dan tagihan yang belum dibayar. Dibuka di HP mana aja, tanpa daftar.</p>
        {!token ? <p className="meta">Membuat link…</p> : (
          <div className="acts" style={{ flexDirection: "column" }}>
            {ortu ? <a className="btn wa" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${noWa(ortu)}?text=${teks(murid.parent_name ? "Bapak/Ibu " + murid.parent_name : "Bapak/Ibu")}`}>Kirim ke WA ortu</a> : <button className="btn ghost" disabled>WA ortu belum diisi</button>}
            {anak ? <a className="btn wa" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${noWa(anak)}?text=${teks(murid.name)}`}>Kirim ke WA murid</a> : null}
            <div className="two"><button className="btn ghost" onClick={async () => { await navigator.clipboard.writeText(link); setSalin(true); setTimeout(() => setSalin(false), 1800); }}>{salin ? "Tersalin" : "Salin link"}</button><a className="btn ghost" target="_blank" rel="noopener noreferrer" href={link}>Buka portal</a></div>
          </div>
        )}
      </div>
    </div>
  );
}

export function RaporModal({ murid, onClose, onToken }: { murid: MuridP; onClose: () => void; onToken: () => void }) {
  const { p } = usePengaturan();
  const [bulan, setBulan] = useState(localDate().slice(0, 7));
  const [catatan, setCatatan] = useState("");
  const [hadir, setHadir] = useState(0);
  const [total, setTotal] = useState(0);
  const [rata, setRata] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(murid.portal_token ?? null);

  useEffect(() => { if (!token) pastikanPortal(murid).then((t) => { setToken(t); onToken(); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const { dari, sampai } = batasBulan(bulan);
    (async () => {
      const s = await supabase.from("sessions").select("outcome").eq("student_id", murid.id).gte("date", dari).lt("date", sampai).not("outcome", "is", null);
      const rows = (s.data ?? []) as { outcome: string }[];
      setTotal(rows.length); setHadir(rows.filter((x) => x.outcome === "hadir").length);
      const n = await supabase.from("scores").select("score,max_score").eq("student_id", murid.id).gte("date", dari).lt("date", sampai);
      const sc = (n.data ?? []) as { score: number; max_score: number }[];
      setRata(sc.length ? Math.round((sc.reduce((a, x) => a + (x.score / x.max_score) * 100, 0) / sc.length) * 10) / 10 : null);
      const c = await supabase.from("report_notes").select("note").eq("student_id", murid.id).eq("month", bulan).maybeSingle();
      setCatatan(c.data?.note ?? "");
    })();
  }, [bulan, murid.id]);

  async function simpanCatatan() {
    const ada = await supabase.from("report_notes").select("month").eq("student_id", murid.id).eq("month", bulan).maybeSingle();
    if (ada.data) await supabase.from("report_notes").update({ note: catatan }).eq("student_id", murid.id).eq("month", bulan);
    else await supabase.from("report_notes").insert({ student_id: murid.id, month: bulan, note: catatan });
  }
  const link = token ? `${location.origin}/portal/${token}?b=${bulan}` : "";
  const pesan = pesanRapor(p, murid.parent_name, murid.name, bulan, hadir, total, rata, catatan, link);

  return (
    <div className="ov" onClick={onClose}>
      <div className="dlg full" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <Kepala judul={`Rapor · ${murid.name}`} onClose={onClose} />
        <div className="mbody">
          <div className="datenav" style={{ margin: "0 auto 12px", width: "fit-content" }}>
            <button aria-label="Bulan sebelumnya" onClick={() => setBulan(geserBulan(bulan, -1))}>‹</button>
            <b style={{ padding: "0 14px" }}>{namaBulan(bulan)}</b>
            <button aria-label="Bulan berikutnya" onClick={() => setBulan(geserBulan(bulan, 1))}>›</button>
          </div>
          <label htmlFor="r1" style={{ marginTop: 0 }}>Catatan perkembangan (opsional)</label>
          <textarea id="r1" rows={3} placeholder="mis. Bulan ini lebih cepat ngerjain soal cerita. Perlu latihan pembagian bersusun." value={catatan} onChange={(e) => setCatatan(e.target.value)} onBlur={simpanCatatan} />
          <p className="hint">Tersimpan otomatis per bulan dan ikut tampil di halaman rapor yang dibuka ortu.</p>
          <pre className="pesan">{pesan}</pre>
        </div>
        <div className="mfoot acts" style={{ flexWrap: "nowrap" }}>
          {murid.phone ? <a className="btn wa grow" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${noWa(murid.phone)}?text=${encodeURIComponent(pesan)}`}>Kirim WA ortu</a> : <span className="meta grow">WA ortu belum diisi</span>}
          <a className="btn grow" target="_blank" rel="noopener noreferrer" href={link || "#"}>Lihat rapor</a>
        </div>
      </div>
    </div>
  );
}