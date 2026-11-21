"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight,
  ClipboardList, FileClock, FileText, HelpCircle, Home, LockKeyhole, Plus, Printer,
  ShieldCheck, Users, X,
} from "lucide-react";
import { calculateScore, type ScoredAnswer } from "@/lib/assessment";
import {
  DEMO_INSTITUTION_ID, DEMO_STORE_KEY, demoSeed, displayDate, makeDemoId,
  safeReadDemoStore, type DemoAuditEvent, type DemoInstitution, type DemoInvite,
  type DemoModule, type DemoQuestion, type DemoRole, type DemoStore, type DemoStudy,
  type WorkflowStatus,
} from "@/lib/demo-store";

const roleNames: Record<DemoRole, string> = {
  PARTICIPANT: "Peserta / calon peserta",
  RESEARCHER: "Peneliti",
  CLINICAL_REVIEWER: "Reviewer klinis",
  INSTITUTION_ADMIN: "Admin institusi",
  SUPER_ADMIN: "Super admin",
};

const topicNames: Record<string, string> = {
  RESEARCH_PURPOSE: "Tujuan penelitian",
  RESEARCH_PROCEDURE: "Prosedur penelitian",
  POTENTIAL_BENEFITS: "Manfaat potensial",
  POTENTIAL_RISKS: "Risiko potensial",
  PARTICIPANT_RIGHTS: "Hak peserta",
  TEACH_BACK: "Teach-back",
};

const learnerFeedback: Record<string, string> = {
  RESEARCH_PURPOSE: "Penelitian dirancang untuk menjawab pertanyaan tertentu. Hasil dan manfaat bagi setiap orang tidak dapat dijamin.",
  RESEARCH_PROCEDURE: "Prosedur, jumlah kunjungan, dan durasi berbeda antarpenelitian. Periksa dokumen studi yang disetujui dan tanyakan kepada tim.",
  POTENTIAL_BENEFITS: "Manfaat potensial bukan jaminan. Tanyakan manfaat yang diharapkan dan hal yang masih belum pasti.",
  POTENTIAL_RISKS: "Risiko spesifik harus dijelaskan dari informasi studi yang ditinjau. Jangan menyimpulkan risiko dari penelitian lain.",
  PARTICIPANT_RIGHTS: "Keikutsertaan bersifat sukarela. Anda dapat menyampaikan pertanyaan atau keputusan kepada tim penelitian.",
};

type DemoPageProps = { path: string };

function useDemoStore() {
  const [store, setStore] = useState<DemoStore>(demoSeed);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const loaded = safeReadDemoStore(window.localStorage.getItem(DEMO_STORE_KEY));
      setStore(loaded);
      if (!window.localStorage.getItem(DEMO_STORE_KEY)) window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(loaded));
    } catch {
      setStore(demoSeed);
    }
    setReady(true);
  }, []);
  function save(next: DemoStore) {
    setStore(next);
    try { window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(next)); } catch { /* Private browsing can disable local storage. */ }
  }
  return { store, save, ready };
}

function auditEvent(store: DemoStore, action: string, target: string): DemoAuditEvent[] {
  const actor = roleNames[store.currentRole];
  return [{ id: makeDemoId("audit"), institutionId: store.activeInstitutionId, action, target, actor, at: new Date().toISOString() }, ...store.audit].slice(0, 100);
}

function belongsToInstitution(item: { institutionId?: string }, institutionId: string) {
  return (item.institutionId ?? DEMO_INSTITUTION_ID) === institutionId;
}

