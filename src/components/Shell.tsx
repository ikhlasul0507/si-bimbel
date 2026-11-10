"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/db";

const IC: Record<string, React.ReactNode> = {
  today: <><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18m-12 6 2 2 4-4" /></>,
  week: <><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  murid: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M17 4.8a3.5 3.5 0 0 1 0 6.4M21.5 20c0-2.8-1.6-4.9-4-5.7" /></>,
  tentor: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  tagihan: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  bulan: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M16 15h2" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
  out: <><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9" /></>,
};
const Ico = ({ n }: { n: string }) => <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">{IC[n]}</svg>;

type Item = { href?: string; icon: string; label: string };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Operasional harian", items: [{ href: "/beranda", icon: "today", label: "Hari ini" }, { href: "/jadwal", icon: "week", label: "Jadwal mingguan" }] },
  { title: "Akademik & keuangan", items: [{ href: "/murid", icon: "murid", label: "Murid" }, { href: "/tentor", icon: "tentor", label: "Tentor" }, { href: "/tagihan", icon: "tagihan", label: "Tagihan" }, { href: "/akhir-bulan", icon: "bulan", label: "Akhir bulan" }] },
  { title: "Lembaga & sistem", items: [{ href: "/pengaturan", icon: "gear", label: "Branding & pembayaran" }] },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const r = useRouter();
  const path = usePathname();
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
  const keluar = () => supabase.auth.signOut();

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="blogo">S</span>Si-Bimbel</div>
        <div className="ws"><span className="avatar">{(email[0] || "S").toUpperCase()}</span><div><b>Si-Bimbel</b><small>{email}</small></div></div>
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="gtitle">{g.title}</div>
            {g.items.map((it) => it.href ? (
              <Link key={it.label} href={it.href} className="mi" aria-current={path === it.href || path.startsWith(it.href + "/") ? "page" : undefined}><Ico n={it.icon} />{it.label}</Link>
            ) : (
              <span key={it.label} className="mi off" aria-disabled="true"><Ico n={it.icon} />{it.label}<em>Segera</em></span>
            ))}
          </div>
        ))}
        <button className="mi out" onClick={keluar}><Ico n="out" />Keluar</button>
      </aside>
      <main className="main"><div className="page">{children}</div></main>
      <nav className="mnav" aria-label="Menu utama">
        <Link href="/beranda" aria-current={path === "/beranda" || path.startsWith("/beranda/") ? "page" : undefined}><Ico n="today" />Hari ini</Link>
        <Link href="/jadwal" aria-current={path === "/jadwal" || path.startsWith("/jadwal/") ? "page" : undefined}><Ico n="week" />Mingguan</Link>
        <Link href="/murid" aria-current={path === "/murid" || path.startsWith("/murid/") ? "page" : undefined}><Ico n="murid" />Murid</Link>
        <Link href="/tentor" aria-current={path === "/tentor" || path.startsWith("/tentor/") ? "page" : undefined}><Ico n="tentor" />Tentor</Link>
        <Link href="/tagihan" aria-current={path === "/tagihan" || path.startsWith("/tagihan/") ? "page" : undefined}><Ico n="tagihan" />Tagihan</Link>
        <button onClick={keluar}><Ico n="out" />Keluar</button>
      </nav>
    </div>
  );
}
