export type DemoRole = "PARTICIPANT" | "RESEARCHER" | "CLINICAL_REVIEWER" | "INSTITUTION_ADMIN" | "SUPER_ADMIN";
export type WorkflowStatus = "DRAFT" | "SUBMITTED_FOR_REVIEW" | "REVISION_REQUESTED" | "APPROVED" | "REJECTED" | "PUBLISHED" | "ARCHIVED";

export type DemoStudy = {
  id: string;
  institutionId: string;
  title: string;
  summary: string;
  researchPurpose: string;
  procedures: string;
  potentialBenefits: string;
  potentialRisks: string;
  participantRights: string;
  sourceName: string;
  sourceVersion: string;
  sourceReference: string;
  status: WorkflowStatus;
  isDemo: boolean;
  version: number;
  updatedAt: string;
  history: { version: number; note: string; at: string }[];
};

export type DemoModule = {
  id: string;
  institutionId?: string;
  title: string;
  topic: string;
  summary: string;
  content: string;
  sourceReference: string;
  status: WorkflowStatus;
  version: number;
  updatedAt: string;
  isDemo: boolean;
  history: { version: number; note: string; at: string }[];
};

export type DemoQuestion = {
  id: string;
  institutionId?: string;
  topic: string;
  kind: "MULTIPLE_CHOICE" | "SCENARIO" | "TEACH_BACK";
  prompt: string;
  choices: string[];
  correctIndex: number | null;
  rubric: string;
  status: WorkflowStatus;
  isDemo: boolean;
};

export type DemoInstitution = { id: string; name: string; type: string; contact: string; status: "ACTIVE" | "SUSPENDED" };
export type DemoInvite = { id: string; email: string; role: DemoRole; institutionId: string; status: "PENDING" | "REVOKED"; createdAt: string };
export type DemoAuditEvent = { id: string; institutionId?: string; action: string; target: string; actor: string; at: string };
export type DemoReview = { id: string; institutionId?: string; contentId: string; kind: "study" | "module" | "question"; title: string; decision: "APPROVED" | "REVISION_REQUESTED" | "REJECTED"; reviewer: string; notes: string; at: string };

export type DemoStore = {
  currentRole: DemoRole;
  activeInstitutionId: string;
  institutions: DemoInstitution[];
  studies: DemoStudy[];
  modules: DemoModule[];
  questions: DemoQuestion[];
  invites: DemoInvite[];
  audit: DemoAuditEvent[];
  reviews: DemoReview[];
};

export const DEMO_STORE_KEY = "sapa-uji-demo-v2";
export const DEMO_INSTITUTION_ID = "demo-hospital";

const timestamp = "2026-11-21T00:00:00.000Z";

