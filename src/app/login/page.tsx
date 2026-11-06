"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db";

export default function Login() {
  const r = useRouter();
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMsg("");
    if (mode === "masuk") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg("Email atau kata sandi salah."); else r.replace("/beranda");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: pw });
      if (error) setMsg(error.message);
      else if (data.session) r.replace("/beranda");
      else setMsg("Akun dibuat. Cek email kamu untuk konfirmasi, lalu masuk.");
    }
    setBusy(false);
  }
  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + "/beranda" } });
    if (error) setMsg("Login Google belum diaktifkan di Supabase.");
  }

  return (
    <div className="login">
      <div className="logo">K</div>
      <h1>{mode === "masuk" ? "Masuk ke KelasKu" : "Buat akun KelasKu"}</h1>
      <p className="sub">Absensi tentor, kuota paket, tagihan orang tua, dan honor dalam satu aplikasi.</p>
      <button className="btn ghost full" onClick={google}>Masuk pakai Google</button>
      <p className="or">atau pakai email</p>
      <label htmlFor="em">Email</label>
      <input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="pw">Kata sandi</label>
      <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      {msg && <p className="meta" role="alert" style={{ color: "var(--bad)" }}>{msg}</p>}
      <button className="btn full" disabled={busy || !email || pw.length < 6} onClick={submit}>{mode === "masuk" ? "Masuk" : "Daftar"}</button>
      <button className="btn ghost full" onClick={() => { setMode(mode === "masuk" ? "daftar" : "masuk"); setMsg(""); }}>
        {mode === "masuk" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
      </button>
    </div>
  );
}
