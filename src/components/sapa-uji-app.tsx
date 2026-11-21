"use client";

import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileText,
  Globe2,
  Headphones,
  HeartHandshake,
  Languages,
  Menu,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { calculateScore, type ScoredAnswer } from "@/lib/assessment";
import { DEMO_INSTITUTION_ID, DEMO_STORE_KEY, safeReadDemoStore } from "@/lib/demo-store";

type Language = "id" | "en";
type ModuleId = "simplifier" | "journey" | "assessment" | "gaps" | "questions" | "dashboard" | "accessibility";
type Localized = Record<Language, string>;

const moduleList: { id: ModuleId; icon: LucideIcon; title: Localized; description: Localized; time: Localized }[] = [
  { id: "simplifier", icon: BookOpen, title: { id: "Penyederhana klinis", en: "Clinical Trial Simplifier" }, description: { id: "Pahami istilah dan konsep penelitian", en: "Understand research terms and concepts" }, time: { id: "4 menit", en: "4 min" } },
  { id: "journey", icon: Activity, title: { id: "Perjalanan penelitian", en: "Research Journey" }, description: { id: "Kenali hal yang perlu ditanyakan di tiap tahap", en: "Know what to ask at each stage" }, time: { id: "5 menit", en: "5 min" } },
  { id: "assessment", icon: ClipboardList, title: { id: "Cek pemahaman", en: "Comprehension Check" }, description: { id: "Pilihan ganda, skenario, dan teach-back", en: "Multiple choice, scenarios, and teach-back" }, time: { id: "6 menit", en: "6 min" } },
  { id: "gaps", icon: Sparkles, title: { id: "Peta pemahaman", en: "Comprehension Gaps" }, description: { id: "Lihat topik yang mungkin perlu dijelaskan lagi", en: "See topics that may need more explanation" }, time: { id: "2 menit", en: "2 min" } },
  { id: "questions", icon: CircleHelp, title: { id: "Tanya peneliti", en: "Ask My Researcher" }, description: { id: "Siapkan pertanyaan untuk tim penelitian", en: "Prepare questions for the research team" }, time: { id: "2 menit", en: "2 min" } },
  { id: "dashboard", icon: Activity, title: { id: "Dasbor komunikasi", en: "Communication Dashboard" }, description: { id: "Contoh ringkasan agregat untuk institusi", en: "Illustrative aggregate view for institutions" }, time: { id: "Pratinjau", en: "Preview" } },
  { id: "accessibility", icon: Globe2, title: { id: "Aksesibilitas", en: "Accessibility" }, description: { id: "Atur bahasa, teks, dan audio", en: "Adjust language, text, and audio" }, time: { id: "Kapan saja", en: "Any time" } },
];

type AssessmentQuestion = {
  id: string;
  category: string;
  title: Localized;
  method: Localized;
  scenario?: Localized;
  options?: Localized[];
  correct?: number;
  feedback: Localized;
};

const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: "purpose", category: "RESEARCH_PURPOSE",
    title: { id: "Apa tujuan utama sebuah penelitian klinis?", en: "What is the main purpose of a clinical study?" },
    method: { id: "Pilihan ganda · Tujuan penelitian", en: "Multiple choice · Research purpose" },
    options: [
      { id: "Menjawab pertanyaan penelitian secara terencana", en: "To answer a research question in a planned way" },
      { id: "Menjamin setiap peserta akan memperoleh manfaat", en: "To guarantee a benefit for every participant" },
      { id: "Menggantikan semua perawatan rutin", en: "To replace all usual care" },
    ], correct: 0,
    feedback: { id: "Penelitian dirancang untuk menjawab pertanyaan tertentu. Hasil dan manfaat bagi setiap orang tidak dapat dijamin.", en: "Research is designed to answer a specific question. Results and benefits for each person cannot be guaranteed." },
  },
  {
    id: "procedure", category: "RESEARCH_PROCEDURE",
    title: { id: "Bagaimana mengetahui kegiatan dan jadwal dalam suatu penelitian?", en: "How can you learn what activities and visits a study involves?" },
    method: { id: "Pilihan ganda · Prosedur penelitian", en: "Multiple choice · Research procedures" },
    options: [
      { id: "Menggunakan jadwal dari penelitian lain yang mirip", en: "Use the schedule from a similar study" },
      { id: "Memeriksa informasi penelitian yang disetujui dan bertanya kepada tim", en: "Check the approved study information and ask the team" },
      { id: "Mengira-ngira berdasarkan lama penelitian", en: "Estimate based on the study duration" },
    ], correct: 1,
    feedback: { id: "Prosedur, jumlah kunjungan, dan durasi berbeda antarpenelitian. Rujuk dokumen penelitian yang disetujui dan minta penjelasan tim.", en: "Procedures, visit counts, and duration vary by study. Refer to its approved information and ask the team." },
  },
  {
    id: "benefits", category: "POTENTIAL_BENEFITS",
    title: { id: "Apakah manfaat potensial penelitian sudah pasti akan dirasakan peserta?", en: "Are potential study benefits guaranteed for participants?" },
    method: { id: "Pilihan ganda · Manfaat potensial", en: "Multiple choice · Potential benefits" },
    options: [
      { id: "Ya, semua peserta pasti mendapat manfaat", en: "Yes, every participant is certain to benefit" },
      { id: "Belum tentu; manfaat pribadi tidak dapat dijanjikan", en: "Not necessarily; personal benefit cannot be promised" },
      { id: "Ya, jika penelitian sudah disetujui", en: "Yes, if the study has been approved" },
    ], correct: 1,
    feedback: { id: "Manfaat potensial bukan jaminan. Tanyakan manfaat yang diharapkan dan ketidakpastiannya untuk penelitian tertentu.", en: "Potential benefits are not guaranteed. Ask what benefits are expected and what remains uncertain for that specific study." },
  },
  {
    id: "risks", category: "POTENTIAL_RISKS",
    title: { id: "Apa cara yang tepat untuk memahami risiko suatu penelitian?", en: "What is the right way to understand the risks of a study?" },
    method: { id: "Pilihan ganda · Risiko potensial", en: "Multiple choice · Potential risks" },
    options: [
      { id: "Menganggap risiko sama dengan penelitian lain", en: "Assume the risks match those of another study" },
      { id: "Membaca risiko yang tercantum pada dokumen penelitian dan meminta penjelasan", en: "Read the risks in the study information and ask for an explanation" },
      { id: "Berfokus hanya pada manfaat yang mungkin", en: "Focus only on possible benefits" },
    ], correct: 1,
    feedback: { id: "Risiko spesifik harus dijelaskan dari informasi penelitian yang ditinjau. Jangan menyimpulkan risiko suatu studi dari studi lain.", en: "Specific risks must come from reviewed study information. Do not infer a study's risks from another study." },
  },
  {
    id: "rights", category: "PARTICIPANT_RIGHTS",
    title: { id: "Skenario: Anda tidak ingin melanjutkan penelitian. Apa yang dapat Anda lakukan?", en: "Scenario: You no longer want to continue a study. What can you do?" },
    method: { id: "Skenario · Hak peserta", en: "Scenario · Participant rights" },
    scenario: { id: "Anda sudah mengikuti beberapa kegiatan penelitian. Anda merasa ragu dan ingin membicarakannya.", en: "You have taken part in some study activities. You feel unsure and want to discuss it." },
    options: [
      { id: "Menyampaikan keputusan atau pertanyaan kepada tim penelitian", en: "Tell the research team about your decision or questions" },
      { id: "Tetap ikut karena sudah memulai", en: "Continue because you have already started" },
      { id: "Meminta orang lain memutuskan untuk Anda", en: "Ask someone else to decide for you" },
    ], correct: 0,
    feedback: { id: "Keikutsertaan bersifat sukarela. Diskusikan pilihan Anda dengan tim; materi dan prosedur untuk studi tertentu harus menjelaskan hak serta prosesnya.", en: "Participation is voluntary. Discuss your choice with the team; the specific study materials and procedures should explain your rights and the process." },
  },
  {
    id: "teachback", category: "TEACH_BACK",
    title: { id: "Dengan kata-kata Anda sendiri, apa yang masih ingin Anda pahami atau tanyakan sebelum memutuskan?", en: "In your own words, what would you still want to understand or ask before deciding?" },
    method: { id: "Teach-back · Jawaban bebas untuk refleksi", en: "Teach-back · Free-text reflection" },
    feedback: { id: "Jawaban ini tidak dinilai otomatis dan tidak disimpan. Teach-back sebaiknya ditinjau manusia dengan rubrik yang disetujui.", en: "This response is not automatically scored and is not saved. Teach-back should be reviewed by a person using an approved rubric." },
  },
];