function field(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function StatusPill({ status }: { status: string }) {
  const label: Record<string, string> = {
    DRAFT: "Draf", SUBMITTED_FOR_REVIEW: "Menunggu review", REVISION_REQUESTED: "Perlu revisi",
    APPROVED: "Disetujui", REJECTED: "Ditolak", PUBLISHED: "Dipublikasikan", ARCHIVED: "Diarsipkan",
    ACTIVE: "Aktif", SUSPENDED: "Ditangguhkan", PENDING: "Menunggu", REVOKED: "Dicabut",
  };
  return <span className={`status-pill status-${status.toLowerCase()}`}>{label[status] ?? status}</span>;
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="product-page-title"><div>{eyebrow && <span className="product-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

function Notice({ children, kind = "info" }: { children: ReactNode; kind?: "info" | "warning" | "success" }) {
  return <div className={`product-notice notice-${kind}`} role="note"><ShieldCheck size={18} /><div>{children}</div></div>;
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="product-empty"><FileText size={24} /><b>{title}</b><p>{text}</p>{action}</div>;
}

function StoreReady({ ready, children }: { ready: boolean; children: ReactNode }) {
  if (!ready) return <div className="product-loading" aria-live="polite">Memuat demo…</div>;
  return <>{children}</>;
}

function DemoHeader({ store, save }: { store: DemoStore; save: (next: DemoStore) => void }) {
  return <header className="product-topbar">
    <Link className="product-brand" href="/"><span className="product-brand-icon"><BookOpen size={20} /></span><span>SAPA<span>-UJI</span><small>SMART ACCESS PLATFORM</small></span></Link>
    <nav aria-label="Navigasi produk"><Link href="/learn">Belajar</Link><Link href="/journey">Alur edukasi</Link><Link href="/gaps">Peta</Link><Link href="/studies/demo-study">Studi demo</Link><Link href="/questions">Pertanyaan</Link><Link href="/workspace">Untuk institusi</Link></nav>
    <div className="product-top-actions">{store.currentRole === "SUPER_ADMIN" && <><label htmlFor="demo-institution">Institusi</label><select id="demo-institution" aria-label="Pilih institusi demo" value={store.activeInstitutionId} onChange={(event) => save({ ...store, activeInstitutionId: event.target.value })}>{store.institutions.filter((item) => item.status === "ACTIVE").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></>}<label htmlFor="demo-role">Peran demo</label><select id="demo-role" value={store.currentRole} onChange={(event) => save({ ...store, currentRole: event.target.value as DemoRole })}>{Object.entries(roleNames).map(([role, label]) => <option value={role} key={role}>{label}</option>)}</select><Link className="product-login-link" href="/login">Masuk demo</Link></div>
  </header>;
}

const workspaceLinks = [
  { href: "/workspace", label: "Ringkasan", icon: Home, roles: ["RESEARCHER", "CLINICAL_REVIEWER", "INSTITUTION_ADMIN", "SUPER_ADMIN"] },
  { href: "/workspace/studies", label: "Penelitian", icon: FileText, roles: ["RESEARCHER", "INSTITUTION_ADMIN", "SUPER_ADMIN"] },
  { href: "/workspace/content", label: "Materi edukasi", icon: BookOpen, roles: ["RESEARCHER", "INSTITUTION_ADMIN", "SUPER_ADMIN"] },
  { href: "/workspace/assessments", label: "Pertanyaan asesmen", icon: ClipboardList, roles: ["RESEARCHER", "INSTITUTION_ADMIN", "SUPER_ADMIN"] },
  { href: "/workspace/reviews", label: "Review konten", icon: ShieldCheck, roles: ["CLINICAL_REVIEWER", "SUPER_ADMIN"] },
  { href: "/workspace/analytics", label: "Analitik & laporan", icon: Activity, roles: ["RESEARCHER", "INSTITUTION_ADMIN", "SUPER_ADMIN"] },
  { href: "/workspace/users", label: "Anggota institusi", icon: Users, roles: ["INSTITUTION_ADMIN", "SUPER_ADMIN"] },
  { href: "/workspace/audit", label: "Riwayat aktivitas", icon: FileClock, roles: ["INSTITUTION_ADMIN", "SUPER_ADMIN"] },
  { href: "/workspace/settings", label: "Pengaturan", icon: LockKeyhole, roles: ["INSTITUTION_ADMIN", "SUPER_ADMIN"] },
  { href: "/admin", label: "Multi-institusi", icon: Users, roles: ["SUPER_ADMIN"] },
];

function WorkspaceShell({ store, path, children }: { store: DemoStore; path: string; children: ReactNode }) {
  const links = workspaceLinks.filter((link) => link.roles.includes(store.currentRole));
  return <div className="workspace-layout">
    <aside className="workspace-sidebar"><div className="workspace-institution"><span className="workspace-avatar">{store.institutions.find((item) => item.id === store.activeInstitutionId)?.name.slice(0, 1) ?? "S"}</span><span><b>{store.institutions.find((item) => item.id === store.activeInstitutionId)?.name ?? "Workspace"}</b><small>{roleNames[store.currentRole]}</small></span></div>
      <nav aria-label="Navigasi workspace">{links.map((link) => { const Icon = link.icon; return <Link key={link.href} className={path === (link.href === "/admin" ? "admin" : link.href.slice("/workspace".length)) || (path === "" && link.href === "/workspace") ? "active" : ""} href={link.href}><Icon size={17} />{link.label}</Link>; })}</nav>
      <Link className="back-to-site" href="/"><ArrowLeft size={15} />Kembali ke situs</Link>
    </aside>
    <div className="workspace-content">{children}</div>
  </div>;
}

function RoleGate({ store, allowed, children }: { store: DemoStore; allowed: DemoRole[]; children: ReactNode }) {
  if (allowed.includes(store.currentRole)) return <>{children}</>;
  return <EmptyState title="Peran demo tidak memiliki akses" text={`Halaman ini ditujukan untuk: ${allowed.map((role) => roleNames[role]).join(", ")}. Pilih peran yang sesuai untuk mencoba alur demo.`} action={<Link className="product-button primary" href="/login">Ganti peran demo<ArrowRight size={15} /></Link>} />;
}

function PublicLearningPage({ store }: { store: DemoStore }) {
  const modules = store.modules.filter((module) => module.status === "PUBLISHED" && belongsToInstitution(module, store.activeInstitutionId));
  return <>
    <PageTitle eyebrow="PUSAT BELAJAR" title="Pahami konsep penelitian klinis" description="Materi generik untuk membantu Anda memahami istilah, meninjau pertanyaan, dan berdiskusi dengan tim penelitian." action={<Link className="product-button primary" href="/assessment">Mulai cek pemahaman<ArrowRight size={16} /></Link>} />
    <Notice>Materi di sini bukan informasi untuk penelitian tertentu. Rincian studi hanya boleh ditampilkan setelah dicocokkan dengan dokumen resmi dan disetujui reviewer yang kompeten.</Notice>
    <div className="content-grid">{modules.map((module) => <Link className="learning-tile" key={module.id} href={`/learn/${module.id}`}><span className="tile-icon"><BookOpen size={19} /></span><span className="tile-meta">{topicNames[module.topic] ?? module.topic} · {module.version}.0</span><b>{module.title}</b><p>{module.summary}</p><span className="tile-link">Buka materi<ChevronRight size={15} /></span></Link>)}</div>
    <div className="product-two-col"><section className="product-card"><h2>Latihan pemahaman</h2><p>Periksa lima topik, jawab skenario, lalu lihat materi yang mungkin ingin dibahas lagi. Teach-back tidak dinilai otomatis.</p><Link className="product-text-link" href="/assessment">Buka asesmen <ArrowRight size={15} /></Link></section><section className="product-card"><h2>Siapkan pertanyaan</h2><p>Buat daftar untuk dibawa ke percakapan bersama peneliti. Daftar ini tidak dikirim ke server.</p><Link className="product-text-link" href="/questions">Buat daftar pertanyaan <ArrowRight size={15} /></Link></section></div>
  </>;
}

function LearningDetailPage({ store, id }: { store: DemoStore; id: string }) {
  const module = store.modules.find((item) => item.id === id && item.status === "PUBLISHED" && belongsToInstitution(item, store.activeInstitutionId));
  if (!module) return <EmptyState title="Materi tidak ditemukan" text="Materi mungkin belum dipublikasikan." action={<Link className="product-button secondary" href="/learn">Kembali ke pusat belajar</Link>} />;
  return <>
    <Link className="product-back-link" href="/learn"><ArrowLeft size={15} />Pusat belajar</Link>
    <PageTitle eyebrow={`MATERI UMUM · VERSI ${module.version}.0`} title={module.title} description={module.summary} />
    <Notice>{module.sourceReference}. Ini bukan protokol atau informasi penelitian klinis tertentu.</Notice>
    <article className="article-card"><p>{module.content}</p><details><summary>Istilah yang mungkin berguna</summary><p><b>Protokol penelitian:</b> dokumen yang menerangkan tujuan, rencana, prosedur, dan pengawasan penelitian tertentu.</p></details><div className="article-source"><FileText size={15} /><span>Sumber: {module.sourceReference} · Status konten: {module.status}</span></div></article>
    <div className="product-button-row"><Link className="product-button primary" href="/assessment">Cek pemahaman<ArrowRight size={16} /></Link><Link className="product-button secondary" href="/questions">Siapkan pertanyaan<HelpCircle size={16} /></Link></div>
  </>;
}

function ResearchJourneyPage() {
  const stages = [
    ["Persiapan dan informasi", "Apa tujuan studi? Siapa yang dapat ditanya sebelum membuat keputusan?"],
    ["Skrining", "Pemeriksaan apa yang dilakukan, mengapa diperlukan, dan bagaimana hasilnya dijelaskan?"],
    ["Intervensi", "Apa yang diberikan atau dilakukan? Apa yang diketahui dan belum diketahui?"],
    ["Pemantauan", "Bagaimana kondisi dipantau dan siapa yang dapat dihubungi jika ada kekhawatiran?"],
    ["Penyelesaian", "Kapan partisipasi berakhir dan apakah ada informasi atau tindak lanjut setelahnya?"],
  ];
  const [active, setActive] = useState(0);
  return <><PageTitle eyebrow="INTERACTIVE RESEARCH JOURNEY" title="Perjalanan setiap studi berbeda" description="Kerangka ini membantu Anda menyiapkan pertanyaan, bukan menggambarkan jadwal klinis tertentu."/><Notice kind="warning">Urutan, prosedur, lama waktu, kemungkinan pengalaman, dan hak khusus harus berasal dari protokol yang disetujui. Tidak ada protokol nyata yang terhubung pada demo.</Notice><div className="journey-page-grid"><nav aria-label="Tahap edukasi">{stages.map(([title], index) => <button className={active === index ? "active" : ""} key={title} onClick={() => setActive(index)} aria-pressed={active === index}><span>{index + 1}</span>{title}</button>)}</nav><article className="product-card"><span className="product-eyebrow">TAHAP {active + 1} · KERANGKA PERTANYAAN</span><h2>{stages[active][0]}</h2><p>{stages[active][1]}</p><div className="journey-question-prompts"><b>Catatan untuk diskusi</b><p>Informasi apa yang perlu Anda pahami? Tanyakan kepada tim penelitian dan minta penjelasan dari dokumen studi resmi.</p></div><div className="product-button-row"><button className="product-button secondary" onClick={() => setActive((value) => Math.max(0, value - 1))} disabled={active === 0}><ArrowLeft size={15}/>Sebelumnya</button><button className="product-button primary" onClick={() => setActive((value) => Math.min(stages.length - 1, value + 1))} disabled={active === stages.length - 1}>Berikutnya<ArrowRight size={15}/></button></div></article></div><div className="product-button-row"><Link className="product-button primary" href="/questions">Siapkan pertanyaan<ArrowRight size={15}/></Link><Link className="product-button secondary" href="/studies/demo-study">Lihat studi simulasi<ChevronRight size={15}/></Link></div></>;
}

function ComprehensionGapsPage() {
  const sample = [["Tujuan penelitian", 90], ["Prosedur penelitian", 85], ["Manfaat potensial", 60], ["Risiko potensial", 45], ["Hak peserta", 95]] as const;
  return <><PageTitle eyebrow="COMPREHENSION GAP DETECTOR" title="Peta topik yang dapat dibahas lagi" description="Latihan SAPA-UJI memberi umpan balik per topik agar bagian yang belum jelas dapat dijelaskan kembali."/><Notice kind="warning">Contoh di bawah sepenuhnya sintetis. Ini bukan skor pengguna, peserta penelitian, atau hasil validasi.</Notice><div className="gap-demo-list">{sample.map(([topic, score]) => <article className="product-card" key={topic}><div><b>{topic}</b><strong className={score < 70 ? "gap-needs-review" : "gap-understood"}>{score}%</strong></div><i><span style={{ width: `${score}%` }}/></i><p>{score < 70 ? "Contoh topik yang mungkin perlu penjelasan tambahan." : "Contoh topik dengan jawaban yang relatif sejalan."}</p></article>)}</div><Notice>Skor rendah adalah undangan untuk bertanya atau menerima penjelasan tambahan, bukan alasan untuk menolak atau membatasi keikutsertaan.</Notice><div className="product-button-row"><Link className="product-button primary" href="/assessment">Coba latihan<ArrowRight size={15}/></Link><Link className="product-button secondary" href="/questions">Siapkan pertanyaan</Link></div></>;
}

function PublicStudyPage({ store, id }: { store: DemoStore; id: string }) {
  const study = store.studies.find((item) => item.id === id && item.status === "PUBLISHED" && item.institutionId === store.activeInstitutionId);
  if (!study) return <EmptyState title="Informasi penelitian tidak tersedia" text="Studi belum dipublikasikan atau alamatnya tidak ditemukan." action={<Link className="product-button secondary" href="/learn">Buka pusat belajar</Link>} />;
  return <>
    <Link className="product-back-link" href="/learn"><ArrowLeft size={15} />Pusat belajar</Link>
    <PageTitle eyebrow={study.isDemo ? "SIMULASI EDUKASI · BUKAN PENELITIAN NYATA" : "INFORMASI PENELITIAN"} title={study.title} description={study.summary} action={<StatusPill status={study.status} />} />
    <Notice kind="warning">{study.isDemo ? "Ini simulasi. Tidak ada protokol klinis, intervensi nyata, risiko spesifik, jadwal, atau data peserta pada halaman ini." : "Informasi khusus penelitian ini diambil dari dokumen yang disetujui."}</Notice>
    <div className="study-details-grid">{[["Mengapa penelitian dilakukan", study.researchPurpose], ["Apa yang akan dilakukan", study.procedures], ["Manfaat potensial", study.potentialBenefits], ["Risiko potensial", study.potentialRisks], ["Hak peserta", study.participantRights]].map(([title, content]) => <article className="product-card" key={title}><h2>{title}</h2><p>{content}</p></article>)}</div>
    <section className="product-card source-reference-card"><h2>Sumber dan versi</h2><p>{study.sourceName} · {study.sourceVersion}</p><small>{study.sourceReference}</small></section>
    <div className="product-button-row"><Link className="product-button primary" href="/assessment">Latihan pemahaman<ArrowRight size={16} /></Link><Link className="product-button secondary" href="/questions">Siapkan pertanyaan<HelpCircle size={16} /></Link></div>
  </>;
}

function AssessmentPage({ store }: { store: DemoStore }) {
  const questions = store.questions.filter((item) => belongsToInstitution(item, store.activeInstitutionId) && item.status === "PUBLISHED" && item.kind !== "TEACH_BACK");
  const teachBackPrompt = store.questions.find((item) => belongsToInstitution(item, store.activeInstitutionId) && item.status === "PUBLISHED" && item.kind === "TEACH_BACK");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [reflection, setReflection] = useState("");
  const [finished, setFinished] = useState(false);
  const current = questions[index];
  const scored: ScoredAnswer[] = questions.flatMap((question) => answers[question.id] === undefined || question.correctIndex === null ? [] : [{ category: question.topic, correct: answers[question.id] === question.correctIndex, points: 1 }]);
  const result = calculateScore(scored);
  function reset() { setIndex(0); setAnswers({}); setReflection(""); setFinished(false); }
  if (!questions.length) return <EmptyState title="Asesmen belum tersedia" text="Belum ada pertanyaan yang dipublikasikan." />;
  return <>
    <PageTitle eyebrow="SMART COMPREHENSION ASSESSMENT" title="Cek pemahaman Anda" description="Latihan mencakup tujuan, prosedur, manfaat, risiko, dan hak peserta. Anda bebas melewati pertanyaan." />
    <Notice>Hasil ini untuk belajar dan tidak menentukan kelayakan atau menjadi syarat mengikuti penelitian. Tidak ada jawaban atau teks teach-back yang disimpan.</Notice>
    {!finished ? <section className="assessment-page-card">
      <div className="assessment-page-progress"><span>{current?.kind === "SCENARIO" ? "PERTANYAAN BERBASIS SKENARIO" : topicNames[current?.topic ?? ""] ?? "LATIHAN"}</span><b>{index + 1} / {questions.length}</b></div>
      <div className="progress"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
      {current?.kind === "SCENARIO" && <div className="scenario-box"><b>Skenario</b><p>Anda sudah mengikuti beberapa kegiatan penelitian. Anda merasa ragu dan ingin membicarakannya dengan tim.</p></div>}
      <h2>{current?.prompt}</h2>
      <div className="page-answer-list">{current?.choices.map((choice, choiceIndex) => <button className={answers[current.id] === choiceIndex ? "selected" : ""} aria-pressed={answers[current.id] === choiceIndex} key={`${current.id}-${choiceIndex}`} onClick={() => setAnswers((old) => ({ ...old, [current.id]: choiceIndex }))}><span>{answers[current.id] === choiceIndex ? <Check size={15} /> : String.fromCharCode(65 + choiceIndex)}</span>{choice}</button>)}</div>
      {current && answers[current.id] !== undefined && <div className="answer-feedback" role="status"><b>{answers[current.id] === current.correctIndex ? "Pilihan ini sejalan dengan konsep utama." : "Mari tinjau kembali konsep ini."}</b><p>{learnerFeedback[current.topic]}</p></div>}
      <div className="product-button-row spaced"><button className="product-button secondary" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}><ArrowLeft size={15} />Kembali</button><div className="button-row-right"><button className="product-text-link" onClick={() => index === questions.length - 1 ? setFinished(true) : setIndex((value) => value + 1)}>Lewati</button><button className="product-button primary" onClick={() => index === questions.length - 1 ? setFinished(true) : setIndex((value) => value + 1)}>{index === questions.length - 1 ? "Selesai" : "Lanjut"}<ArrowRight size={15} /></button></div></div>
      {index === questions.length - 1 && teachBackPrompt && <div className="teachback-inline"><label htmlFor="study-teachback">Teach-back: {teachBackPrompt.prompt}</label><textarea id="study-teachback" value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={600} placeholder="Opsional. Hindari nama atau informasi kesehatan pribadi."/><small>Jawaban bebas tidak dinilai otomatis dan hanya ada selama halaman ini terbuka.</small></div>}
    </section> : <section className="assessment-page-card result-page-card"><div className="result-icon"><CheckCircle2 size={25} /></div><h2>Ringkasan latihan</h2><p>Hasil ini hanya meringkas pilihan yang Anda jawab. Tidak ada nilai lulus.</p>
      {result.categories.length ? <><div className="large-score">{result.totalScore} / {result.maximumScore}<span>{result.percentageScore}% pilihan sesuai konsep</span></div><div className="page-topic-results">{result.categories.map((item) => <div key={item.category}><span>{topicNames[item.category] ?? item.category}</span><b>{item.percentageScore}%</b><i><span style={{ width: `${item.percentageScore}%` }} /></i>{item.percentageScore < 70 && <small>{learnerFeedback[item.category]}</small>}</div>)}</div></> : <p>Anda melewati semua pertanyaan pilihan. Anda tetap dapat melanjutkan diskusi bersama tim penelitian.</p>}
      <Notice>Teach-back tidak dinilai otomatis. Penggunaan untuk studi tertentu memerlukan rubrik tervalidasi dan peninjauan manusia. Partisipasi Anda tetap sukarela.</Notice><div className="product-button-row"><button className="product-button secondary" onClick={reset}>Ulangi latihan</button><Link className="product-button primary" href="/questions">Siapkan pertanyaan<ArrowRight size={15} /></Link></div>
    </section>}
  </>;
}

function QuestionsPage() {
  const [items, setItems] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const suggestions = ["Apa tujuan utama penelitian ini?", "Apa saja kemungkinan risiko dan ketidaknyamanannya?", "Kegiatan dan kunjungan apa yang perlu saya jalani?", "Apakah ada biaya yang perlu saya tanggung?", "Bagaimana data pribadi saya dilindungi?", "Apa yang terjadi jika saya ingin berhenti ikut?"];
  function add(value: string) { const clean = value.trim(); if (clean && !items.includes(clean)) setItems((old) => [...old, clean]); }
  return <>
    <PageTitle eyebrow="ASK MY RESEARCHER" title="Siapkan pertanyaan untuk peneliti" description="Pilih pertanyaan yang penting untuk Anda, lalu bawa daftar ini ke percakapan bersama tim penelitian." />
    <Notice>Pertanyaan Anda hanya tersimpan di memori browser selama sesi ini. Jangan masukkan nama atau informasi kesehatan pribadi. SAPA-UJI tidak mengirim atau mengirimkan daftar ini kepada tim.</Notice>
    <section className="product-card question-builder"><h2>Saran pertanyaan</h2><div className="suggestion-grid">{suggestions.map((item) => <button key={item} onClick={() => add(item)} disabled={items.includes(item)}><Plus size={15} />{item}</button>)}</div>
      <form className="inline-form" onSubmit={(event) => { event.preventDefault(); add(custom); setCustom(""); }}><label htmlFor="custom-question-page">Tulis pertanyaan sendiri</label><div><input id="custom-question-page" value={custom} maxLength={200} onChange={(event) => setCustom(event.target.value)} placeholder="Pertanyaan untuk dibicarakan"/><button className="product-button primary" type="submit" disabled={!custom.trim()}>Tambah<Plus size={15}/></button></div></form>
      <div className="question-list-page" id="questions-to-print"><h2>Daftar pertanyaan saya</h2>{items.length ? <ol>{items.map((item, index) => <li key={`${index}-${item}`}>{item}<button aria-label={`Hapus: ${item}`} onClick={() => setItems((old) => old.filter((_, i) => i !== index))}><X size={15}/></button></li>)}</ol> : <p>Belum ada pertanyaan. Pilih saran atau tulis pertanyaan Anda.</p>}</div>
      <button className="product-button primary" disabled={!items.length} onClick={() => { document.body.dataset.printTarget = "questions-page"; window.addEventListener("afterprint", () => { delete document.body.dataset.printTarget; }, { once: true }); window.print(); }}><Printer size={15}/>Cetak / simpan PDF</button><small className="print-hint">Pilih “Save as PDF” pada dialog cetak perangkat Anda.</small>
    </section>
  </>;
}

function DemoLoginPage({ store, save }: { store: DemoStore; save: (next: DemoStore) => void }) {
  const [role, setRole] = useState<DemoRole>(store.currentRole);
  return <div className="login-wrap"><section className="login-card"><div className="login-mark"><BookOpen size={24}/></div><span className="product-eyebrow">MASUK KE PROTOTIPE</span><h1>Pilih alur demo</h1><p>Pilih peran untuk mencoba halaman dan workflow yang sesuai. Ini bukan autentikasi dan tidak membuat akun.</p><label htmlFor="login-role">Peran</label><select id="login-role" value={role} onChange={(event) => setRole(event.target.value as DemoRole)}>{Object.entries(roleNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="product-button primary full-width" onClick={() => { save({ ...store, currentRole: role }); window.location.href = role === "PARTICIPANT" ? "/learn" : role === "SUPER_ADMIN" ? "/admin" : "/workspace"; }}>Lanjut sebagai {roleNames[role]}<ArrowRight size={16}/></button><Notice kind="warning">Tidak ada email, kata sandi, undangan sungguhan, atau otorisasi server pada demo ini. Jangan masukkan data pribadi.</Notice><Link className="product-text-link" href="/">Kembali ke beranda</Link></section></div>;
}

function AccessPage() {
  const [fontScale, setFontScale] = useState(1);
  const [narration, setNarration] = useState(false);
  const [large, setLarge] = useState(false);
  useEffect(() => { const originalSize = document.documentElement.style.fontSize; const defaultSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16; document.documentElement.style.fontSize = `${defaultSize * fontScale}px`; return () => { document.documentElement.style.fontSize = originalSize; }; }, [fontScale]);
  useEffect(() => () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);
  function toggleAudio() {
    if (!("speechSynthesis" in window)) return;
    if (narration) { window.speechSynthesis.cancel(); setNarration(false); return; }
    const utterance = new SpeechSynthesisUtterance("Materi edukasi umum. Penelitian dirancang untuk menjawab pertanyaan tertentu. Manfaat bagi peserta tidak dapat dijamin. Anda dapat mengajukan pertanyaan kepada tim penelitian.");
    utterance.lang = "id-ID"; utterance.onend = () => setNarration(false); setNarration(true); window.speechSynthesis.speak(utterance);
  }
  return <><PageTitle eyebrow="AKSESIBILITAS" title="Atur pengalaman belajar" description="Pilihan ini hanya berlaku selama halaman terbuka. Materi demo tidak mengunduh audio atau video eksternal."/><section className="product-card access-controls"><div className="access-row"><div><b>Ukuran teks</b><small>Perbesar teks agar lebih nyaman dibaca.</small></div><div className="button-row-right"><button className="product-button secondary" onClick={() => { setFontScale(1); setLarge(false); }} disabled={!large}>Normal</button><button className="product-button secondary" onClick={() => { setFontScale(1.15); setLarge(true); }} disabled={large}>Besar</button></div></div><div className="access-row"><div><b>Narasi audio</b><small aria-live="polite">Materi yang dibacakan tetap terlihat di layar.</small></div><button className="product-button secondary" onClick={toggleAudio}>{narration ? "Hentikan narasi" : "Putar narasi"}</button></div><div className="access-row"><div><b>Mode hemat data</b><small>Halaman ini menggunakan CSS dan tidak memuat gambar/video eksternal.</small></div><span className="status-pill status-published">Aktif secara default</span></div><article className="print-material" id="accessibility-print"><h2>Materi umum</h2><p>Penelitian klinis dirancang untuk menjawab pertanyaan tertentu. Rincian tentang prosedur, risiko, manfaat, waktu, dan hak harus diambil dari informasi studi yang disetujui.</p></article><button className="product-button secondary" onClick={() => { document.body.dataset.printTarget = "access-material"; window.addEventListener("afterprint", () => { delete document.body.dataset.printTarget; }, { once: true }); window.print(); }}><Printer size={15}/>Cetak materi</button></section></>;
}

function WorkspaceDashboard({ store }: { store: DemoStore }) {
  const institutionStudies = store.studies.filter((study) => study.institutionId === store.activeInstitutionId);
  const institutionModules = store.modules.filter((module) => belongsToInstitution(module, store.activeInstitutionId));
  const pending = institutionStudies.filter((study) => study.status === "SUBMITTED_FOR_REVIEW").length + institutionModules.filter((module) => module.status === "SUBMITTED_FOR_REVIEW").length;
  return <>
    <PageTitle eyebrow="WORKSPACE INSTITUSI" title={`Selamat datang, ${roleNames[store.currentRole]}`} description="Kelola materi komunikasi penelitian dan tinjau ringkasan penggunaan di tingkat agregat." action={<Link className="product-button primary" href="/workspace/studies/new"><Plus size={15}/>Buat studi</Link>} />
    <Notice kind="warning">Semua data dan workflow pada workspace ini adalah simulasi yang tersimpan di browser ini. Tidak ada autentikasi, pengiriman email, penyimpanan institusional, atau data peserta nyata.</Notice>
    <div className="stat-grid"><article><span>Studi aktif demo</span><b>{institutionStudies.filter((study) => study.status === "PUBLISHED").length}</b><small>termasuk satu simulasi edukasi</small></article><article><span>Materi edukasi</span><b>{institutionModules.length}</b><small>draf dan materi demonstrasi</small></article><article><span>Menunggu review</span><b>{pending}</b><small>alur review demo</small></article><article><span>Data peserta nyata</span><b>0</b><small>tidak ada jawaban yang disimpan</small></article></div>
    <div className="workspace-shortcuts">{workspaceLinks.filter((link) => link.roles.includes(store.currentRole)).slice(1).map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="shortcut-card"><span><Icon size={19}/></span><b>{item.label}</b><p>Buka workflow {item.label.toLowerCase()}.</p><ArrowRight size={15}/></Link>; })}</div>
    <div className="product-two-col"><section className="product-card"><div className="section-card-heading"><h2>Penelitian terakhir</h2><Link href="/workspace/studies">Lihat semua</Link></div>{institutionStudies.slice(0, 3).map((study) => <div className="compact-row" key={study.id}><span><b>{study.title}</b><small>Diperbarui {displayDate(study.updatedAt)}</small></span><StatusPill status={study.status}/></div>)}</section><section className="product-card"><div className="section-card-heading"><h2>Tindakan cepat</h2><FileClock size={18}/></div><Link className="action-row" href="/workspace/content"><Plus size={16}/>Buat atau revisi materi<ArrowRight size={15}/></Link><Link className="action-row" href="/workspace/reviews"><ShieldCheck size={16}/>Tinjau draf yang masuk<ArrowRight size={15}/></Link><Link className="action-row" href="/workspace/analytics">Buka laporan agregat<ArrowRight size={15}/></Link></section></div>
  </>;
}

function StudyForm({ study, onSave, submitLabel }: { study?: DemoStudy; onSave: (data: Omit<DemoStudy, "id" | "institutionId" | "status" | "isDemo" | "version" | "updatedAt" | "history">) => void; submitLabel: string }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    onSave({ title: field(data, "title"), summary: field(data, "summary"), researchPurpose: field(data, "researchPurpose"), procedures: field(data, "procedures"), potentialBenefits: field(data, "potentialBenefits"), potentialRisks: field(data, "potentialRisks"), participantRights: field(data, "participantRights"), sourceName: field(data, "sourceName"), sourceVersion: field(data, "sourceVersion"), sourceReference: field(data, "sourceReference") });
  }
  const source = study;
  return <form className="editor-form" onSubmit={submit}>
    <Notice kind="warning">Jangan masukkan protokol nyata pada demo. Untuk produk nyata, setiap pernyataan khusus studi harus bersumber dari dokumen resmi dan ditinjau sebelum publikasi.</Notice>
    <label>Nama penelitian<input name="title" defaultValue={source?.title} required maxLength={140}/></label><label>Ringkasan<input name="summary" defaultValue={source?.summary} required maxLength={260}/></label>
    <div className="form-two-col"><label>Tujuan penelitian<textarea name="researchPurpose" defaultValue={source?.researchPurpose} rows={3} required/></label><label>Prosedur<textarea name="procedures" defaultValue={source?.procedures} rows={3} required/></label><label>Manfaat potensial<textarea name="potentialBenefits" defaultValue={source?.potentialBenefits} rows={3} required/></label><label>Risiko potensial<textarea name="potentialRisks" defaultValue={source?.potentialRisks} rows={3} required/></label><label>Hak peserta<textarea name="participantRights" defaultValue={source?.participantRights} rows={3} required/></label></div>
    <fieldset><legend>Sumber, versi, dan referensi</legend><div className="form-three-col"><label>Nama dokumen<input name="sourceName" defaultValue={source?.sourceName} required/></label><label>Versi dokumen<input name="sourceVersion" defaultValue={source?.sourceVersion} required/></label><label>Referensi / URL resmi<input name="sourceReference" defaultValue={source?.sourceReference} required/></label></div></fieldset>
    <div className="product-button-row"><button className="product-button primary" type="submit">{submitLabel}<Check size={15}/></button><Link className="product-button secondary" href="/workspace/studies">Batal</Link></div>
  </form>;
}

function StudiesPage({ store, save, newStudy, id }: { store: DemoStore; save: (next: DemoStore) => void; newStudy?: boolean; id?: string }) {
  if (newStudy) return <><PageTitle eyebrow="MATERI PENELITIAN" title="Buat draf penelitian" description="Lengkapi informasi dasar dan catat sumber resmi. Menyimpan draf tidak mempublikasikan konten."/><StudyForm submitLabel="Simpan draf" onSave={(data) => { const now = new Date().toISOString(); const created: DemoStudy = { ...data, id: makeDemoId("study"), institutionId: store.activeInstitutionId, status: "DRAFT", isDemo: true, version: 1, updatedAt: now, history: [{ version: 1, note: "Draf dibuat", at: now }] }; save({ ...store, studies: [created, ...store.studies], audit: auditEvent(store, "Membuat draf penelitian", created.title) }); window.location.href = `/workspace/studies/${created.id}`; }}/></>;
  if (id) {
    const study = store.studies.find((item) => item.id === id && item.institutionId === store.activeInstitutionId);
    if (!study) return <EmptyState title="Studi tidak ditemukan" text="Periksa kembali daftar penelitian." action={<Link className="product-button secondary" href="/workspace/studies">Kembali ke daftar</Link>}/>;
    const currentStudy = study;
    function update(data: Omit<DemoStudy, "id" | "institutionId" | "status" | "isDemo" | "version" | "updatedAt" | "history">) {
      const now = new Date().toISOString(); const nextVersion = currentStudy.version + 1;
      const updated: DemoStudy = { ...currentStudy, ...data, status: "DRAFT", version: nextVersion, updatedAt: now, history: [...currentStudy.history, { version: nextVersion, note: "Perubahan disimpan sebagai draf; review sebelumnya perlu diulang", at: now }] };
      save({ ...store, studies: store.studies.map((item) => item.id === id ? updated : item), audit: auditEvent(store, "Memperbarui draf penelitian", currentStudy.title) });
    }
    return <><Link className="product-back-link" href="/workspace/studies"><ArrowLeft size={15}/>Semua penelitian</Link><PageTitle eyebrow={`VERSI ${study.version}.0 · ${study.isDemo ? "SIMULASI" : "STUDI"}`} title={study.title} description="Sunting konten, perbarui sumber, lalu kirim ulang untuk review." action={<StatusPill status={study.status}/>}/><div className="study-workflow-card"><div><b>Status saat ini</b><p>{workflowHint(study.status)}</p></div><div className="workflow-actions">{study.status === "DRAFT" || study.status === "REVISION_REQUESTED" || study.status === "REJECTED" ? <button className="product-button primary" onClick={() => transitionStudy(store, save, study, "SUBMITTED_FOR_REVIEW", "Mengirim studi untuk review")}>Kirim untuk review<ArrowRight size={15}/></button> : null}{study.status === "APPROVED" && <button className="product-button primary" onClick={() => transitionStudy(store, save, study, "PUBLISHED", "Mempublikasikan studi")}>Publikasikan<Check size={15}/></button>}{study.status === "PUBLISHED" && <Link className="product-button secondary" href={`/studies/${study.id}`}>Lihat versi publik<ArrowRight size={15}/></Link>}{study.status !== "ARCHIVED" && <button className="product-button danger" onClick={() => transitionStudy(store, save, study, "ARCHIVED", "Mengarsipkan studi")}>Arsipkan</button>}</div></div><details className="history-details"><summary>Riwayat versi ({study.history.length})</summary>{study.history.map((item) => <div className="history-row" key={`${item.version}-${item.at}`}><b>Versi {item.version}.0</b><span>{item.note}</span><small>{displayDate(item.at)}</small></div>)}</details>{study.status !== "ARCHIVED" && <StudyForm key={`${study.id}-${study.version}`} study={study} submitLabel="Simpan perubahan sebagai draf" onSave={update}/>}</>;
  }
  const studies = store.studies.filter((study) => study.institutionId === store.activeInstitutionId);
  return <><PageTitle eyebrow="WORKSPACE · KONTEN STUDI" title="Penelitian" description="Kelola draf, sumber informasi, review, dan publikasi penelitian." action={<Link className="product-button primary" href="/workspace/studies/new"><Plus size={15}/>Buat penelitian</Link>}/><Notice>Konten yang telah diedit kembali menjadi draf dan harus ditinjau lagi sebelum dipublikasikan.</Notice><div className="table-card"><div className="table-header"><span>Nama penelitian</span><span>Status</span><span>Versi</span><span>Diperbarui</span><span></span></div>{studies.map((study) => <div className="table-row" key={study.id}><span><b>{study.title}</b><small>{study.isDemo ? "Simulasi demo" : "Draft lokal"} · {study.sourceName}</small></span><StatusPill status={study.status}/><span>v{study.version}.0</span><span>{displayDate(study.updatedAt)}</span><Link className="product-text-link" href={`/workspace/studies/${study.id}`}>Kelola<ChevronRight size={15}/></Link></div>)}</div></>;
}

function transitionStudy(store: DemoStore, save: (next: DemoStore) => void, study: DemoStudy, status: WorkflowStatus, action: string) {
  const now = new Date().toISOString();
  const updated = { ...study, status, updatedAt: now, history: [...study.history, { version: study.version, note: action, at: now }] };
  save({ ...store, studies: store.studies.map((item) => item.id === study.id ? updated : item), audit: auditEvent(store, action, study.title) });
}

function workflowHint(status: WorkflowStatus) {
  const descriptions: Record<WorkflowStatus, string> = { DRAFT: "Draf belum terlihat oleh peserta. Lengkapi sumber dan informasi, lalu kirim untuk review.", SUBMITTED_FOR_REVIEW: "Menunggu reviewer klinis. Konten belum dapat dipublikasikan.", REVISION_REQUESTED: "Reviewer meminta revisi. Perbarui konten dan kirim ulang.", APPROVED: "Konten disetujui reviewer. Peneliti atau admin dapat mempublikasikannya.", REJECTED: "Reviewer menolak konten. Periksa catatan dan buat revisi baru jika diperlukan.", PUBLISHED: "Konten tersedia pada halaman peserta.", ARCHIVED: "Konten diarsipkan dan tidak lagi ditampilkan." };
  return descriptions[status];
}

function ContentManagementPage({ store, save }: { store: DemoStore; save: (next: DemoStore) => void }) {
  const institutionModules = store.modules.filter((module) => belongsToInstitution(module, store.activeInstitutionId));
  function addModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const now = new Date().toISOString();
    const module: DemoModule = { id: makeDemoId("module"), institutionId: store.activeInstitutionId, title: field(data, "title"), topic: field(data, "topic"), summary: field(data, "summary"), content: field(data, "content"), sourceReference: field(data, "sourceReference"), status: "DRAFT", version: 1, updatedAt: now, isDemo: true, history: [{ version: 1, note: "Draf materi dibuat", at: now }] };
    save({ ...store, modules: [module, ...store.modules], audit: auditEvent(store, "Membuat draf materi", module.title) }); event.currentTarget.reset();
  }
  function updateModule(module: DemoModule, data: FormData) {
    const now = new Date().toISOString(); const version = module.version + 1;
    const updated: DemoModule = { ...module, title: field(data, "title"), topic: field(data, "topic"), summary: field(data, "summary"), content: field(data, "content"), sourceReference: field(data, "sourceReference"), status: "DRAFT", version, updatedAt: now, history: [...module.history, { version, note: "Perubahan disimpan sebagai draf; review sebelumnya perlu diulang", at: now }] };
    save({ ...store, modules: store.modules.map((item) => item.id === module.id ? updated : item), audit: auditEvent(store, "Memperbarui materi; review diulang", module.title) });
  }
  return <><PageTitle eyebrow="KONTEN EDUKASI" title="Materi edukasi" description="Buat materi sederhana yang mempunyai sumber, status review, dan riwayat versi."/><Notice kind="warning">Konten demonstrasi ditandai secara terpisah. Jangan gunakan AI atau materi yang belum direview untuk menjelaskan rincian studi nyata.</Notice><div className="product-two-col align-start"><section className="product-card"><h2>Buat materi</h2><form className="editor-form compact-editor" onSubmit={addModule}><label>Judul<input name="title" required maxLength={100}/></label><label>Topik<select name="topic"><option value="RESEARCH_PURPOSE">Tujuan</option><option value="RESEARCH_PROCEDURE">Prosedur</option><option value="POTENTIAL_BENEFITS">Manfaat potensial</option><option value="POTENTIAL_RISKS">Risiko potensial</option><option value="PARTICIPANT_RIGHTS">Hak peserta</option></select></label><label>Ringkasan<input name="summary" required maxLength={180}/></label><label>Penjelasan<textarea name="content" required rows={5}/></label><label>Sumber/referensi<input name="sourceReference" required placeholder="Judul dokumen dan versi"/></label><button className="product-button primary" type="submit"><Plus size={15}/>Simpan draf</button></form></section><section className="product-card"><h2>Alur publikasi</h2><ol className="workflow-list"><li>Simpan draf dengan sumber dan versi.</li><li>Kirim untuk review klinis.</li><li>Reviewer yang bukan pembuat memberi persetujuan atau meminta revisi.</li><li>Terbitkan materi yang telah disetujui.</li></ol><Notice>Perubahan setelah persetujuan membuat konten kembali menjadi draf.</Notice></section></div><div className="module-management-list">{institutionModules.map((module) => <details className="managed-item" key={module.id}><summary><span><b>{module.title}</b><small>{topicNames[module.topic] ?? module.topic} · v{module.version}.0</small></span><StatusPill status={module.status}/></summary><p>{module.summary}</p><small>Sumber: {module.sourceReference}</small><details className="version-history"><summary>Riwayat revisi ({module.history.length})</summary>{module.history.map((item) => <div className="history-row" key={`${item.version}-${item.at}`}><b>Versi {item.version}.0</b><span>{item.note}</span><small>{displayDate(item.at)}</small></div>)}</details><form className="editor-form compact-editor" onSubmit={(event) => { event.preventDefault(); updateModule(module, new FormData(event.currentTarget)); }}><label>Judul<input name="title" defaultValue={module.title} required/></label><label>Topik<select name="topic" defaultValue={module.topic}><option value="RESEARCH_PURPOSE">Tujuan</option><option value="RESEARCH_PROCEDURE">Prosedur</option><option value="POTENTIAL_BENEFITS">Manfaat</option><option value="POTENTIAL_RISKS">Risiko</option><option value="PARTICIPANT_RIGHTS">Hak peserta</option></select></label><label>Ringkasan<input name="summary" defaultValue={module.summary} required/></label><label>Konten<textarea name="content" defaultValue={module.content} rows={4} required/></label><label>Sumber<input name="sourceReference" defaultValue={module.sourceReference} required/></label><div className="product-button-row">{(module.status === "DRAFT" || module.status === "REVISION_REQUESTED" || module.status === "REJECTED") && <button className="product-button secondary" type="button" onClick={() => save({ ...store, modules: store.modules.map((item) => item.id === module.id ? { ...item, status: "SUBMITTED_FOR_REVIEW" } : item), audit: auditEvent(store, "Mengirim materi untuk review", module.title) })}>Kirim untuk review<ArrowRight size={14}/></button>}{module.status === "APPROVED" && <button className="product-button primary" type="button" onClick={() => { const now = new Date().toISOString(); save({ ...store, modules: store.modules.map((item) => item.id === module.id ? { ...item, status: "PUBLISHED", updatedAt: now, history: [...item.history, { version: item.version, note: "Materi dipublikasikan", at: now }] } : item), audit: auditEvent(store, "Mempublikasikan materi", module.title) }); }}>Publikasikan<Check size={15}/></button>}<button className="product-button secondary" type="submit">Simpan revisi sebagai draf</button>{module.status !== "ARCHIVED" && <button className="product-button danger" type="button" onClick={() => { const now = new Date().toISOString(); save({ ...store, modules: store.modules.map((item) => item.id === module.id ? { ...item, status: "ARCHIVED", updatedAt: now, history: [...item.history, { version: item.version, note: "Materi diarsipkan", at: now }] } : item), audit: auditEvent(store, "Mengarsipkan materi", module.title) }); }}>Arsipkan</button>}</div></form></details>)}</div></>;
}

function AssessmentManagementPage({ store, save }: { store: DemoStore; save: (next: DemoStore) => void }) {
  const [formError, setFormError] = useState("");
  const institutionQuestions = store.questions.filter((question) => belongsToInstitution(question, store.activeInstitutionId));
  function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const kind = field(data, "kind") as DemoQuestion["kind"];
    const choices = kind === "TEACH_BACK" ? [] : field(data, "choices").split("\n").map((item) => item.trim()).filter(Boolean);
    const requestedCorrect = Number(field(data, "correctIndex"));
    if (kind !== "TEACH_BACK" && (choices.length < 2 || !Number.isInteger(requestedCorrect) || requestedCorrect < 0 || requestedCorrect >= choices.length)) { setFormError("Pertanyaan pilihan ganda atau skenario memerlukan minimal dua pilihan dan satu jawaban benar yang valid."); return; }
    const question: DemoQuestion = { id: makeDemoId("question"), institutionId: store.activeInstitutionId, topic: field(data, "topic"), kind, prompt: field(data, "prompt"), choices, correctIndex: kind === "TEACH_BACK" ? null : (requestedCorrect >= 0 && requestedCorrect < choices.length ? requestedCorrect : null), rubric: field(data, "rubric"), status: "DRAFT", isDemo: true };
    save({ ...store, questions: [question, ...store.questions], audit: auditEvent(store, "Membuat draf pertanyaan asesmen", question.prompt) }); event.currentTarget.reset(); setFormError("");
  }
  return <><PageTitle eyebrow="SMART COMPREHENSION ASSESSMENT" title="Pertanyaan asesmen" description="Kelola pertanyaan pilihan ganda, skenario, dan teach-back menurut lima dimensi pemahaman."/><Notice>Jawaban bebas memerlukan rubrik tervalidasi dan peninjauan manusia. Tidak boleh ada model bahasa yang memutuskan kelayakan atau pemahaman peserta secara otomatis.</Notice>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="product-two-col align-start"><section className="product-card"><h2>Buat pertanyaan draf</h2><form className="editor-form compact-editor" onSubmit={addQuestion}><label>Topik<select name="topic">{Object.entries(topicNames).filter(([key]) => key !== "TEACH_BACK").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Metode<select name="kind"><option value="MULTIPLE_CHOICE">Pilihan ganda</option><option value="SCENARIO">Berbasis skenario</option><option value="TEACH_BACK">Teach-back (tanpa skor otomatis)</option></select></label><label>Pertanyaan<textarea name="prompt" rows={3} required/></label><label>Pilihan jawaban (satu per baris)<textarea name="choices" rows={4} placeholder={'Jawaban A\nJawaban B\nJawaban C'}/></label><label>Nomor pilihan benar (mulai dari 0)<input name="correctIndex" type="number" min="0" defaultValue="0"/></label><label>Rubrik/reviewer guidance<textarea name="rubric" rows={3} required/></label><button className="product-button primary" type="submit"><Plus size={15}/>Simpan draf</button></form></section><section className="product-card"><h2>Dimensi inti</h2><ul className="topic-list">{Object.entries(topicNames).filter(([key]) => key !== "TEACH_BACK").map(([key, value]) => <li key={key}><CheckCircle2 size={16}/>{value}</li>)}</ul><Notice>Teach-back tidak masuk skor otomatis. Reviewer memeriksa rubrik sebelum publikasi.</Notice></section></div><div className="table-card"><div className="table-header"><span>Pertanyaan</span><span>Dimensi / metode</span><span>Status</span><span></span></div>{institutionQuestions.map((question) => <div className="table-row question-bank-row" key={question.id}><span><b>{question.prompt}</b><small>{question.choices.length ? question.choices.length + " pilihan" : "Jawaban bebas · review manusia"}</small></span><span>{topicNames[question.topic] ?? question.topic}<small>{question.kind === "SCENARIO" ? "Skenario" : question.kind === "TEACH_BACK" ? "Teach-back" : "Pilihan ganda"}</small></span><StatusPill status={question.status}/><span>{question.status === "DRAFT" || question.status === "REVISION_REQUESTED" || question.status === "REJECTED" ? <button className="product-text-link" onClick={() => save({ ...store, questions: store.questions.map((item) => item.id === question.id ? { ...item, status: "SUBMITTED_FOR_REVIEW" } : item), audit: auditEvent(store, "Mengirim pertanyaan untuk review", question.prompt) })}>Kirim review<ArrowRight size={14}/></button> : question.status === "APPROVED" ? <button className="product-text-link" onClick={() => save({ ...store, questions: store.questions.map((item) => item.id === question.id ? { ...item, status: "PUBLISHED" } : item), audit: auditEvent(store, "Mempublikasikan pertanyaan", question.prompt) })}>Publikasikan<Check size={14}/></button> : question.status === "SUBMITTED_FOR_REVIEW" ? "Menunggu reviewer" : ""}</span></div>)}</div></>;
}

function QuestionEditPanels({ store, save }: { store: DemoStore; save: (next: DemoStore) => void }) {
  const [error, setError] = useState("");
  const institutionQuestions = store.questions.filter((question) => belongsToInstitution(question, store.activeInstitutionId));
  function revise(question: DemoQuestion, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const kind = field(data, "kind") as DemoQuestion["kind"];
    const choices = kind === "TEACH_BACK" ? [] : field(data, "choices").split("\n").map((item) => item.trim()).filter(Boolean);
    const requestedCorrect = Number(field(data, "correctIndex"));
    if (kind !== "TEACH_BACK" && (choices.length < 2 || !Number.isInteger(requestedCorrect) || requestedCorrect < 0 || requestedCorrect >= choices.length)) {
      setError("Tambahkan minimal dua pilihan dan pilih nomor jawaban benar yang valid.");
      return;
    }
    const selectedTopic = field(data, "topic");
    const topic = kind !== "TEACH_BACK" && selectedTopic === "TEACH_BACK" ? "PARTICIPANT_RIGHTS" : selectedTopic;
    const updated: DemoQuestion = { ...question, topic, kind, prompt: field(data, "prompt"), choices, correctIndex: kind === "TEACH_BACK" ? null : requestedCorrect, rubric: field(data, "rubric"), status: "DRAFT" };
    save({ ...store, questions: store.questions.map((item) => item.id === question.id ? updated : item), audit: auditEvent(store, "Merevisi pertanyaan; review diulang", updated.prompt) });
    setError("");
  }
  function archive(question: DemoQuestion) {
    save({ ...store, questions: store.questions.map((item) => item.id === question.id ? { ...item, status: "ARCHIVED" } : item), audit: auditEvent(store, "Mengarsipkan pertanyaan demo", question.prompt) });
  }
  return <section className="question-edit-panels"><PageTitle eyebrow="REVISI PERTANYAAN" title="Edit dan arsipkan pertanyaan" description="Setiap revisi mengembalikan pertanyaan ke draf agar reviewer meninjau versi terbaru."/>{error && <p className="form-error" role="alert">{error}</p>}{institutionQuestions.map((question) => <details className="managed-item" key={question.id}><summary><span><b>{question.prompt}</b><small>{topicNames[question.topic] ?? question.topic} · {question.kind}</small></span><StatusPill status={question.status}/></summary><form className="editor-form compact-editor" onSubmit={(event) => revise(question, event)}><label>Dimensi<select name="topic" defaultValue={question.topic}>{Object.entries(topicNames).filter(([topic]) => topic !== "TEACH_BACK" || question.topic === "TEACH_BACK").map(([topic, label]) => <option key={topic} value={topic}>{label}</option>)}</select></label><label>Metode<select name="kind" defaultValue={question.kind}><option value="MULTIPLE_CHOICE">Pilihan ganda</option><option value="SCENARIO">Skenario</option><option value="TEACH_BACK">Teach-back</option></select></label><label>Pertanyaan<textarea name="prompt" defaultValue={question.prompt} rows={3} required/></label><label>Pilihan jawaban (satu per baris)<textarea name="choices" defaultValue={question.choices.join("\n")} rows={4}/></label><label>Nomor jawaban benar (mulai dari 0)<input name="correctIndex" type="number" min="0" defaultValue={question.correctIndex ?? 0}/></label><label>Rubrik / panduan reviewer<textarea name="rubric" defaultValue={question.rubric} rows={3} required/></label><div className="product-button-row"><button className="product-button primary" type="submit">Simpan revisi sebagai draf<Check size={15}/></button>{question.status !== "ARCHIVED" && <button className="product-button danger" type="button" onClick={() => archive(question)}>Arsipkan</button>}</div></form></details>)}</section>;
}

type ReviewItem = { id: string; kind: "study" | "module" | "question"; title: string; status: WorkflowStatus; isDemo: boolean; source: string; content: string };
function ReviewsPage({ store, save }: { store: DemoStore; save: (next: DemoStore) => void }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const items: ReviewItem[] = [
    ...store.studies.filter((item) => item.institutionId === store.activeInstitutionId && item.status === "SUBMITTED_FOR_REVIEW").map((item) => ({ id: item.id, kind: "study" as const, title: item.title, status: item.status, isDemo: item.isDemo, source: `${item.sourceName} · ${item.sourceVersion} · ${item.sourceReference}`, content: `Tujuan: ${item.researchPurpose}\n\nProsedur: ${item.procedures}\n\nManfaat: ${item.potentialBenefits}\n\nRisiko: ${item.potentialRisks}\n\nHak: ${item.participantRights}` })),
    ...store.modules.filter((item) => belongsToInstitution(item, store.activeInstitutionId) && item.status === "SUBMITTED_FOR_REVIEW").map((item) => ({ id: item.id, kind: "module" as const, title: item.title, status: item.status, isDemo: item.isDemo, source: item.sourceReference, content: `${item.summary}\n\n${item.content}` })),
    ...store.questions.filter((item) => belongsToInstitution(item, store.activeInstitutionId) && item.status === "SUBMITTED_FOR_REVIEW").map((item) => ({ id: item.id, kind: "question" as const, title: item.prompt, status: item.status, isDemo: item.isDemo, source: `${topicNames[item.topic] ?? item.topic} · ${item.kind}`, content: `Pilihan:\n${item.choices.join("\n")}\n\nRubrik: ${item.rubric}` })),
  ];
  function review(item: ReviewItem, decision: "APPROVED" | "REVISION_REQUESTED" | "REJECTED") {
    const label = decision === "APPROVED" ? "Menyetujui" : decision === "REVISION_REQUESTED" ? "Meminta revisi" : "Menolak";
    const now = new Date().toISOString();
    const reviewRecord = { id: makeDemoId("review"), institutionId: store.activeInstitutionId, contentId: item.id, kind: item.kind, title: item.title, decision, reviewer: roleNames[store.currentRole], notes: notes[item.id] ?? "", at: now };
    const next = { ...store, reviews: [reviewRecord, ...store.reviews], audit: auditEvent(store, `${label} konten`, item.title) };
    if (item.kind === "study") next.studies = store.studies.map((row) => row.id === item.id ? { ...row, status: decision, updatedAt: now, history: [...row.history, { version: row.version, note: `${label} oleh reviewer demo${notes[item.id] ? `: ${notes[item.id]}` : ""}`, at: now }] } : row);
    if (item.kind === "module") next.modules = store.modules.map((row) => row.id === item.id ? { ...row, status: decision, updatedAt: now, history: [...row.history, { version: row.version, note: `${label} oleh reviewer demo${notes[item.id] ? `: ${notes[item.id]}` : ""}`, at: now }] } : row);
    if (item.kind === "question") next.questions = store.questions.map((row) => row.id === item.id ? { ...row, status: decision } : row);
    save(next);
  }
  const institutionReviews = store.reviews.filter((item) => belongsToInstitution(item, store.activeInstitutionId));
  return <><PageTitle eyebrow="CONTENT GOVERNANCE" title="Review klinis" description="Tinjau sumber dan materi. Pemisahan peran reviewer disimulasikan dengan memilih peran demo yang berbeda."/><Notice>Ini workflow simulasi lokal. Persetujuan demo bukan validasi klinis sungguhan dan tidak boleh digunakan untuk menerbitkan materi nyata.</Notice>{items.length ? <div className="review-queue">{items.map((item) => <article className="review-item" key={`${item.kind}-${item.id}`}><div className="review-item-head"><span className="review-kind">{item.kind === "study" ? "PENELITIAN" : item.kind === "module" ? "MATERI EDUKASI" : "PERTANYAAN"}{item.isDemo && " · DEMO"}</span><StatusPill status={item.status}/></div><h2>{item.title}</h2><p>Sumber: {item.source || "Belum dicantumkan"}</p><details><summary>Tinjau isi</summary><pre>{item.content}</pre></details><label>Catatan reviewer<textarea value={notes[item.id] ?? ""} onChange={(event) => setNotes((old) => ({ ...old, [item.id]: event.target.value }))} placeholder="Catatan reviewer; hindari data pribadi." rows={2}/></label><div className="review-actions"><button className="product-button primary" onClick={() => review(item, "APPROVED")}><Check size={15}/>Setujui</button><button className="product-button secondary" onClick={() => review(item, "REVISION_REQUESTED")}>Minta revisi</button><button className="product-button danger" onClick={() => review(item, "REJECTED")}>Tolak</button></div></article>)}</div> : <EmptyState title="Tidak ada konten menunggu review" text="Konten baru akan muncul setelah peneliti mengirim draf."/>}<section className="product-card review-history-card"><h2>Riwayat keputusan</h2>{institutionReviews.length ? institutionReviews.map((review) => <div className="compact-row" key={review.id}><span><b>{review.title}</b><small>{review.reviewer} · {displayDate(review.at)}{review.notes ? ` · Catatan: ${review.notes}` : ""}</small></span><StatusPill status={review.decision}/></div>) : <p>Belum ada keputusan review dalam demo ini.</p>}</section></>;
}

function AnalyticsPage({ store }: { store: DemoStore }) {
  const [reportName, setReportName] = useState("Ringkasan komunikasi penelitian");
  const institutionStudies = store.studies.filter((item) => item.institutionId === store.activeInstitutionId);
  const institutionModules = store.modules.filter((item) => belongsToInstitution(item, store.activeInstitutionId));
  const topics = [["Tujuan penelitian", 90], ["Prosedur penelitian", 85], ["Manfaat potensial", 60], ["Risiko potensial", 45], ["Hak peserta", 95]] as const;
  return <><PageTitle eyebrow="LAPORAN INSTITUSI" title="Analitik komunikasi" description="Gunakan wawasan agregat untuk menemukan bagian materi yang perlu diperjelas." action={<button className="product-button primary" onClick={() => { document.body.dataset.printTarget = "analytics-report"; window.addEventListener("afterprint", () => { delete document.body.dataset.printTarget; }, { once: true }); window.print(); }}><Printer size={15}/>Cetak laporan</button>}/><Notice kind="warning">Ilustrasi saja — angka sintetis, bukan hasil riset. Tidak ada sesi asesmen nyata yang disimpan. Jangan mengutip angka ini sebagai bukti dampak.</Notice><div className="report-controls product-card"><label>Judul laporan<input value={reportName} maxLength={100} onChange={(event) => setReportName(event.target.value)}/></label><span>Institusi: {store.institutions.find((item) => item.id === store.activeInstitutionId)?.name}</span><span>Data peserta nyata: 0</span></div><article className="product-card analytics-report" id="analytics-report"><div className="section-card-heading"><div><span className="product-eyebrow">LAPORAN ILUSTRATIF · DATA SINTETIS</span><h2>{reportName}</h2><small>Tidak mewakili peserta atau penelitian sebenarnya.</small></div><Activity size={22}/></div><h3>Contoh tampilan pre-test dan post-test</h3><div className="prepost-chart"><div><span>Sebelum belajar</span><b>48%</b><i style={{ height: "48%" }}/></div><ArrowRight size={18}/><div><span>Sesudah belajar</span><b>63%</b><i style={{ height: "63%" }}/></div></div><h3>Contoh ringkasan per topik</h3><div className="analytics-topic-list">{topics.map(([topic, score]) => <div key={topic}><span>{topic}</span><b>{score}%</b><i><span style={{ width: `${score}%` }}/></i></div>)}</div><Notice kind="warning">Angka ini hanya demonstrasi visual. Keputusan tentang revisi materi harus menggunakan data agregat yang sah, privasi terjaga, dan tata kelola konten.</Notice><h3>Konten menurut status workflow</h3><div className="report-status-grid"><span>Draf <b>{institutionStudies.filter((item) => item.status === "DRAFT").length + institutionModules.filter((item) => item.status === "DRAFT").length}</b></span><span>Review <b>{institutionStudies.filter((item) => item.status === "SUBMITTED_FOR_REVIEW").length + institutionModules.filter((item) => item.status === "SUBMITTED_FOR_REVIEW").length}</b></span><span>Terbit <b>{institutionModules.filter((item) => item.status === "PUBLISHED").length}</b></span></div></article></>;
}

function UsersPage({ store, save }: { store: DemoStore; save: (next: DemoStore) => void }) {
  const institutionInvites = store.invites.filter((invite) => invite.institutionId === store.activeInstitutionId);
  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const invitation: DemoInvite = { id: makeDemoId("invite"), email: field(data, "email"), role: field(data, "role") as DemoRole, institutionId: store.activeInstitutionId, status: "PENDING", createdAt: new Date().toISOString() };
    save({ ...store, invites: [invitation, ...store.invites], audit: auditEvent(store, "Membuat undangan lokal (demo)", invitation.email) }); event.currentTarget.reset();
  }
  return <><PageTitle eyebrow="ORGANISASI" title="Anggota institusi" description="Lihat keanggotaan dan coba membuat undangan dalam data demo."/><Notice kind="warning">Tidak ada email undangan yang dikirim. Data undangan disimpan lokal hanya untuk demonstrasi; jangan masukkan email orang sungguhan.</Notice><div className="product-two-col align-start"><section className="product-card"><h2>Buat undangan simulasi</h2><form className="editor-form compact-editor" onSubmit={invite}><label>Email contoh<input type="email" name="email" placeholder="reviewer@example.test" required/></label><label>Peran<select name="role"><option value="RESEARCHER">Peneliti</option><option value="CLINICAL_REVIEWER">Reviewer klinis</option><option value="INSTITUTION_ADMIN">Admin institusi</option><option value="PARTICIPANT">Peserta demo</option></select></label><button className="product-button primary" type="submit">Buat undangan lokal<Plus size={15}/></button></form></section><section className="product-card"><h2>Anggota contoh</h2><div className="compact-row"><span><b>Peneliti demo</b><small>researcher@example.test</small></span><StatusPill status="ACTIVE"/></div><div className="compact-row"><span><b>Reviewer demo</b><small>reviewer@example.test</small></span><StatusPill status="ACTIVE"/></div></section></div><div className="table-card"><div className="table-header"><span>Alamat undangan</span><span>Peran</span><span>Status</span><span>Dibuat</span><span></span></div>{institutionInvites.length ? institutionInvites.map((invitation) => <div className="table-row" key={invitation.id}><span>{invitation.email}</span><span>{roleNames[invitation.role]}</span><StatusPill status={invitation.status}/><span>{displayDate(invitation.createdAt)}</span><button className="product-text-link" disabled={invitation.status !== "PENDING"} onClick={() => save({ ...store, invites: store.invites.map((item) => item.id === invitation.id ? { ...item, status: "REVOKED" } : item), audit: auditEvent(store, "Mencabut undangan demo", invitation.email) })}>Cabut</button></div>) : <div className="table-empty">Belum ada undangan simulasi.</div>}</div></>;
}