export const demoSeed: DemoStore = {
  currentRole: "PARTICIPANT",
  activeInstitutionId: DEMO_INSTITUTION_ID,
  institutions: [
    { id: DEMO_INSTITUTION_ID, name: "Institusi Simulasi SAPA-UJI", type: "Clinical Research Unit", contact: "kontak@example.test", status: "ACTIVE" },
  ],
  studies: [
    {
      id: "demo-study", institutionId: DEMO_INSTITUTION_ID, title: "Simulasi penelitian obat", summary: "Skenario edukasi generik untuk mencoba alur SAPA-UJI. Ini bukan penelitian sungguhan dan tidak memuat protokol klinis.",
      researchPurpose: "Contoh ini tidak menjelaskan tujuan suatu studi nyata. Dalam penelitian yang sebenarnya, tujuan harus disalin dan dijelaskan dari protokol yang disetujui.",
      procedures: "Rincian prosedur, kunjungan, dan durasi belum tersedia pada simulasi ini. Untuk studi nyata, tampilkan hanya informasi dari protokol yang disetujui.",
      potentialBenefits: "Manfaat pada penelitian tertentu tidak tersedia di simulasi ini. Manfaat potensial bukan jaminan manfaat pribadi.",
      potentialRisks: "Risiko penelitian tertentu tidak tersedia di simulasi ini. Rincian risiko harus bersumber dari dokumen resmi dan ditinjau reviewer.",
      participantRights: "Keikutsertaan dalam penelitian bersifat sukarela. Untuk proses dan hak pada studi tertentu, tanyakan kepada tim penelitian dan baca dokumen yang disetujui.",
      sourceName: "Materi demonstrasi SAPA-UJI", sourceVersion: "Demo 1.0", sourceReference: "Materi generik; bukan protokol penelitian",
      status: "PUBLISHED", isDemo: true, version: 1, updatedAt: timestamp, history: [{ version: 1, note: "Materi simulasi awal", at: timestamp }],
    },
    {
      id: "review-sample", institutionId: DEMO_INSTITUTION_ID, title: "Contoh konten untuk ditinjau", summary: "Draf simulasi guna memperagakan alur reviewer.",
      researchPurpose: "Draf contoh ini belum menjadi informasi penelitian.", procedures: "Belum ada prosedur penelitian.", potentialBenefits: "Belum ada manfaat penelitian yang dinyatakan.", potentialRisks: "Belum ada risiko penelitian yang dinyatakan.", participantRights: "Rincian hak untuk studi khusus harus bersumber dari dokumen yang disetujui.",
      sourceName: "Placeholder simulasi", sourceVersion: "0.1", sourceReference: "Tidak ada dokumen klinis terlampir",
      status: "SUBMITTED_FOR_REVIEW", isDemo: true, version: 1, updatedAt: timestamp, history: [{ version: 1, note: "Draf simulasi dikirim untuk review", at: timestamp }],
    },
  ],
  modules: [
    { id: "purpose", title: "Tujuan penelitian", topic: "RESEARCH_PURPOSE", summary: "Mengapa sebuah penelitian dilakukan?", content: "Penelitian dirancang untuk menjawab pertanyaan yang sudah ditentukan. Tujuan dan alasan pada studi tertentu perlu mengikuti protokol yang disetujui.", sourceReference: "Konsep edukasi umum · bukan sumber studi", status: "PUBLISHED", version: 1, updatedAt: timestamp, isDemo: true, history: [{ version: 1, note: "Materi demo awal", at: timestamp }] },
    { id: "procedure", title: "Prosedur penelitian", topic: "RESEARCH_PROCEDURE", summary: "Apa yang dapat terjadi selama penelitian?", content: "Prosedur, jumlah kunjungan, dan durasi berbeda di setiap penelitian. Jangan menyimpulkan detail suatu studi dari studi lain; periksa dokumen yang disetujui dan tanyakan kepada tim.", sourceReference: "Konsep edukasi umum · bukan sumber studi", status: "PUBLISHED", version: 1, updatedAt: timestamp, isDemo: true, history: [{ version: 1, note: "Materi demo awal", at: timestamp }] },
    { id: "benefits", title: "Manfaat potensial", topic: "POTENTIAL_BENEFITS", summary: "Manfaat yang mungkin terjadi bukan jaminan.", content: "Manfaat potensial belum tentu dialami oleh setiap peserta. Mintalah penjelasan tentang manfaat yang diharapkan dan hal yang masih belum pasti.", sourceReference: "Konsep edukasi umum · bukan sumber studi", status: "PUBLISHED", version: 1, updatedAt: timestamp, isDemo: true, history: [{ version: 1, note: "Materi demo awal", at: timestamp }] },
    { id: "risks", title: "Risiko potensial", topic: "POTENTIAL_RISKS", summary: "Pelajari risiko dari informasi studi yang disetujui.", content: "Risiko, efek samping, dan ketidaknyamanan spesifik harus berasal dari dokumen studi yang ditinjau. Tanyakan apa yang dapat dilakukan jika Anda mengalami masalah.", sourceReference: "Konsep edukasi umum · bukan sumber studi", status: "PUBLISHED", version: 1, updatedAt: timestamp, isDemo: true, history: [{ version: 1, note: "Materi demo awal", at: timestamp }] },
    { id: "rights", title: "Hak peserta", topic: "PARTICIPANT_RIGHTS", summary: "Anda dapat bertanya dan mengambil keputusan secara sukarela.", content: "Anda dapat membicarakan pertanyaan atau keinginan untuk berhenti dengan tim penelitian. Proses yang berlaku untuk studi tertentu perlu dijelaskan oleh tim dan tercantum di dokumen resmi.", sourceReference: "Konsep edukasi umum · bukan sumber studi", status: "PUBLISHED", version: 1, updatedAt: timestamp, isDemo: true, history: [{ version: 1, note: "Materi demo awal", at: timestamp }] },
  ],
  questions: [
    { id: "q-purpose", topic: "RESEARCH_PURPOSE", kind: "MULTIPLE_CHOICE", prompt: "Apa tujuan utama penelitian klinis?", choices: ["Menjawab pertanyaan penelitian secara terencana", "Menjamin semua peserta memperoleh manfaat", "Menggantikan perawatan rutin"], correctIndex: 0, rubric: "Jawaban mengakui penelitian menjawab pertanyaan tertentu; manfaat tidak dijamin.", status: "PUBLISHED", isDemo: true },
    { id: "q-procedure", topic: "RESEARCH_PROCEDURE", kind: "MULTIPLE_CHOICE", prompt: "Bagaimana mengetahui kegiatan dan jadwal penelitian tertentu?", choices: ["Menyalin jadwal studi lain", "Memeriksa dokumen studi yang disetujui dan bertanya kepada tim", "Memperkirakan sendiri"], correctIndex: 1, rubric: "Jawaban merujuk ke dokumen resmi dan diskusi dengan tim.", status: "PUBLISHED", isDemo: true },
    { id: "q-benefit", topic: "POTENTIAL_BENEFITS", kind: "MULTIPLE_CHOICE", prompt: "Apakah manfaat potensial pasti dialami peserta?", choices: ["Ya, selalu", "Belum tentu; manfaat pribadi tidak dapat dijanjikan", "Ya, bila studi disetujui"], correctIndex: 1, rubric: "Jawaban membedakan manfaat potensial dan manfaat yang dijamin.", status: "PUBLISHED", isDemo: true },
    { id: "q-risk", topic: "POTENTIAL_RISKS", kind: "MULTIPLE_CHOICE", prompt: "Dari mana Anda memahami risiko studi tertentu?", choices: ["Dari studi lain yang mirip", "Dari informasi studi yang disetujui dan penjelasan tim", "Dengan mengabaikan risiko"], correctIndex: 1, rubric: "Jawaban mengacu pada sumber studi tersebut.", status: "PUBLISHED", isDemo: true },
    { id: "q-rights", topic: "PARTICIPANT_RIGHTS", kind: "SCENARIO", prompt: "Anda merasa tidak ingin melanjutkan penelitian. Apa yang dapat Anda lakukan?", choices: ["Menyampaikan keputusan dan bertanya kepada tim penelitian", "Tetap ikut karena sudah memulai", "Membiarkan orang lain memutuskan"], correctIndex: 0, rubric: "Jawaban mencerminkan kesukarelaan dan hak untuk berdiskusi dengan tim.", status: "PUBLISHED", isDemo: true },
    { id: "q-teachback", topic: "TEACH_BACK", kind: "TEACH_BACK", prompt: "Dengan kata-kata sendiri, apa yang ingin Anda pahami atau tanyakan sebelum membuat keputusan?", choices: [], correctIndex: null, rubric: "Tinjau secara manusiawi menggunakan rubrik yang tervalidasi. Jangan gunakan model bahasa untuk memutuskan pemahaman.", status: "PUBLISHED", isDemo: true },
  ],
  invites: [],
  reviews: [],
  audit: [
    { id: "audit-seed", action: "Membuat data demonstrasi", target: "Institusi simulasi", actor: "Sistem demo", at: timestamp },
  ],
};