const categoryLabels: Record<string, Localized> = {
  RESEARCH_PURPOSE: { id: "Tujuan penelitian", en: "Research purpose" },
  RESEARCH_PROCEDURE: { id: "Prosedur penelitian", en: "Research procedures" },
  POTENTIAL_BENEFITS: { id: "Manfaat potensial", en: "Potential benefits" },
  POTENTIAL_RISKS: { id: "Risiko potensial", en: "Potential risks" },
  PARTICIPANT_RIGHTS: { id: "Hak peserta", en: "Participant rights" },
};

const questionSuggestions: Localized[] = [
  { id: "Apa tujuan utama penelitian ini?", en: "What is the main purpose of this study?" },
  { id: "Apa saja kemungkinan risiko dan ketidaknyamanannya?", en: "What are the possible risks and discomforts?" },
  { id: "Kegiatan dan kunjungan apa yang perlu saya jalani?", en: "What activities and visits would I need to take part in?" },
  { id: "Apakah ada biaya yang perlu saya tanggung?", en: "Would I have any costs to pay?" },
  { id: "Bagaimana data pribadi saya dilindungi?", en: "How would my personal information be protected?" },
  { id: "Apa yang terjadi jika saya ingin berhenti ikut?", en: "What happens if I want to stop taking part?" },
];

