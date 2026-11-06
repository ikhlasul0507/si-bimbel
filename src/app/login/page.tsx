"use client";
import "./login.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db";

type Msg = { t: "err" | "ok"; s: string } | null;

const Ico = {
  mail: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 8 8 6 8-6" /></svg>,
  lock: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="3" /><path d="M8 10V8a4 4 0 0 1 8 0v2" /></svg>,
  google: (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  ),
};

export default function Login() {
  const r = useRouter();
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const emailOk = /\S+@\S+\.\S+/.test(email);
  const valid = emailOk && pw.length >= 6;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true); setMsg(null);
    if (mode === "masuk") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg({ t: "err", s: "Email atau kata sandi salah." });
      else r.replace("/beranda");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: pw });
      if (error) setMsg({ t: "err", s: error.message });
      else if (data.session) r.replace("/beranda");
      else setMsg({ t: "ok", s: "Akun dibuat. Cek email kamu untuk konfirmasi, lalu masuk." });
    }
    setBusy(false);
  }

  async function google() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + "/beranda" } });
    if (error) setMsg({ t: "err", s: "Login Google belum diaktifkan di Supabase." });
  }

  return (
    <div className="lg">
      <section className="lg-hero">
        <div className="lg-brand"><span className="lg-logo">S</span>Si-Bimbel</div>
        <div className="lg-copy">
          <h2>Kelola les tanpa ribet.</h2>
          <p>Absen tentor dari HP, kuota paket terhitung otomatis, tagih orang tua lewat WhatsApp, honor beres tiap akhir bulan.</p>
          <ul className="lg-feats">
            <li>Absensi sekali ketuk</li>
            <li>Kuota paket otomatis</li>
            <li>Tagihan via WhatsApp</li>
          </ul>
        </div>
        <div className="lg-mock" aria-hidden="true">
          <div className="lg-mock-h">Hari ini · 3 sesi</div>
          {[["14:00", "Alya Putri", true], ["15:30", "Raka Pratama", true], ["19:00", "Dimas Aditya", false]].map(([t, n, ok]) => (
            <div className="lg-mock-r" key={String(n)}>
              <span className={ok ? "lg-dot on" : "lg-dot"}>{ok ? "✓" : ""}</span>
              <span className="lg-mock-n">{n}</span><span className="lg-mock-t">{t}</span>
            </div>
          ))}
        </div>
      </section>

      <main className="lg-panel">
        <div className="lg-card">
          <div className="lg-seg" role="group" aria-label="Pilih masuk atau daftar">
            <button type="button" aria-pressed={mode === "masuk"} onClick={() => { setMode("masuk"); setMsg(null); }}>Masuk</button>
            <button type="button" aria-pressed={mode === "daftar"} onClick={() => { setMode("daftar"); setMsg(null); }}>Daftar</button>
          </div>
          <h1>{mode === "masuk" ? "Selamat datang kembali" : "Buat akun baru"}</h1>
          <p className="lg-sub">{mode === "masuk" ? "Masuk untuk mengelola jadwal, tagihan, dan honor." : "Mulai kelola les privat atau bimbelmu hari ini."}</p>

          <button type="button" className="lg-google" onClick={google}>{Ico.google}Lanjut dengan Google</button>
          <div className="lg-or"><span>atau pakai email</span></div>

          <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
            <label htmlFor="em">Email</label>
            <div className="lg-field">{Ico.mail}
              <input id="em" type="email" autoComplete="email" inputMode="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <label htmlFor="pw">Kata sandi</label>
            <div className="lg-field">{Ico.lock}
              <input id="pw" type={showPw ? "text" : "password"} autoComplete={mode === "masuk" ? "current-password" : "new-password"} placeholder="Minimal 6 karakter" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button type="button" className="lg-eye" onClick={() => setShowPw(!showPw)} aria-pressed={showPw}>{showPw ? "Sembunyikan" : "Tampilkan"}</button>
            </div>
            {msg && <div className={`lg-msg ${msg.t}`} role={msg.t === "err" ? "alert" : "status"}>{msg.s}</div>}
            <button type="submit" className="lg-submit" disabled={!valid || busy}>
              {busy ? "Memproses…" : mode === "masuk" ? "Masuk" : "Buat akun"}
            </button>
          </form>

          <p className="lg-foot">
            {mode === "masuk" ? "Belum punya akun? " : "Sudah punya akun? "}
            <button type="button" onClick={() => { setMode(mode === "masuk" ? "daftar" : "masuk"); setMsg(null); }}>{mode === "masuk" ? "Daftar gratis" : "Masuk"}</button>
          </p>
        </div>
      </main>
    </div>
  );
}