function SettingsPage({ store, save }: { store: DemoStore; save: (next: DemoStore) => void }) {
  const institution = store.institutions.find((item) => item.id === store.activeInstitutionId) ?? store.institutions[0];
  function update(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const updated = { ...institution, name: field(data, "name"), type: field(data, "type"), contact: field(data, "contact") }; save({ ...store, institutions: store.institutions.map((item) => item.id === institution.id ? updated : item), audit: auditEvent(store, "Memperbarui pengaturan institusi demo", updated.name) }); }
  return <><PageTitle eyebrow="PENGATURAN" title="Profil institusi" description="Perbarui identitas institusi untuk halaman demo."/><Notice>Pengaturan ini hanya disimpan di localStorage browser. Tidak ada tenant nyata atau konfigurasi server.</Notice><section className="product-card settings-card"><form className="editor-form" onSubmit={update}><label>Nama institusi<input name="name" defaultValue={institution.name} required/></label><label>Jenis institusi<input name="type" defaultValue={institution.type} required/></label><label>Kontak contoh<input name="contact" defaultValue={institution.contact} required/></label><button className="product-button primary" type="submit">Simpan pengaturan<Check size={15}/></button></form></section><section className="product-card reset-card"><h2>Reset data demo</h2><p>Mengembalikan studi, materi, peran demo, dan workflow ke data awal pada browser ini.</p><button className="product-button danger" onClick={() => { try { localStorage.removeItem(DEMO_STORE_KEY); } catch {} save(demoSeed); }}>Reset demo</button></section></>;
}

