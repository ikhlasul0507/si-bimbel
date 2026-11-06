"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db";

export default function Beranda() {
  const r = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) r.replace("/login");
      else setEmail(data.session.user.email ?? "");
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { if (!s) r.replace("/login"); });
    return () => data.subscription.unsubscribe();
  }, [r]);

  if (email === null) return <p className="empty">Memuat…</p>;
  return (
    <main className="wrap">
      <div className="logo">K</div>
      <h1>Login berhasil</h1>
      <p className="sub">Kamu masuk sebagai <b>{email}</b>. Halaman ini sementara. Menu murid, tentor, absensi, dan tagihan akan ditambahkan di langkah berikutnya.</p>
      <button className="btn" onClick={() => supabase.auth.signOut()}>Keluar</button>
    </main>
  );
}