export function safeReadDemoStore(value: string | null): DemoStore {
  if (!value) return demoSeed;
  try {
    const parsed = JSON.parse(value) as Partial<DemoStore>;
    if (!Array.isArray(parsed.institutions) || !Array.isArray(parsed.studies) || !Array.isArray(parsed.modules) || !Array.isArray(parsed.questions) || !Array.isArray(parsed.invites) || !Array.isArray(parsed.audit) || (parsed.reviews !== undefined && !Array.isArray(parsed.reviews))) return demoSeed;
    const roles: DemoRole[] = ["PARTICIPANT", "RESEARCHER", "CLINICAL_REVIEWER", "INSTITUTION_ADMIN", "SUPER_ADMIN"];
    const merged = { ...demoSeed, ...parsed } as DemoStore;
    const institutions = merged.institutions.length ? merged.institutions : demoSeed.institutions;
    const activeInstitutions = institutions.filter((item) => item.status === "ACTIVE");
    const activeInstitutionId = activeInstitutions.some((item) => item.id === merged.activeInstitutionId) ? merged.activeInstitutionId : (activeInstitutions[0] ?? institutions[0]).id;
    const modules = merged.modules.map((module) => ({ ...module, history: Array.isArray(module.history) ? module.history : [{ version: module.version || 1, note: "Riwayat tidak tersedia pada data demo lama", at: module.updatedAt || timestamp }] }));
    return { ...merged, institutions, activeInstitutionId, modules, reviews: parsed.reviews ?? [], currentRole: roles.includes(parsed.currentRole as DemoRole) ? parsed.currentRole as DemoRole : "PARTICIPANT" };
  } catch {
    return demoSeed;
  }
}

export function makeDemoId(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefix}-${random}`;
}

export function displayDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}