function AuditPage({ store }: { store: DemoStore }) {
  const institutionEvents = store.audit.filter((event) => belongsToInstitution(event, store.activeInstitutionId));
  return <><PageTitle eyebrow="AUDIT TRAIL · SIMULASI" title="Riwayat aktivitas" description="Riwayat ini hanya merangkum perubahan lokal dalam prototipe dan bukan audit log untuk penggunaan produksi."/><Notice kind="warning">Log pada browser ini dapat dihapus atau diubah oleh pengguna perangkat. Jangan gunakan sebagai bukti audit resmi.</Notice><div className="table-card"><div className="table-header"><span>Aktivitas</span><span>Target</span><span>Peran</span><span>Waktu</span></div>{institutionEvents.map((event) => <div className="table-row" key={event.id}><span><b>{event.action}</b></span><span>{event.target}</span><span>{event.actor}</span><span>{displayDate(event.at)}</span></div>)}</div></>;
}

function AdminPage({ store, save }: { store: DemoStore; save: (next: DemoStore) => void }) {
  function addInstitution(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const institution: DemoInstitution = { id: makeDemoId("institution"), name: field(data, "name"), type: field(data, "type"), contact: field(data, "contact"), status: "ACTIVE" }; save({ ...store, institutions: [...store.institutions, institution], audit: auditEvent(store, "Menambahkan institusi demo", institution.name) }); event.currentTarget.reset(); }
  function toggleInstitution(institution: DemoInstitution) {
    const status: DemoInstitution["status"] = institution.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const institutions = store.institutions.map((item) => item.id === institution.id ? { ...item, status } : item);
    const activeInstitutionId = institution.id === store.activeInstitutionId && status === "SUSPENDED" ? institutions.find((item) => item.status === "ACTIVE")?.id ?? store.activeInstitutionId : store.activeInstitutionId;
    save({ ...store, institutions, activeInstitutionId, audit: auditEvent(store, status === "SUSPENDED" ? "Menangguhkan institusi demo" : "Mengaktifkan institusi demo", institution.name) });
  }
  return <><PageTitle eyebrow="SUPER ADMIN · MULTI-INSTITUSI" title="Administrasi institusi" description="Kelola tenant demo dan lihat status aktivasi. Tidak ada organisasi nyata yang terhubung."/><Notice kind="warning">Ini adalah panel simulasi. Tidak menerapkan kontrol tenant, autentikasi, atau provisioning server.</Notice><section className="product-card"><h2>Tambah institusi demo</h2><form className="inline-form three-field-form" onSubmit={addInstitution}><label>Nama<input name="name" required/></label><label>Jenis<input name="type" required/></label><label>Kontak contoh<input name="contact" placeholder="admin@example.test" required/></label><button className="product-button primary" type="submit">Tambah<Plus size={15}/></button></form></section><div className="institution-grid">{store.institutions.map((institution) => <article className="product-card institution-card" key={institution.id}><div className="institution-card-head"><span className="institution-avatar">{institution.name.slice(0, 1)}</span><StatusPill status={institution.status}/></div><h2>{institution.name}</h2><p>{institution.type}</p><small>{institution.contact}</small><div className="institution-stats"><span>Studi <b>{store.studies.filter((item) => item.institutionId === institution.id).length}</b></span><span>Undangan <b>{store.invites.filter((item) => item.institutionId === institution.id && item.status === "PENDING").length}</b></span></div><button className={`product-button ${institution.status === "ACTIVE" ? "danger" : "secondary"}`} disabled={institution.status === "ACTIVE" && store.institutions.filter((item) => item.status === "ACTIVE").length === 1} onClick={() => toggleInstitution(institution)}>{institution.status === "ACTIVE" ? "Tangguhkan" : "Aktifkan"}</button></article>)}</div></>;
}