const copy = {
  id: {
    navLearning: "Pusat belajar", navJourney: "Alur penelitian", navAbout: "Tentang", start: "Mulai belajar",
    label: "LITERASI PENELITIAN, DENGAN CARA YANG LEBIH JELAS", hero1: "Pahami penelitiannya.", hero2: "Kenali hak Anda.",
    intro: "Materi sederhana membantu Anda memahami konsep penelitian klinis, menyiapkan pertanyaan, dan berdiskusi dengan tim penelitian.",
    explore: "Jelajahi materi", positioning: "Platform edukasi dan dukungan pemahaman penelitian klinis",
    demo: "DEMO EDUKASI · BUKAN PENELITIAN TERTENTU", demoNote: "Contoh ini tidak memuat protokol atau informasi penelitian nyata. Informasi untuk studi tertentu hanya dapat ditampilkan setelah dicocokkan dengan sumber resmi dan disetujui reviewer yang kompeten.",
    modulesEyebrow: "PUSAT PEMBELAJARAN", modulesTitle: "Pelajari sesuai kebutuhan Anda", modulesIntro: "Pilih topik untuk membuka materi, latihan, atau alat bantu yang relevan.",
    chooseModule: "Pilih modul", read: "Materi singkat", detail: "Penjelasan lebih lanjut", glossary: "Glosarium", sourceBanner: "Materi edukasi umum. Tidak menggantikan dokumen penelitian yang disetujui.",
    journeyTitle: "Perjalanan tiap penelitian berbeda", journeyIntro: "Kerangka berikut menunjukkan hal yang dapat Anda tanyakan. Urutan, prosedur, pengalaman, jadwal, dan hak spesifik harus diambil dari protokol yang telah disetujui.",
    framework: "KERANGKA EDUKASI · BUKAN JADWAL KLINIS", sourceMissing: "Belum ada dokumen penelitian yang terhubung", sourceMissingText: "Di produk lengkap, tahap dan rincian penelitian muncul di sini setelah dicocokkan dengan protokol dan disetujui reviewer. Demo ini tidak mengarang detail studi.",
    stages: ["Persiapan & persetujuan", "Skrining", "Intervensi", "Pemantauan", "Penutupan"],
    stageQuestions: ["Apa yang perlu diketahui sebelum memutuskan?", "Pemeriksaan apa yang dilakukan dan mengapa?", "Apa yang akan diberikan atau dilakukan?", "Bagaimana kondisi dipantau dan risiko ditangani?", "Bagaimana partisipasi berakhir dan apa tindak lanjutnya?"],
    assessmentNote: "Latihan ini mengukur pemahaman konsep umum. Hasilnya untuk membantu belajar, bukan untuk menentukan kelayakan atau menjadi syarat keikutsertaan.",
    begin: "Mulai cek pemahaman", next: "Lanjut", previous: "Kembali", skip: "Lewati pertanyaan", finish: "Lihat ringkasan", question: "Pertanyaan", of: "dari", explanation: "Penjelasan", correct: "Pilihan ini sejalan dengan konsep utama.", incorrect: "Mari lihat kembali konsep yang dijelaskan.",
    teachBackPlaceholder: "Tulis hal yang ingin Anda tanyakan (opsional). Hindari memasukkan nama atau informasi kesehatan pribadi.",
    teachBackPrivacy: "Teks hanya berada di perangkat selama sesi ini dan tidak dikirim ke server.", quizResult: "Ringkasan latihan Anda", answered: "jawaban pilihan ganda/skenario diringkas di bawah. Tidak ada nilai lulus.", score: "Jawaban yang sejalan", percent: "kecocokan jawaban", teachBackReview: "Jawaban teach-back tidak dinilai otomatis", reviewHuman: "Penilaian jawaban bebas memerlukan rubrik tervalidasi dan peninjauan manusia. Demo ini tidak menyimpan teks Anda.", tryAgain: "Ulangi latihan", openGaps: "Lihat peta pemahaman", noAnswers: "Anda melewati semua pertanyaan pilihan. Coba kembali ke materi atau lanjutkan ke diskusi dengan peneliti.",
    gapsTitle: "Topik untuk dipelajari atau dibicarakan lagi", gapsIntro: "Ringkasan hanya menghitung pertanyaan yang Anda jawab. Topik yang perlu penguatan adalah undangan untuk berdiskusi, bukan penilaian terhadap diri Anda.", noGapData: "Belum ada jawaban latihan pada sesi ini.", revisit: "Buka materi terkait", askAbout: "Tanyakan kepada peneliti", noGaps: "Dari jawaban yang tersedia, belum ada topik yang menonjol untuk ditinjau ulang. Anda tetap boleh bertanya kapan saja.",
    addQuestion: "Tambah pertanyaan", customQuestion: "Tulis pertanyaan Anda", add: "Tambah", remove: "Hapus", questionList: "Daftar pertanyaan untuk diskusi", noQuestions: "Pilih saran di atas atau tulis pertanyaan Anda sendiri.", print: "Cetak / simpan PDF", printHint: "Gunakan pilihan “Save as PDF” pada dialog cetak perangkat Anda.",
    dashboardTitle: "Wawasan komunikasi untuk institusi", dashboardIntro: "Dashboard nyata harus hanya menampilkan ringkasan agregat yang melindungi privasi dan berasal dari asesmen yang sah.", illustrative: "ILUSTRASI · ANGKA SINTETIS · BUKAN HASIL RISET", dataDisclaimer: "Angka berikut hanya menggambarkan bentuk visual dashboard. Tidak berasal dari peserta atau penelitian sungguhan dan tidak boleh dikutip sebagai bukti dampak.", prePost: "Contoh tampilan pre-test dan post-test", before: "Sebelum belajar", after: "Sesudah belajar", topic: "Topik", sample: "Contoh nilai", priority: "Contoh area untuk ditinjau", priorityNote: "Risiko dan manfaat perlu dijelaskan dengan bahasa yang lebih mudah. Tindakan nyata harus didasarkan pada data agregat yang sah dan review konten.", noStudy: "Belum ada materi penelitian yang dipublikasikan", noStudyNote: "Sistem produksi perlu menyimpan sumber, versi, reviewer, dan status persetujuan untuk setiap konten.", institutional: "Pengguna institusi", institutions: "Rumah sakit · CRU · CRO · Universitas · Sponsor", businessModel: "Model keberlanjutan", businessModelText: "Lisensi per institusi atau per studi, layanan pembuatan materi, dan pelatihan implementasi.",
    accessTitle: "Akses sesuai kebutuhan Anda", accessIntro: "Kontrol ini bekerja pada sesi demo. Tidak ada preferensi atau aktivitas yang dikirim ke server.", language: "Bahasa", textSize: "Ukuran teks", normal: "Normal", large: "Besar", narration: "Audio narasi", play: "Putar narasi materi ini", stop: "Hentikan narasi", printMaterials: "Cetak materi", lowBandwidth: "Mode hemat data", lowBandwidthText: "Demo ini tidak memuat gambar atau video eksternal. Mode ini juga mengurangi dekorasi visual.", subtitle: "Teks yang sedang dibacakan tetap terlihat di layar sebagai teks pendamping.", notSupported: "Audio narasi tidak didukung di browser ini.",
    safetyTitle: "Informasi yang jelas. Keputusan tetap milik Anda.", safetyText: "SAPA-UJI mendukung edukasi dan pemahaman. Platform ini bukan nasihat medis, tidak menentukan kelayakan, dan tidak menggantikan diskusi maupun proses persetujuan resmi dengan tim penelitian.", about: "Materi khusus studi perlu dilacak ke sumber, diberi versi, ditinjau reviewer kompeten, lalu disetujui sebelum dipublikasikan. Prototipe ini menyediakan simulasi alur review dan administrasi; data demo disimpan lokal di browser, tanpa akun atau API.", footer: "Untuk edukasi · Tidak untuk keputusan klinis", menu: "Buka navigasi", closeMenu: "Tutup navigasi", select: "Buka modul", module: "Modul", min: "mnt",
  },
  en: {
    navLearning: "Learning hub", navJourney: "Research journey", navAbout: "About", start: "Start learning",
    label: "CLINICAL RESEARCH LITERACY, MADE CLEARER", hero1: "Understand the research.", hero2: "Know your rights.",
    intro: "Plain-language learning helps you understand clinical research concepts, prepare questions, and talk with a research team.",
    explore: "Explore learning", positioning: "Education and comprehension support for clinical research",
    demo: "EDUCATIONAL DEMO · NOT A SPECIFIC STUDY", demoNote: "This example contains no protocol or real study information. Study-specific information should only appear after it is checked against an official source and approved by a competent reviewer.",
    modulesEyebrow: "LEARNING HUB", modulesTitle: "Learn what matters to you", modulesIntro: "Choose a topic to open related learning, practice, or support tools.",
    chooseModule: "Choose a module", read: "Short explanation", detail: "More detail", glossary: "Glossary", sourceBanner: "General educational material. It does not replace approved study information.",
    journeyTitle: "Every study has a different journey", journeyIntro: "This framework shows things you can ask. The order, procedures, experiences, schedule, and specific rights must come from an approved protocol.",
    framework: "EDUCATIONAL FRAMEWORK · NOT A CLINICAL SCHEDULE", sourceMissing: "No study information is connected", sourceMissingText: "In a complete product, study stages and details would appear here after protocol matching and reviewer approval. This demo does not invent study details.",
    stages: ["Preparation & consent", "Screening", "Intervention", "Monitoring", "Study closeout"],
    stageQuestions: ["What should I know before deciding?", "What checks happen and why?", "What will be provided or done?", "How will my health be monitored and risks managed?", "How does participation end and what follow-up is there?"],
    assessmentNote: "This practice checks general concepts. Results are for learning, not eligibility decisions or a condition of participation.",
    begin: "Start comprehension check", next: "Next", previous: "Back", skip: "Skip question", finish: "View summary", question: "Question", of: "of", explanation: "Explanation", correct: "This choice reflects the key concept.", incorrect: "Let's revisit the concept in the explanation.",
    teachBackPlaceholder: "Write something you would like to ask (optional). Avoid names or personal health information.",
    teachBackPrivacy: "Your text stays on this device during this session and is not sent to a server.", quizResult: "Your practice summary", answered: "multiple-choice/scenario responses are summarized below. There is no pass score.", score: "Choices aligned", percent: "response match", teachBackReview: "Teach-back is not scored automatically", reviewHuman: "Free-text responses require a validated rubric and human review. This demo does not save your text.", tryAgain: "Try the practice again", openGaps: "View comprehension gaps", noAnswers: "You skipped the choice questions. You can revisit the learning material or continue your discussion with a researcher.",
    gapsTitle: "Topics to revisit or discuss", gapsIntro: "Only questions you answered are included. A topic for reinforcement is an invitation to talk, not a judgment about you.", noGapData: "There are no practice responses in this session yet.", revisit: "Open related material", askAbout: "Ask the researcher", noGaps: "Your current responses do not highlight a topic to revisit. You can still ask questions at any time.",
    addQuestion: "Add a question", customQuestion: "Write your question", add: "Add", remove: "Remove", questionList: "Questions for your discussion", noQuestions: "Choose a suggestion above or write your own question.", print: "Print / save PDF", printHint: "Choose “Save as PDF” in your device's print dialog.",
    dashboardTitle: "Communication insights for institutions", dashboardIntro: "A real dashboard should only show privacy-protecting aggregate summaries from valid assessments.", illustrative: "ILLUSTRATION · SYNTHETIC VALUES · NOT RESEARCH RESULTS", dataDisclaimer: "These values only demonstrate a possible dashboard layout. They are not from real participants or studies and must not be cited as impact evidence.", prePost: "Illustrative pre-test and post-test view", before: "Before learning", after: "After learning", topic: "Topic", sample: "Example value", priority: "Illustrative area to review", priorityNote: "Risks and benefits may need clearer explanations. Real actions must rely on valid aggregate data and content review.", noStudy: "No study content has been published", noStudyNote: "A production system should track source, version, reviewer, and approval status for every item.", institutional: "Institutional users", institutions: "Hospitals · CRUs · CROs · Universities · Sponsors", businessModel: "Sustainability model", businessModelText: "Institution or per-study licenses, learning content services, and implementation training.",
    accessTitle: "Access that works for you", accessIntro: "These controls work in this demo session. No preferences or activity are sent to a server.", language: "Language", textSize: "Text size", normal: "Normal", large: "Large", narration: "Audio narration", play: "Play narration for this module", stop: "Stop narration", printMaterials: "Print material", lowBandwidth: "Low-data mode", lowBandwidthText: "This demo uses no external images or video. This mode also reduces visual decoration.", subtitle: "The words being read remain visible on screen as captions.", notSupported: "Audio narration is not supported in this browser.",
    safetyTitle: "Clear information. Your decision stays yours.", safetyText: "SAPA-UJI supports education and understanding. It is not medical advice, does not determine eligibility, and does not replace discussion or the official consent process with a research team.", about: "Study-specific materials should be traceable to a source, versioned, reviewed by a competent reviewer, and approved before publication. This prototype includes simulated review and administration workflows; demo data stays in this browser, with no accounts or API.", footer: "For education · Not for clinical decisions", menu: "Open navigation", closeMenu: "Close navigation", select: "Open module", module: "Module", min: "min",
  },
} as const;

