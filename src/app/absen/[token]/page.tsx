"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { supabase, localDate } from "@/lib/db";

type Sesi = { id: string; time: string; attended: boolean; murid: string; paket: string };

export default function Absen() {
  const { token } = useParams<{ token: string }>();
  const [pin, setPin] = useState("");
  const [data, setData] = useState<{ tentor: string; sesi: Sesi[] } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function buka() {
    setBusy(true); setErr("");
    const { data: d, error } = await supabase.rpc("absen_buka", { p_token: token, p_pin: pin, p_date: localDate() });
    setBusy(false);
    if (error || !d?.ok) return setErr("PIN salah atau link tidak aktif. Setelah 5 kali salah, link terkunci dan perlu diganti oleh admin.");
    setData(d);
  }
  async function catat(s: Sesi) {
    const { data: ok } = await supabase.rpc("absen_catat", { p_token: token, p_pin: pin, p_session: s.id, p_attended: !s.attended });
    if (!ok) return alert("Tidak bisa dicatat. Kuota murid mungkin sudah habis, hubungi admin.");
    buka();
  }

  return (
    <div className="pub">
      <div className="brand"><span className="blogo">S</span>Si-Bimbel</div>
      {!data ? (
        <div className="card">
          <h1 style={{ fontSize: 22 }}>Absen tentor</h1>
          <p className="sub">Masukkan PIN dari admin untuk melihat jadwal hari ini.</p>
          <label htmlFor="pin">PIN</label>
          <input id="pin" inputMode="numeric" maxLength={4} autoComplete="one-time-code" placeholder="4 angka" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && buka()} />
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn full" disabled={busy || pin.length !== 4} onClick={buka}>{busy ? "Memeriksa…" : "Buka jadwal"}</button>
        </div>
      ) : (
        <>
          <h1 style={{ fontSize: 22 }}>Halo, {data.tentor}</h1>
          <p className="sub">{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}. Centang hadir setelah selesai les.</p>
          {data.sesi.length === 0 ? <div className="card empty">Tidak ada jadwal les hari ini.</div> : data.sesi.map((s) => (
            <div className="card row" key={s.id}>
              <div className="stime">{s.time.slice(0, 5)}</div>
              <div className="grow"><div className="name">{s.murid}</div><div className="meta">{s.paket}</div></div>
              <button className={`btn sm${s.attended ? " done" : ""}`} onClick={() => catat(s)}>{s.attended ? "✓ Hadir" : "Centang hadir"}</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}