function NotFound() { return <EmptyState title="Halaman tidak ditemukan" text="Tautan ini tidak cocok dengan halaman demo SAPA-UJI." action={<Link className="product-button primary" href="/">Ke beranda<ArrowRight size={15}/></Link>}/>; }

export function DemoPages({ path }: DemoPageProps) {
  const { store, save, ready } = useDemoStore();
  const segments = path.split("/").filter(Boolean);
  const page = segments[0] ?? "";
  const id = segments[page === "workspace" && segments[1] === "studies" ? 2 : 1] ?? "";
  const routeTitle = path === "" ? "Beranda" : path;
  const publicPage = page === "learn" || page === "studies" || page === "assessment" || page === "questions" || page === "accessibility" || page === "journey" || page === "gaps";
  const memberPath = page === "workspace" || page === "admin";
  const pageNode = () => {
    if (page === "login") return <DemoLoginPage store={store} save={save}/>;
    if (page === "learn" && !id) return <PublicLearningPage store={store}/>;
    if (page === "learn" && id) return <LearningDetailPage store={store} id={id}/>;
    if (page === "studies" && id) return <PublicStudyPage store={store} id={id}/>;
    if (path === "journey") return <ResearchJourneyPage/>;
    if (path === "gaps") return <ComprehensionGapsPage/>;
    if (path === "assessment") return <AssessmentPage store={store}/>;
    if (path === "questions") return <QuestionsPage/>;
    if (path === "accessibility") return <AccessPage/>;
    if (path === "admin") return <RoleGate store={store} allowed={["SUPER_ADMIN"]}><AdminPage store={store} save={save}/></RoleGate>;
    if (page === "workspace") return workspacePage(path, store, save, id);
    return <NotFound/>;
  };
  return <div className="product-app"><DemoHeader store={store} save={save}/><StoreReady ready={ready}><div className={publicPage || page === "login" || !memberPath ? "product-page public-page" : "product-page workspace-page"}>
    {memberPath ? <WorkspaceShell store={store} path={path === "admin" ? "admin" : path.slice("workspace".length)}>{pageNode()}</WorkspaceShell> : <>{pageNode()}</>}
  </div></StoreReady><footer className="product-footer"><Link href="/">SAPA-UJI</Link><span>Demo edukasi · Tidak untuk keputusan klinis</span><Link href="/accessibility">Aksesibilitas</Link><Link href="/login">Masuk demo</Link><small>{routeTitle}</small></footer></div>;
}