function localized(value: Localized, language: Language) {
  return value[language];
}

export function SapaUjiApp() {
  const [language, setLanguage] = useState<Language>("id");
  const [activeModule, setActiveModule] = useState<ModuleId>("simplifier");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [detailMode, setDetailMode] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [audioMessage, setAudioMessage] = useState("");
  const [stageIndex, setStageIndex] = useState(0);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [questionBank, setQuestionBank] = useState(assessmentQuestions);
  const [assessmentIndex, setAssessmentIndex] = useState(0);
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [teachBack, setTeachBack] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");
  const t = copy[language];
  const active = moduleList.find((item) => item.id === activeModule) ?? moduleList[0];
  const currentQuestion = questionBank[assessmentIndex];

  useEffect(() => {
    const originalSize = document.documentElement.style.fontSize;
    const defaultSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
    document.documentElement.style.fontSize = `${defaultSize * fontScale}px`;
    return () => { document.documentElement.style.fontSize = originalSize; };
  }, [fontScale]);

  useEffect(() => {
    const originalLanguage = document.documentElement.lang;
    document.documentElement.lang = language;
    return () => { document.documentElement.lang = originalLanguage; };
  }, [language]);

  useEffect(() => {
    try {
      const saved = safeReadDemoStore(window.localStorage.getItem(DEMO_STORE_KEY));
      const publishedQuestions = saved.questions.filter((question) => (question.institutionId ?? DEMO_INSTITUTION_ID) === saved.activeInstitutionId && question.status === "PUBLISHED");
      const choiceQuestions: AssessmentQuestion[] = publishedQuestions.filter((question) => question.kind !== "TEACH_BACK").map((question) => ({
        id: question.id,
        category: question.topic,
        title: { id: question.prompt, en: question.prompt },
        method: { id: question.kind === "SCENARIO" ? "Skenario" : question.kind === "TEACH_BACK" ? "Teach-back" : "Pilihan ganda", en: question.kind === "SCENARIO" ? "Scenario" : question.kind === "TEACH_BACK" ? "Teach-back" : "Multiple choice" },
        ...(question.kind === "SCENARIO" ? { scenario: { id: "Baca skenarionya, lalu pilih tindakan yang mencerminkan pemahaman Anda.", en: "Read the scenario and choose the action that reflects your understanding." } } : {}),
        options: question.choices.map((choice) => ({ id: choice, en: choice })),
        ...(question.correctIndex === null ? {} : { correct: question.correctIndex }),
        feedback: { id: "Tinjau penjelasan umum untuk topik ini. Rincian studi tertentu harus bersumber dari dokumen resmi dan tim penelitian.", en: "Review the general explanation for this topic. Details for a specific study must come from its official documents and research team." },
      }));
      const teachBackQuestion = publishedQuestions.find((question) => question.kind === "TEACH_BACK");
      setQuestionBank([
        ...choiceQuestions,
        ...(teachBackQuestion ? [{
          id: teachBackQuestion.id,
          category: teachBackQuestion.topic,
          title: { id: teachBackQuestion.prompt, en: teachBackQuestion.prompt },
          method: { id: "Teach-back · Jawaban bebas untuk refleksi", en: "Teach-back · Free-text reflection" },
          feedback: { id: "Jawaban ini tidak dinilai otomatis dan tidak disimpan. Teach-back sebaiknya ditinjau manusia dengan rubrik yang disetujui.", en: "This response is not automatically scored or stored. Teach-back should be reviewed by a person using an approved rubric." },
        }] : []),
      ]);
    } catch { /* Keep the built-in educational questions if local storage is unavailable. */ }
  }, []);

  useEffect(() => () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const scoredAnswers: ScoredAnswer[] = useMemo(
    () => questionBank.flatMap((question) => {
      const selected = answers[question.id];
      if (selected === undefined || question.correct === undefined) return [];
      return [{ correct: selected === question.correct, points: 1, category: question.category }];
    }),
    [answers, questionBank],
  );
  const result = useMemo(() => calculateScore(scoredAnswers), [scoredAnswers]);

  function selectModule(id: ModuleId) {
    setActiveModule(id);
    setMobileMenuOpen(false);
    document.getElementById("module-view")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function playNarration() {
    if (!("speechSynthesis" in window)) {
      setAudioMessage(t.notSupported);
      return;
    }
    window.speechSynthesis.cancel();
    const moduleNarration: Record<ModuleId, Localized> = {
      simplifier: { id: "Penelitian klinis adalah penelitian pada manusia untuk mempelajari pertanyaan tentang kesehatan. Rincian setiap penelitian berbeda dan perlu diperiksa dari dokumen yang disetujui.", en: "A clinical study is research involving people to study a health question. The details of each study vary and should be checked in its approved documents." },
      journey: { id: copy.id.journeyIntro, en: copy.en.journeyIntro },
      assessment: { id: copy.id.assessmentNote, en: copy.en.assessmentNote },
      gaps: { id: copy.id.gapsIntro, en: copy.en.gapsIntro },
      questions: { id: "Siapkan pertanyaan untuk dibicarakan dengan tim penelitian.", en: "Prepare questions to discuss with the research team." },
      dashboard: { id: copy.id.dashboardIntro, en: copy.en.dashboardIntro },
      accessibility: { id: copy.id.accessIntro, en: copy.en.accessIntro },
    };
    const message = `${localized(active.title, language)}. ${localized(active.description, language)}. ${localized(moduleNarration[activeModule], language)}`;
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = language === "id" ? "id-ID" : "en-US";
    utterance.onstart = () => setAudioMessage(message);
    utterance.onend = () => setAudioMessage("");
    window.speechSynthesis.speak(utterance);
  }

  function stopNarration() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setAudioMessage("");
  }

  function resetAssessment() {
    setAnswers({});
    setTeachBack("");
    setAssessmentIndex(0);
    setAssessmentDone(false);
    setAssessmentStarted(true);
  }

  function moveAssessment(direction: number) {
    if (assessmentIndex === questionBank.length - 1 && direction > 0) {
      setAssessmentDone(true);
      return;
    }
    setAssessmentIndex((value) => Math.min(questionBank.length - 1, Math.max(0, value + direction)));
  }

  function addQuestion(value: string) {
    const normalized = value.trim();
    if (!normalized || questions.includes(normalized)) return;
    setQuestions((items) => [...items, normalized]);
    setCustomQuestion("");
  }

  function printToPdf(target: "questions" | "materials") {
    document.body.dataset.printTarget = target;
    let fallbackTimer = 0;
    const cleanup = () => {
      delete document.body.dataset.printTarget;
      window.removeEventListener("afterprint", cleanup);
      window.clearTimeout(fallbackTimer);
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    fallbackTimer = window.setTimeout(cleanup, 60_000);
    window.print();
  }

  return (
    <main id="app-root" className={lowBandwidth ? "app low-bandwidth" : "app"}>
      <header className="topbar">
        <a className="brand" href="#home" aria-label={language === "id" ? "SAPA-UJI, kembali ke beranda" : "SAPA-UJI, back to home"}>
          <span className="brandmark"><HeartHandshake size={23} /></span>
          <span>SAPA<span className="teal">-UJI</span><small>SMART RESEARCH, CLEAR UNDERSTANDING</small></span>
        </a>
        <nav className={mobileMenuOpen ? "main-nav nav-open" : "main-nav"} aria-label={language === "id" ? "Navigasi utama" : "Main navigation"}>
          <Link href="/learn" onClick={() => setMobileMenuOpen(false)}>{t.navLearning}</Link>
          <Link href="/studies/demo-study" onClick={() => setMobileMenuOpen(false)}>{language === "id" ? "Studi demo" : "Demo study"}</Link>
          <Link href="/workspace" onClick={() => setMobileMenuOpen(false)}>{language === "id" ? "Untuk institusi" : "For institutions"}</Link>
          <Link href="/login" onClick={() => setMobileMenuOpen(false)}>{language === "id" ? "Masuk demo" : "Demo sign-in"}</Link>
        </nav>
        <div className="nav-actions">
          <button className="language-button" onClick={() => setLanguage((value) => value === "id" ? "en" : "id")} aria-label={language === "id" ? "Switch language to English" : "Ganti bahasa ke Bahasa Indonesia"}>
            <Languages size={17} /><span>{language.toUpperCase()}</span>
          </button>
          <button className="primary small" onClick={() => selectModule("simplifier")}>{t.start}<ChevronRight size={16} /></button>
          <button className="mobile-menu" aria-label={mobileMenuOpen ? t.closeMenu : t.menu} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" />{t.label}</div>
          <h1>{t.hero1}<br /><em>{t.hero2}</em></h1>
          <p className="hero-desc">{t.intro}</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => selectModule("simplifier")}>{t.explore}<ChevronRight size={17} /></button>
            <Link className="textlink" href="/studies/demo-study">{language === "id" ? "Lihat studi demo" : "View demo study"}<ArrowRight size={15} /></Link>
          </div>
          <div className="hero-position"><ShieldCheck size={18} /><span>{t.positioning}</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-center"><BookOpen size={37} /></div>
          <div className="art-chip chip-one"><CheckCircle2 size={15} />Understand</div>
          <div className="art-chip chip-two"><CircleHelp size={15} />Ask freely</div>
          <span className="art-dot dot-one" /><span className="art-dot dot-two" />
        </div>
      </section>

      <section className="demo-banner" role="note">
        <span className="demo-icon"><ShieldCheck size={20} /></span>
        <div><b>{t.demo}</b><p>{t.demoNote}</p></div>
      </section>

      <section className="learning" id="modules">
        <div className="section-head">
          <div><div className="eyebrow muted">{t.modulesEyebrow}</div><h2>{t.modulesTitle}</h2><p>{t.modulesIntro}</p></div>
          <button className="text-button" onClick={() => selectModule("accessibility")}><Globe2 size={16} />{t.accessTitle}</button>
        </div>
        <div className="learn-grid">
          <div className="module-list" role="group" aria-label={t.chooseModule}>
            {moduleList.map((item, index) => {
              const Icon = item.icon;
              const selected = activeModule === item.id;
              return <button key={item.id} aria-pressed={selected} aria-controls="module-view" className={`module ${selected ? "selected" : ""}`} onClick={() => setActiveModule(item.id)}>
                <span className="module-icon"><Icon size={18} /></span><span className="module-copy"><b>{String(index + 1).padStart(2, "0")} · {localized(item.title, language)}</b><small>{localized(item.description, language)}</small></span><ChevronRight className="module-arrow" size={16} />
              </button>;
            })}
            <p className="source-banner"><ShieldCheck size={15} />{t.sourceBanner}</p>
          </div>
          <section className="module-card" id="module-view" aria-label={`${t.module}: ${localized(active.title, language)}`}>
            <div className="module-card-head">
              <div><span className="module-kicker">{t.module} {String(moduleList.findIndex((item) => item.id === activeModule) + 1).padStart(2, "0")} · {localized(active.time, language)}</span><h3>{localized(active.title, language)}</h3><p>{localized(active.description, language)}</p></div>
              <div className="card-tools">
                <button className="round-tool" title={audioMessage ? t.stop : t.play} aria-label={audioMessage ? t.stop : t.play} onClick={audioMessage ? stopNarration : playNarration}>{audioMessage ? <X size={17} /> : <Volume2 size={17} />}</button>
              </div>
            </div>
            <ModuleContent
              activeModule={activeModule} language={language} t={t} detailMode={detailMode} setDetailMode={setDetailMode}
              stageIndex={stageIndex} setStageIndex={setStageIndex} assessmentStarted={assessmentStarted}
              assessmentIndex={assessmentIndex} assessmentQuestions={questionBank} currentQuestion={currentQuestion} assessmentDone={assessmentDone} answers={answers} setAnswers={setAnswers}
              teachBack={teachBack} setTeachBack={setTeachBack} result={result} scoredAnswers={scoredAnswers} resetAssessment={resetAssessment}
              moveAssessment={moveAssessment} questions={questions} setQuestions={setQuestions} customQuestion={customQuestion}
              setCustomQuestion={setCustomQuestion} addQuestion={addQuestion} selectModule={selectModule} lowBandwidth={lowBandwidth}
              setLowBandwidth={setLowBandwidth} fontScale={fontScale} setFontScale={setFontScale} audioMessage={audioMessage}
              stopNarration={stopNarration} playNarration={playNarration}
              toggleLanguage={() => setLanguage((value) => value === "id" ? "en" : "id")}
               printToPdf={printToPdf}
            />
            {audioMessage && <p className="audio-caption" aria-live="polite">{audioMessage}</p>}
          </section>
        </div>
      </section>

      <section className="journey" id="journey">
        <div className="journey-intro"><div className="eyebrow muted">{t.framework}</div><h2>{t.journeyTitle}</h2><p>{t.journeyIntro}</p></div>
        <div className="journey-panel">
          <div className="journey-warning"><FileText size={18} /><div><b>{t.sourceMissing}</b><p>{t.sourceMissingText}</p></div></div>
          <div className="stage-list">
            {t.stages.map((stage, index) => <button className={`stage ${stageIndex === index ? "active" : ""}`} onClick={() => setStageIndex(index)} key={stage} aria-pressed={stageIndex === index}>
              <span className="stage-number">{index + 1}</span><span><b>{stage}</b>{stageIndex === index && <small>{t.stageQuestions[index]}</small>}</span><ChevronDown size={16} />
            </button>)}
          </div>
          <button className="text-button" onClick={() => selectModule("questions")}><CircleHelp size={16} />{t.askAbout}</button>
        </div>
      </section>

      <section className="notice" id="about">
        <span className="notice-icon"><ShieldCheck size={21} /></span>
        <div><b>{t.safetyTitle}</b><p>{t.safetyText}</p><p className="governance-copy">{t.about}</p></div>
      </section>

      <footer>
        <a className="brand" href="#home"><span className="brandmark"><HeartHandshake size={20} /></span><span>SAPA<span className="teal">-UJI</span><small>{language === "id" ? "PAHAMI PENELITIANNYA, KENALI HAKNYA" : "UNDERSTAND RESEARCH, KNOW YOUR RIGHTS"}</small></span></a>
        <div className="foot-links"><Link href="/learn">{t.navLearning}</Link><Link href="/questions">{language === "id" ? "Daftar pertanyaan" : "Question list"}</Link><Link href="/workspace">{language === "id" ? "Untuk institusi" : "For institutions"}</Link><Link href="/accessibility">{language === "id" ? "Aksesibilitas" : "Accessibility"}</Link></div>
        <span className="copyright">© 2026 SAPA-UJI · {t.footer}</span>
      </footer>
      <article className="printable-material" id="printable-material">
        <h1>SAPA-UJI</h1>
        <p>{language === "id" ? "Materi edukasi umum · Bukan informasi penelitian tertentu" : "General educational material · Not information about a specific study"}</p>
        <h2>{language === "id" ? "Apa itu penelitian klinis?" : "What is a clinical study?"}</h2>
        <p>{language === "id" ? "Penelitian pada manusia untuk mempelajari pertanyaan tentang kesehatan, seperti bagaimana suatu obat atau vaksin bekerja. Penelitian dirancang untuk menjawab pertanyaan tertentu; hasil dan manfaat bagi setiap orang tidak dapat dijamin." : "Research involving people to study a health question, such as how a medicine or vaccine works. A study is designed to answer a specific question; results and benefits for each person cannot be guaranteed."}</p>
        <h2>{language === "id" ? "Yang dapat ditanyakan kepada tim penelitian" : "Questions you can ask the research team"}</h2>
        <ul>{questionSuggestions.slice(0, 3).map((question) => <li key={question.id}>{localized(question, language)}</li>)}</ul>
        <p>{t.safetyText}</p>
      </article>
    </main>
  );
}

type ModuleContentProps = {
  activeModule: ModuleId; language: Language; t: (typeof copy)[Language]; detailMode: boolean; setDetailMode: (value: boolean) => void;
  stageIndex: number; setStageIndex: (value: number) => void; assessmentStarted: boolean;
  assessmentIndex: number; assessmentQuestions: AssessmentQuestion[]; currentQuestion: AssessmentQuestion | undefined; assessmentDone: boolean; answers: Record<string, number>;
  setAnswers: (value: (old: Record<string, number>) => Record<string, number>) => void; teachBack: string; setTeachBack: (value: string) => void;
  result: ReturnType<typeof calculateScore>; scoredAnswers: ScoredAnswer[]; resetAssessment: () => void; moveAssessment: (direction: number) => void;
  questions: string[]; setQuestions: (value: (old: string[]) => string[]) => void; customQuestion: string; setCustomQuestion: (value: string) => void;
  addQuestion: (value: string) => void; selectModule: (id: ModuleId) => void; lowBandwidth: boolean; setLowBandwidth: (value: boolean) => void;
  fontScale: number; setFontScale: (value: number) => void; audioMessage: string; stopNarration: () => void;
  playNarration: () => void; toggleLanguage: () => void; printToPdf: (target: "questions" | "materials") => void;
};

function ModuleContent(props: ModuleContentProps) {
  const {
    activeModule, language, t, detailMode, setDetailMode, stageIndex, setStageIndex, assessmentStarted,
    assessmentIndex, assessmentQuestions, currentQuestion, assessmentDone, answers, setAnswers, teachBack,
    setTeachBack, result, scoredAnswers, resetAssessment, moveAssessment, questions, setQuestions, customQuestion,
    setCustomQuestion, addQuestion, selectModule, lowBandwidth, setLowBandwidth, fontScale, setFontScale,
    audioMessage, stopNarration, playNarration, toggleLanguage, printToPdf,
  } = props;

  if (activeModule === "simplifier") return <div className="module-body reading-content">
    <div className="demo-content-label"><Sparkles size={15} />{t.demo}</div>
    <div className="mode-switch" role="group" aria-label={language === "id" ? "Tingkat penjelasan" : "Explanation level"}>
      <button className={!detailMode ? "active" : ""} aria-pressed={!detailMode} onClick={() => setDetailMode(false)}>{t.read}</button>
      <button className={detailMode ? "active" : ""} aria-pressed={detailMode} onClick={() => setDetailMode(true)}>{t.detail}</button>
    </div>
    <article className="plain-card">
      <span className="plain-label">{language === "id" ? "KONSEP" : "CONCEPT"}</span>
      <h4>{language === "id" ? "Uji klinis" : "Clinical study"}</h4>
      <p>{language === "id" ? "Penelitian pada manusia untuk mempelajari pertanyaan tentang kesehatan, seperti bagaimana suatu obat atau vaksin bekerja." : "Research involving people to study a health question, such as how a medicine or vaccine works."}</p>
      {detailMode && <p className="detail-paragraph">{language === "id" ? "Penelitian mengikuti rencana yang menjelaskan siapa yang dapat ikut, kegiatan yang dilakukan, informasi yang dikumpulkan, serta cara memantau keselamatan. Rincian tersebut berbeda untuk tiap penelitian dan perlu diperiksa dari dokumen yang disetujui." : "A study follows a plan describing who may take part, what activities happen, what information is collected, and how safety is monitored. Those details vary by study and should be checked in its approved documents."}</p>}
    </article>
    <div className="glossary-card"><div><b>{t.glossary}</b><span>{language === "id" ? "Istilah penting" : "Key term"}</span></div><details><summary>{language === "id" ? "Protokol penelitian" : "Research protocol"}</summary><p>{language === "id" ? "Dokumen yang menjelaskan rencana, tujuan, prosedur, dan pengawasan sebuah penelitian." : "A document describing a study's plan, purpose, procedures, and oversight."}</p></details></div>
    <div className="principle-callout"><ShieldCheck size={18} /><p>{language === "id" ? "Penjelasan yang disederhanakan perlu mempertahankan makna dokumen sumber dan ditinjau sebelum digunakan untuk penelitian tertentu." : "A simplified explanation should preserve the source document's meaning and be reviewed before use for a specific study."}</p></div>
    <button className="primary module-cta" onClick={() => selectModule("assessment")}>{t.begin}<ArrowRight size={16} /></button>
  </div>;

  if (activeModule === "journey") return <div className="module-body reading-content">
    <div className="source-status"><FileText size={19} /><div><b>{t.sourceMissing}</b><p>{t.sourceMissingText}</p></div></div>
    <div className="journey-questions"><b>{language === "id" ? "Hal yang dapat Anda tanyakan" : "Things you can ask"}</b>
      {t.stageQuestions.map((question, index) => <button key={question} className={stageIndex === index ? "selected" : ""} onClick={() => setStageIndex(index)}><span>{index + 1}</span>{question}</button>)}
    </div>
    <div className="principle-callout"><ShieldCheck size={18} /><p>{language === "id" ? "Tahapan, frekuensi kunjungan, durasi, potensi pengalaman, dan hak peserta harus sesuai sumber resmi untuk studi tersebut." : "Study stages, visit frequency, duration, possible experiences, and participant rights must match official sources for that study."}</p></div>
  </div>;

  if (activeModule === "assessment") return <div className="module-body">
    <p className="assessment-note"><ShieldCheck size={17} />{t.assessmentNote}</p>
    {assessmentQuestions.length === 0 ? <div className="empty-state"><CircleHelp size={20}/><p>{language === "id" ? "Belum ada pertanyaan yang disetujui dan dipublikasikan." : "No questions have been approved and published yet."}</p></div> : !assessmentStarted ? <div className="assessment-start"><div className="assessment-icon"><ClipboardList size={26} /></div><h4>{language === "id" ? "Lima dimensi pemahaman" : "Five dimensions of understanding"}</h4><div className="dimension-pills">{Object.values(categoryLabels).filter((label) => label.id !== "Teach-back").map((label) => <span key={label.id}>{localized(label, language)}</span>)}</div><p>{language === "id" ? "Termasuk pertanyaan berbasis skenario dan refleksi teach-back." : "Includes a scenario-based question and a teach-back reflection."}</p><button className="primary" onClick={resetAssessment}>{t.begin}<ArrowRight size={16} /></button></div>
      : assessmentDone ? <div className="assessment-result">
        <div className="result-head"><div className="assessment-icon"><CheckCircle2 size={25} /></div><div><h4>{t.quizResult}</h4><p>{t.answered}</p></div></div>
        {scoredAnswers.length === 0 ? <p className="empty-state">{t.noAnswers}</p> : <>
          <div className="result-score"><b>{result.totalScore}/{result.maximumScore}</b><span>{t.score}</span><strong>{result.percentageScore}%</strong><small>{t.percent}</small></div>
          <div className="topic-results">{result.categories.map((category) => <div key={category.category} className="topic-result"><div><span>{localized(categoryLabels[category.category], language)}</span><b>{category.percentageScore}%</b></div><div className="metric-track"><i style={{ width: `${category.percentageScore}%` }} /></div></div>)}</div>
        </>}
        <div className="teachback-review"><b>{t.teachBackReview}</b><p>{t.reviewHuman}</p></div>
        <div className="result-actions"><button className="secondary-button" onClick={resetAssessment}><RotateCcw size={15} />{t.tryAgain}</button><button className="primary" onClick={() => selectModule("gaps")}>{t.openGaps}<ArrowRight size={15} /></button></div>
      </div> : <div className="question-flow">
        <div className="question-meta"><span>{localized(currentQuestion?.method ?? { id: "", en: "" }, language)}</span><span>{t.question} {assessmentIndex + 1} {t.of} {assessmentQuestions.length}</span></div>
        <div className="progress" role="progressbar" aria-label={`${t.question} ${assessmentIndex + 1} ${t.of} ${assessmentQuestions.length}`} aria-valuemin={1} aria-valuemax={assessmentQuestions.length} aria-valuenow={assessmentIndex + 1}><span style={{ width: `${((assessmentIndex + 1) / assessmentQuestions.length) * 100}%` }} /></div>
        {currentQuestion?.scenario && <div className="scenario-box"><b>{language === "id" ? "Skenario" : "Scenario"}</b><p>{localized(currentQuestion.scenario, language)}</p></div>}
        <h4 className="question-title">{currentQuestion && localized(currentQuestion.title, language)}</h4>
        {currentQuestion?.options ? <div className="answers">{currentQuestion.options.map((option, index) => {
          const selected = answers[currentQuestion.id] === index;
          return <button key={option.id} className={`answer ${selected ? "answer-selected" : ""}`} aria-pressed={selected} onClick={() => setAnswers((old) => ({ ...old, [currentQuestion.id]: index }))}><span className="radio">{selected && <i />}</span><span>{localized(option, language)}</span>{selected && <Check size={16} />}</button>;
        })}</div> : <div className="teachback-input"><textarea aria-label={localized(currentQuestion?.title ?? { id: "", en: "" }, language)} aria-describedby="teachback-hint" value={teachBack} onChange={(event) => setTeachBack(event.target.value)} placeholder={t.teachBackPlaceholder} maxLength={600} /><small id="teachback-hint">{t.teachBackPrivacy} · {teachBack.length}/600</small></div>}
        {currentQuestion && answers[currentQuestion.id] !== undefined && currentQuestion.options && <div className="explanation" role="status" aria-live="polite"><b>{answers[currentQuestion.id] === currentQuestion.correct ? t.correct : t.incorrect} {t.explanation}</b><p>{localized(currentQuestion.feedback, language)}</p></div>}
        <div className="question-footer"><button className="secondary-button" onClick={() => moveAssessment(-1)} disabled={assessmentIndex === 0}><ChevronLeft size={15} />{t.previous}</button><div>{assessmentIndex < assessmentQuestions.length - 1 && <button className="skip-button" onClick={() => moveAssessment(1)}>{t.skip}</button>}<button className="primary" onClick={() => moveAssessment(1)}>{assessmentIndex === assessmentQuestions.length - 1 ? t.finish : t.next}<ChevronRight size={15} /></button></div></div>
      </div>}
  </div>;

  if (activeModule === "gaps") return <div className="module-body reading-content">
    <p className="module-intro">{t.gapsIntro}</p>
    {result.categories.length === 0 ? <div className="empty-state"><CircleHelp size={20} /><p>{t.noGapData}</p><button className="text-button" onClick={() => selectModule("assessment")}>{t.begin}<ArrowRight size={15} /></button></div> : <>
      <div className="gap-list">{result.categories.map((category) => <div key={category.category} className="gap-card">
        <div className="gap-heading"><span>{localized(categoryLabels[category.category], language)}</span><strong className={category.percentageScore < 70 ? "needs-review" : "understood"}>{category.percentageScore}%</strong></div>
        <div className="metric-track"><i style={{ width: `${category.percentageScore}%` }} /></div>
        <p>{category.percentageScore < 70 ? (language === "id" ? "Mungkin perlu penjelasan tambahan." : "May need additional explanation.") : (language === "id" ? "Relatif dipahami dari jawaban latihan." : "Relatively understood from your practice response.")}</p>
        {category.percentageScore < 70 && <button className="text-button" onClick={() => category.category === "RESEARCH_PROCEDURE" ? selectModule("journey") : category.category === "PARTICIPANT_RIGHTS" ? selectModule("journey") : selectModule("simplifier")}>{t.revisit}<ArrowRight size={14} /></button>}
      </div>)}</div>
      {result.categories.every((item) => item.percentageScore >= 70) && <div className="principle-callout"><CheckCircle2 size={18} /><p>{t.noGaps}</p></div>}
    </>}
    <button className="secondary-button" onClick={() => selectModule("questions")}><CircleHelp size={15} />{t.askAbout}</button>
  </div>;

  if (activeModule === "questions") return <div className="module-body reading-content">
    <p className="module-intro">{language === "id" ? "Pilih pertanyaan yang berguna untuk Anda. Daftar ini hanya tersimpan di memori browser selama sesi demo." : "Choose questions that are useful to you. This list only stays in browser memory during the demo session."}</p>
    <div className="suggestion-list">{questionSuggestions.map((suggestion) => <button key={suggestion.id} onClick={() => addQuestion(localized(suggestion, language))} disabled={questions.includes(localized(suggestion, language))}><Plus size={14} />{localized(suggestion, language)}</button>)}</div>
    <form className="custom-question-form" onSubmit={(event) => { event.preventDefault(); addQuestion(customQuestion); }}><label htmlFor="custom-question">{t.customQuestion}</label><div><input id="custom-question" value={customQuestion} onChange={(event) => setCustomQuestion(event.target.value)} maxLength={200} placeholder={language === "id" ? "Tulis pertanyaan singkat" : "Write a short question"} /><button className="primary" type="submit" disabled={!customQuestion.trim()}>{t.add}<Plus size={15} /></button></div></form>
    <div className="question-list-print" id="printable-questions"><h4>{t.questionList}</h4>{questions.length === 0 ? <p className="empty-state">{t.noQuestions}</p> : <ol>{questions.map((question, index) => <li key={`${question}-${index}`}><span>{question}</span><button className="remove-question" aria-label={`${t.remove}: ${question}`} onClick={() => setQuestions((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={14} /></button></li>)}</ol>}</div>
    <div className="print-actions"><button className="primary" disabled={questions.length === 0} onClick={() => printToPdf("questions")}><Printer size={15} />{t.print}</button><small>{t.printHint}</small></div>
  </div>;

  if (activeModule === "dashboard") return <div className="module-body reading-content">
    <p className="module-intro">{t.dashboardIntro}</p><div className="illustrative-banner"><Activity size={15} /><b>{t.illustrative}</b></div><p className="data-disclaimer">{t.dataDisclaimer}</p>
    <div className="dashboard-card"><div className="dashboard-card-head"><h4>{t.prePost}</h4><span>{language === "id" ? "DEMO" : "DEMO"}</span></div><div className="prepost-bars"><div className="bar-label">{t.before}<b>48%</b><span style={{ height: "48%" }} /></div><ArrowRight size={17} /><div className="bar-label after">{t.after}<b>63%</b><span style={{ height: "63%" }} /></div></div></div>
    <div className="dashboard-card"><div className="dashboard-card-head"><h4>{language === "id" ? "Pemahaman per topik" : "Comprehension by topic"}</h4><span>{t.sample}</span></div><div className="topic-results">{[["RESEARCH_PURPOSE", 90], ["RESEARCH_PROCEDURE", 85], ["POTENTIAL_BENEFITS", 60], ["POTENTIAL_RISKS", 45], ["PARTICIPANT_RIGHTS", 95]].map(([key, score]) => <div className="topic-result" key={key}><div><span>{localized(categoryLabels[String(key)], language)}</span><b>{score}%</b></div><div className="metric-track"><i style={{ width: `${score}%` }} /></div></div>)}</div></div>
    <div className="priority-card"><CircleHelp size={18} /><div><b>{t.priority}</b><p>{t.priorityNote}</p></div></div>
    <div className="source-status"><FileText size={18} /><div><b>{t.noStudy}</b><p>{t.noStudyNote}</p></div></div>
    <div className="institution-cards"><article><Users size={19} /><b>{t.institutional}</b><p>{t.institutions}</p></article><article><HeartHandshake size={19} /><b>{t.businessModel}</b><p>{t.businessModelText}</p></article></div>
  </div>;

  return <div className="module-body reading-content">
    <p className="module-intro">{t.accessIntro}</p>
    <div className="setting-row"><div><b>{t.language}</b><small>{language === "id" ? "Bahasa Indonesia / English" : "English / Bahasa Indonesia"}</small></div><button className="secondary-button" onClick={toggleLanguage}><Languages size={15} />{language === "id" ? "ID / EN" : "EN / ID"}</button></div>
    <div className="setting-row"><div><b>{t.textSize}</b><small>{fontScale === 1 ? t.normal : t.large}</small></div><div className="stepper"><button aria-label={language === "id" ? "Perkecil teks" : "Decrease text size"} onClick={() => setFontScale(1)} disabled={fontScale === 1}><Minus size={14} /></button><button aria-label={language === "id" ? "Perbesar teks" : "Increase text size"} onClick={() => setFontScale(1.12)} disabled={fontScale > 1}><Plus size={14} /></button></div></div>
    <div className="setting-row"><div><b>{t.narration}</b><small>{t.subtitle}</small></div><button className="secondary-button" onClick={audioMessage ? stopNarration : playNarration}>{audioMessage ? <X size={15} /> : <Headphones size={15} />}{audioMessage ? t.stop : t.play}</button></div>
    <div className="setting-row"><div><b>{t.lowBandwidth}</b><small>{t.lowBandwidthText}</small></div><button className={`toggle ${lowBandwidth ? "on" : ""}`} role="switch" aria-label={t.lowBandwidth} aria-checked={lowBandwidth} onClick={() => setLowBandwidth(!lowBandwidth)}><span /></button></div>
    <div className="print-actions"><button className="secondary-button" onClick={() => printToPdf("materials")}><Printer size={15} />{t.printMaterials}</button><small>{t.printHint}</small></div>
    <div className="principle-callout"><ShieldCheck size={18} /><p>{language === "id" ? "Audio menggunakan suara yang tersedia di browser dan tidak mengirimkan teks ke layanan eksternal." : "Audio uses voices available in your browser and does not send text to an external service."}</p></div>
  </div>;
}
