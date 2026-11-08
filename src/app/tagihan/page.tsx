"use client";
import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { supabase, useQuery, rp, Student } from "@/lib/db";
import { Invoice, sisaTagihan, noWa, pesanTagihan, usePengaturan, tglPendek } from "@/lib/app";

export default function Tagihan() {
  const iv = useQuery<Invoice>(() => supabase.from("invoices").select("*").order("due_date"), []);
  const st = useQuery<Student>(() => supabase.from("students").select("*"), []);
  const { p } = usePengaturan();
  const [tab, setTab] = useState<"belum" | "lunas">("belum");
  const murid = (id: string) => st.rows.find((s) => s.id === id);
  const belum = iv.rows.filter((i) => sisaTagihan(i) > 0);
  const lunas = iv.rows.filter((i) => sisaTagihan(i) <= 0);
  const daftar = tab === "belum" ? belum : lunas;
  const total = belum.reduce((a, i) => a + sisaTagihan(i), 0);
  const tandaiLunas = async (i: Invoice) => { await supabase.from("invoices").update({ paid_amount: i.amount }).eq("id", i.id); iv.reload(); };
  const telat = (i: Invoice) => i.due_date && i.due_date < new Date().toLocaleDateString("sv-SE");

  return (
    <Shell>
      <h1>Tagihan</h1>
      <p className="sub">Piutang belum masuk: <b>{rp(total)}</b> dari {belum.length} tagihan.</p>
      <div className="seg" style={{ width: "fit-content", marginBottom: 14 }} role="group" aria-label="Status tagihan">
        <button aria-pressed={tab === "belum"} onClick={() => setTab("belum")}>Belum ({belum.length})</button>
        <button aria-pressed={tab === "lunas"} onClick={() => setTab("lunas")}>Lunas ({lunas.length})</button>
      </div>
      {iv.loading ? <p className="empty">Memuat…</p> : daftar.length === 0 ? <div className="card empty">Tidak ada tagihan di tab ini. Buat tagihan dari halaman detail murid.</div> : daftar.map((i) => {
        const m = murid(i.student_id);
        return (
          <div className="card" key={i.id}>
            <div className="row"><div className="grow"><Link href={`/murid/${i.student_id}`}><b>{m?.name ?? "Murid dihapus"}</b></Link><div className="meta">{i.title}{i.due_date ? ` · jatuh tempo ${tglPendek(i.due_date)}` : ""}</div></div>
              <div style={{ textAlign: "right" }}><b>{rp(sisaTagihan(i) > 0 ? sisaTagihan(i) : i.amount)}</b>{sisaTagihan(i) > 0 && <div><span className={`pill ${telat(i) ? "bad" : "warn"}`}>{telat(i) ? "Lewat tempo" : i.paid_amount > 0 ? "Sebagian" : "Belum"}</span></div>}</div></div>
            {sisaTagihan(i) > 0 && (
              <div className="acts" style={{ marginTop: 10, justifyContent: "flex-end" }}>
                {m?.phone && <a className="btn wa sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${noWa(m.phone)}?text=${encodeURIComponent(pesanTagihan(p, m.parent_name, m.name, i.title, i.amount, sisaTagihan(i), i.due_date))}`}>Tagih via WA</a>}
                <button className="btn ghost sm" onClick={() => tandaiLunas(i)}>Tandai lunas</button>
              </div>
            )}
          </div>
        );
      })}
    </Shell>
  );
}