function workspacePage(path: string, store: DemoStore, save: (next: DemoStore) => void, id: string) {
  if (path === "workspace") return <RoleGate store={store} allowed={["RESEARCHER", "CLINICAL_REVIEWER", "INSTITUTION_ADMIN", "SUPER_ADMIN"]}><WorkspaceDashboard store={store}/></RoleGate>;
  if (path === "workspace/studies") return <RoleGate store={store} allowed={["RESEARCHER", "INSTITUTION_ADMIN", "SUPER_ADMIN"]}><StudiesPage store={store} save={save}/></RoleGate>;
  if (path === "workspace/studies/new") return <RoleGate store={store} allowed={["RESEARCHER", "INSTITUTION_ADMIN", "SUPER_ADMIN"]}><StudiesPage store={store} save={save} newStudy/></RoleGate>;
  if (path.startsWith("workspace/studies/")) return <RoleGate store={store} allowed={["RESEARCHER", "INSTITUTION_ADMIN", "SUPER_ADMIN"]}><StudiesPage store={store} save={save} id={id}/></RoleGate>;
  if (path === "workspace/content") return <RoleGate store={store} allowed={["RESEARCHER", "INSTITUTION_ADMIN", "SUPER_ADMIN"]}><ContentManagementPage store={store} save={save}/></RoleGate>;
  if (path === "workspace/assessments") return <RoleGate store={store} allowed={["RESEARCHER", "INSTITUTION_ADMIN", "SUPER_ADMIN"]}><><AssessmentManagementPage store={store} save={save}/><QuestionEditPanels store={store} save={save}/></></RoleGate>;
  if (path === "workspace/reviews") return <RoleGate store={store} allowed={["CLINICAL_REVIEWER", "SUPER_ADMIN"]}><ReviewsPage store={store} save={save}/></RoleGate>;
  if (path === "workspace/analytics") return <RoleGate store={store} allowed={["RESEARCHER", "INSTITUTION_ADMIN", "SUPER_ADMIN"]}><AnalyticsPage store={store}/></RoleGate>;
  if (path === "workspace/users") return <RoleGate store={store} allowed={["INSTITUTION_ADMIN", "SUPER_ADMIN"]}><UsersPage store={store} save={save}/></RoleGate>;
  if (path === "workspace/settings") return <RoleGate store={store} allowed={["INSTITUTION_ADMIN", "SUPER_ADMIN"]}><SettingsPage store={store} save={save}/></RoleGate>;
  if (path === "workspace/audit") return <RoleGate store={store} allowed={["INSTITUTION_ADMIN", "SUPER_ADMIN"]}><AuditPage store={store}/></RoleGate>;
  return <NotFound/>;
}
