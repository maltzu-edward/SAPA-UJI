import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// These credentials and records are for local feature testing only.
const DEMO_PASSWORD = 'SapaUji-Demo-2026!';
const DEMO_NOTICE_VERSION = 'demo-seed-v1';

type DemoRole = 'USER' | 'RESEARCHER' | 'REVIEWER' | 'ADMIN';
type DemoStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
type DemoReviewDecision = 'APPROVED' | 'REJECTED' | 'REVISION_REQUIRED';

function seededId(key: string) {
  const bytes = createHash('sha1').update(`sapa-uji-demo:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const userDefinitions: Array<{ email: string; name: string; role: DemoRole; institution: string }> = [
  { email: 'demo@sapa-uji.local', name: 'Admin Demo SAPA-UJI', role: 'ADMIN', institution: 'SAPA-UJI Demo' },
  { email: 'reviewer@sapa-uji.local', name: 'Reviewer Demo', role: 'REVIEWER', institution: 'Tim Review Demo' },
  { email: 'researcher@sapa-uji.local', name: 'Peneliti Demo', role: 'RESEARCHER', institution: 'Institusi Simulasi SAPA-UJI' },
  { email: 'learner@sapa-uji.local', name: 'Pembelajar Demo', role: 'USER', institution: 'Akun uji SAPA-UJI' },
  ...Array.from({ length: 5 }, (_, index) => ({
    email: `demo.peserta${String(index + 1).padStart(2, '0')}@sapa-uji.local`,
    name: `Demo Peserta ${String(index + 1).padStart(2, '0')}`,
    role: 'USER' as const,
    institution: 'Akun sintetis untuk pengujian lokal',
  })),
];

const categories = [
  { name: 'Dasar-Dasar Uji Klinis', slug: 'dasar-dasar-uji-klinis', description: 'Konsep dasar penelitian klinis, tujuan, dan cara membaca informasinya.' },
  { name: 'Pengembangan Obat', slug: 'pengembangan-obat', description: 'Gambaran umum proses penelitian kandidat obat sebelum tersedia untuk digunakan.' },
  { name: 'Pengembangan Vaksin', slug: 'pengembangan-vaksin', description: 'Materi umum tentang penelitian dan pemantauan keamanan vaksin.' },
  { name: 'Tahapan Uji Klinis', slug: 'tahapan-uji-klinis', description: 'Tujuan tiap tahap penelitian klinis dan perbedaan pertanyaan yang dipelajari.' },
  { name: 'Risiko dan Manfaat', slug: 'risiko-dan-manfaat', description: 'Cara memahami risiko, ketidakpastian, dan potensi manfaat penelitian.' },
  { name: 'Hak Peserta Penelitian', slug: 'hak-peserta-penelitian', description: 'Hal yang dapat ditanyakan dan dibicarakan dengan tim penelitian.' },
  { name: 'Informed Consent', slug: 'informed-consent', description: 'Gambaran proses komunikasi dan persetujuan resmi dalam penelitian.' },
];

const references = {
  whoTrials: 'WHO — Clinical trials: https://www.who.int/news-room/questions-and-answers/item/clinical-trials',
  whoTopic: 'WHO — Clinical trials: https://www.who.int/health-topics/clinical-trials/',
  learnStudies: 'ClinicalTrials.gov — Learn About Studies: https://clinicaltrials.gov/study-basics/learn-about-studies',
  commonQuestions: 'ClinicalTrials.gov — Common Questions: https://clinicaltrials.gov/find-studies/for-patients/common-questions',
  whoVaccineSafety: 'WHO — Vaccine safety: https://www.who.int/news-room/questions-and-answers/item/vaccines-and-immunization-vaccine-safety',
};

const articles: Array<{
  slug: string;
  title: string;
  categorySlug: string;
  content: string;
  status: DemoStatus;
  sources: string[];
  decision?: DemoReviewDecision;
  reviewComments?: string;
}> = [
  {
    slug: 'dasar-dasar-uji-klinis',
    title: 'Memahami apa itu uji klinis',
    categorySlug: 'dasar-dasar-uji-klinis',
    content: 'Uji klinis adalah penelitian yang dirancang untuk mempelajari intervensi kesehatan pada manusia. Intervensi dapat berupa obat, vaksin, alat kesehatan, prosedur, atau pendekatan kesehatan lainnya.\n\nSetiap penelitian berusaha menjawab pertanyaan tertentu. Hasilnya belum diketahui sepenuhnya saat penelitian dimulai, sehingga manfaat bagi seseorang tidak dapat dijanjikan.\n\nHalaman ini adalah materi edukasi umum. Baca dokumen penelitian yang relevan dan tanyakan hal yang belum jelas kepada tim penelitian. Kuis SAPA-UJI tidak menilai kelayakan medis dan tidak menggantikan informed consent resmi.',
    status: 'PUBLISHED',
    sources: [references.whoTrials, references.learnStudies],
    decision: 'APPROVED',
    reviewComments: 'Materi demo telah diperiksa untuk menandai ketidakpastian dan menghindari klaim manfaat langsung.',
  },
  {
    slug: 'pengembangan-obat',
    title: 'Bagaimana kandidat obat diteliti?',
    categorySlug: 'pengembangan-obat',
    content: 'Sebelum suatu intervensi tersedia, peneliti mengumpulkan bukti melalui rangkaian penelitian. Penelitian pada manusia mempunyai tujuan dan rancangan yang berbeda-beda. Tidak semua kandidat menjadi produk yang disetujui atau tersedia.\n\nRincian tahapan, prosedur, dan pemantauan pada penelitian tertentu harus dibaca dari dokumen penelitian itu sendiri. Materi ini tidak memberikan saran pengobatan.',
    status: 'DRAFT',
    sources: [references.whoTrials, references.whoTopic],
    decision: 'REVISION_REQUIRED',
    reviewComments: 'Contoh revisi: tambahkan rujukan langsung yang dipakai penulis dan jelaskan bahwa tahap penelitian tidak selalu berjalan sebagai urutan sederhana.',
  },
  {
    slug: 'pengembangan-vaksin',
    title: 'Mengenal penelitian vaksin',
    categorySlug: 'pengembangan-vaksin',
    content: 'Penelitian vaksin mempelajari pertanyaan yang telah ditentukan, termasuk pemantauan keamanan dan respons terhadap vaksin. Pemantauan dilanjutkan sesuai rancangan penelitian dan ketentuan yang berlaku.\n\nInformasi tentang vaksin tertentu perlu merujuk pada dokumen dan sumber resmi yang membahas vaksin tersebut. Materi simulasi ini tidak menyatakan bahwa vaksin tertentu aman atau efektif untuk seseorang.',
    status: 'DRAFT',
    sources: [references.whoVaccineSafety],
  },
  {
    slug: 'tahapan-penelitian-klinis',
    title: 'Mengapa uji klinis memiliki tahapan?',
    categorySlug: 'tahapan-uji-klinis',
    content: 'Tahap penelitian klinis memiliki tujuan yang berbeda. Sebagai gambaran umum, penelitian awal dapat mempelajari keamanan dan dosis, sedangkan penelitian berikutnya dapat menilai pertanyaan lain pada kelompok yang berbeda. Rancangan tidak selalu sama untuk semua intervensi.\n\nNama fase saja tidak cukup untuk menjelaskan apa yang akan dialami peserta. Periksa tujuan, prosedur, lama keterlibatan, potensi risiko, dan pilihan yang tersedia pada informasi penelitian tertentu.',
    status: 'PUBLISHED',
    sources: [references.whoTopic, references.whoTrials],
    decision: 'APPROVED',
    reviewComments: 'Ringkasan fase diberi batasan sebagai gambaran umum; materi mengarahkan pembaca ke dokumen penelitian spesifik.',
  },
  {
    slug: 'risiko-dan-manfaat',
    title: 'Memahami risiko, ketidakpastian, dan potensi manfaat',
    categorySlug: 'risiko-dan-manfaat',
    content: 'Setiap penelitian dapat memiliki risiko, ketidaknyamanan, beban waktu, atau hal yang belum diketahui. Penjelasan penelitian perlu menerangkan risiko yang diketahui dan bagaimana peserta dapat meminta keterangan lebih lanjut.\n\nPotensi manfaat bukan jaminan bahwa peserta akan memperoleh manfaat langsung. Pertimbangkan informasi secara menyeluruh bersama tim penelitian dan tenaga kesehatan yang sesuai. SAPA-UJI tidak dapat menentukan apakah manfaat lebih besar daripada risiko bagi seseorang.',
    status: 'APPROVED',
    sources: [references.learnStudies, references.commonQuestions],
    decision: 'APPROVED',
    reviewComments: 'Disetujui sebagai contoh edukasi umum; tidak memberikan rekomendasi keputusan individual.',
  },
  {
    slug: 'hak-peserta-penelitian',
    title: 'Hal yang dapat ditanyakan sebelum ikut penelitian',
    categorySlug: 'hak-peserta-penelitian',
    content: 'Sebelum memutuskan, calon peserta dapat meminta penjelasan tentang tujuan penelitian, kegiatan yang dilakukan, waktu yang diperlukan, risiko yang diketahui, potensi manfaat, biaya atau penggantian yang relevan, serta siapa yang dapat dihubungi.\n\nBicarakan pertanyaan dengan tim penelitian. Hak dan proses yang berlaku harus dijelaskan dalam dokumen serta prosedur penelitian yang sebenarnya. Daftar ini hanya membantu menyiapkan percakapan dan bukan daftar lengkap untuk semua penelitian.',
    status: 'PENDING_REVIEW',
    sources: [references.learnStudies, references.commonQuestions],
  },
  {
    slug: 'informed-consent',
    title: 'Apa yang dimaksud dengan informed consent?',
    categorySlug: 'informed-consent',
    content: 'Informed consent adalah proses komunikasi sebelum seseorang memutuskan untuk berpartisipasi dalam penelitian. Tim penelitian memberikan informasi, menjawab pertanyaan, dan meminta persetujuan melalui proses resmi yang berlaku.\n\nMembaca artikel atau mengerjakan kuis SAPA-UJI bukan informed consent, tidak mendaftarkan seseorang ke penelitian, dan tidak menggantikan penjelasan tim penelitian. Seseorang yang sedang mempertimbangkan penelitian perlu meminta dokumen dan penjelasan langsung dari tim yang bertanggung jawab.',
    status: 'REJECTED',
    sources: [references.learnStudies],
    decision: 'REJECTED',
    reviewComments: 'Status penolakan ini hanya contoh alur review pada dataset demo. Minta reviewer mengonfirmasi kesesuaian dokumen dan prosedur lokal sebelum materi digunakan di luar demo.',
  },
];

const trials: Array<{
  slug: string;
  title: string;
  summary: string;
  status: DemoStatus;
  decision?: DemoReviewDecision;
  reviewComments?: string;
}> = [
  {
    slug: 'simulasi-penelitian-kandidat-obat',
    title: 'SIMULASI — Contoh alur penelitian kandidat obat',
    summary: 'Contoh fiktif untuk mencoba halaman informasi penelitian. Ini bukan uji klinis nyata, tidak membuka pendaftaran, dan tidak melibatkan peserta.',
    status: 'PUBLISHED',
    decision: 'APPROVED',
    reviewComments: 'Konten demonstrasi diperiksa untuk memastikan label simulasi terlihat jelas dan tidak ada ajakan mendaftar.',
  },
  {
    slug: 'simulasi-pengamatan-vaksin',
    title: 'SIMULASI — Contoh penelitian pemantauan vaksin',
    summary: 'Skenario latihan rekaan untuk meninjau informasi prosedur dan hak peserta. Bukan penelitian vaksin yang sedang berlangsung.',
    status: 'PENDING_REVIEW',
  },
  {
    slug: 'simulasi-pertanyaan-penelitian',
    title: 'SIMULASI — Draf contoh informasi penelitian',
    summary: 'Draf fiktif untuk menguji penyimpanan, penyuntingan, dan pengajuan informasi penelitian oleh akun peneliti.',
    status: 'DRAFT',
  },
  {
    slug: 'simulasi-pemantauan-kesehatan',
    title: 'SIMULASI — Contoh pemantauan kesehatan',
    summary: 'Skenario rekaan yang telah melewati contoh review dan menunggu tindakan publikasi administrator.',
    status: 'APPROVED',
    decision: 'APPROVED',
    reviewComments: 'Contoh simulasi memenuhi syarat untuk demonstrasi publikasi; status ini bukan persetujuan etik atau klinis.',
  },
  {
    slug: 'simulasi-kelompok-perbandingan',
    title: 'SIMULASI — Contoh penelitian kelompok perbandingan',
    summary: 'Skenario fiktif dengan status ditolak untuk mencoba tampilan catatan reviewer di dashboard peneliti.',
    status: 'REJECTED',
    decision: 'REJECTED',
    reviewComments: 'Contoh keputusan penolakan. Konten ini tidak menggambarkan protokol atau penelitian tertentu.',
  },
];

type QuizQuestionSeed = {
  questionText: string;
  explanation: string;
  category: string;
  options: Array<{ optionText: string; isCorrect: boolean; explanation: string }>;
};

const mainQuizQuestions: QuizQuestionSeed[] = [
  {
    questionText: 'Apa tujuan umum uji klinis?',
    explanation: 'Penelitian klinis dirancang untuk menjawab pertanyaan tertentu tentang intervensi kesehatan.',
    category: 'Tujuan penelitian',
    options: [
      { optionText: 'Mempelajari pertanyaan tentang intervensi kesehatan', isCorrect: true, explanation: 'Jawaban tepat.' },
      { optionText: 'Menjamin semua peserta akan sembuh', isCorrect: false, explanation: 'Hasil dan manfaat tidak dapat dijamin.' },
      { optionText: 'Menggantikan semua layanan kesehatan rutin', isCorrect: false, explanation: 'Penelitian berbeda dari perawatan rutin.' },
      { optionText: 'Menentukan kelayakan melalui kuis SAPA-UJI', isCorrect: false, explanation: 'Kuis ini bukan alat seleksi peserta.' },
    ],
  },
  {
    questionText: 'Apakah ikut uji klinis menjamin manfaat langsung bagi peserta?',
    explanation: 'Potensi manfaat tidak sama dengan manfaat yang pasti diterima oleh setiap peserta.',
    category: 'Manfaat',
    options: [
      { optionText: 'Ya, semua peserta pasti mendapat manfaat', isCorrect: false, explanation: 'Manfaat langsung tidak dapat dijanjikan.' },
      { optionText: 'Tidak, manfaat bagi peserta tidak dapat dijamin', isCorrect: true, explanation: 'Jawaban tepat.' },
      { optionText: 'Ya, jika skor kuisnya tinggi', isCorrect: false, explanation: 'Skor kuis tidak menentukan hasil klinis.' },
      { optionText: 'Tidak ada penelitian yang membahas manfaat', isCorrect: false, explanation: 'Penelitian dapat mempelajari manfaat, tetapi hasil belum pasti.' },
    ],
  },
  {
    questionText: 'Siapa yang dapat menjelaskan informed consent resmi untuk sebuah penelitian?',
    explanation: 'Tim penelitian menjelaskan dokumen dan proses resmi serta menjawab pertanyaan calon peserta.',
    category: 'Informed consent',
    options: [
      { optionText: 'Tim penelitian yang bertanggung jawab', isCorrect: true, explanation: 'Jawaban tepat.' },
      { optionText: 'Kuis daring SAPA-UJI', isCorrect: false, explanation: 'Kuis ini hanya latihan edukatif.' },
      { optionText: 'Peserta lain yang tidak terkait', isCorrect: false, explanation: 'Minta penjelasan dari tim penelitian.' },
      { optionText: 'Tidak perlu ada penjelasan', isCorrect: false, explanation: 'Proses informed consent melibatkan penjelasan dan komunikasi.' },
    ],
  },
  {
    questionText: 'Apa yang sebaiknya dilakukan bila ada bagian informasi penelitian yang belum jelas?',
    explanation: 'Calon peserta dapat meminta penjelasan tambahan dan waktu untuk mempertimbangkan.',
    category: 'Hak peserta',
    options: [
      { optionText: 'Meminta penjelasan kepada tim penelitian', isCorrect: true, explanation: 'Jawaban tepat.' },
      { optionText: 'Menebak isi prosedur sendiri', isCorrect: false, explanation: 'Mintalah keterangan sebelum memutuskan.' },
      { optionText: 'Menganggap semua risiko sama', isCorrect: false, explanation: 'Risiko berbeda menurut penelitian.' },
      { optionText: 'Mengirim data kesehatan ke kuis', isCorrect: false, explanation: 'SAPA-UJI tidak meminta rekam medis.' },
    ],
  },
  {
    questionText: 'Apakah semua kandidat obat yang diteliti akhirnya tersedia?',
    explanation: 'Tidak semua kandidat intervensi berhasil melalui seluruh proses penelitian dan pengembangan.',
    category: 'Pengembangan obat',
    options: [
      { optionText: 'Tidak, tidak semua kandidat menjadi produk tersedia', isCorrect: true, explanation: 'Jawaban tepat.' },
      { optionText: 'Ya, semua kandidat pasti berhasil', isCorrect: false, explanation: 'Hasil pengembangan tidak dapat dijamin.' },
      { optionText: 'Ya, setelah satu kali kuis', isCorrect: false, explanation: 'Kuis tidak berhubungan dengan pengembangan produk.' },
      { optionText: 'Tidak ada kandidat yang pernah diteliti', isCorrect: false, explanation: 'Penelitian dapat mempelajari kandidat intervensi.' },
    ],
  },
  {
    questionText: 'Apa yang perlu dipahami tentang risiko penelitian?',
    explanation: 'Risiko dan ketidakpastian perlu dibahas; tiap penelitian memiliki informasi yang berbeda.',
    category: 'Risiko',
    options: [
      { optionText: 'Risiko dapat diabaikan jika ada potensi manfaat', isCorrect: false, explanation: 'Risiko tetap perlu dipahami.' },
      { optionText: 'Risiko dan ketidakpastian perlu ditanyakan kepada tim penelitian', isCorrect: true, explanation: 'Jawaban tepat.' },
      { optionText: 'Semua penelitian memiliki risiko yang sama', isCorrect: false, explanation: 'Informasi risiko bergantung pada penelitian.' },
      { optionText: 'SAPA-UJI dapat menghitung risiko pribadi', isCorrect: false, explanation: 'Platform ini tidak melakukan penilaian medis.' },
    ],
  },
  {
    questionText: 'Apa arti label SIMULASI pada informasi penelitian di platform?',
    explanation: 'Label tersebut menunjukkan skenario fiktif yang disediakan untuk demonstrasi fitur.',
    category: 'Membaca informasi',
    options: [
      { optionText: 'Skenario contoh, bukan penelitian nyata atau pendaftaran peserta', isCorrect: true, explanation: 'Jawaban tepat.' },
      { optionText: 'Penelitian nyata yang sedang menerima peserta', isCorrect: false, explanation: 'Simulasi tidak membuka pendaftaran.' },
      { optionText: 'Rekomendasi pengobatan personal', isCorrect: false, explanation: 'Platform ini tidak memberi rekomendasi klinis.' },
      { optionText: 'Bukti bahwa penelitian telah disetujui etik', isCorrect: false, explanation: 'Label simulasi bukan persetujuan etik.' },
    ],
  },
  {
    questionText: 'Apakah hasil kuis menentukan kelayakan seseorang mengikuti penelitian?',
    explanation: 'Kuis hanya sarana belajar dan tidak menilai kondisi kesehatan atau kelayakan.',
    category: 'Batas platform',
    options: [
      { optionText: 'Ya, skor tertentu otomatis membuat seseorang memenuhi syarat', isCorrect: false, explanation: 'Kuis tidak menentukan kelayakan.' },
      { optionText: 'Tidak, kuis bukan penilaian kelayakan medis', isCorrect: true, explanation: 'Jawaban tepat.' },
      { optionText: 'Ya, jika dilakukan sebelum informed consent', isCorrect: false, explanation: 'Kuis bukan bagian dari persetujuan resmi.' },
      { optionText: 'Hanya untuk penelitian simulasi', isCorrect: false, explanation: 'Kuis tidak digunakan untuk seleksi peserta.' },
    ],
  },
  {
    questionText: 'Informasi apa yang dapat ditanyakan tentang kegiatan penelitian?',
    explanation: 'Tujuan, prosedur, waktu, risiko, kontak, dan informasi lain dapat dibahas dengan tim penelitian.',
    category: 'Prosedur',
    options: [
      { optionText: 'Tujuan, prosedur, waktu, risiko, dan kontak penelitian', isCorrect: true, explanation: 'Jawaban tepat.' },
      { optionText: 'Hanya nama obat tanpa penjelasan lain', isCorrect: false, explanation: 'Tanyakan informasi yang cukup untuk memahami keterlibatan.' },
      { optionText: 'Cara mengubah hasil penelitian', isCorrect: false, explanation: 'Hasil tidak dapat diubah oleh peserta.' },
      { optionText: 'Kata sandi peserta lain', isCorrect: false, explanation: 'Jangan meminta atau membagikan kredensial orang lain.' },
    ],
  },
  {
    questionText: 'Apakah artikel dan kuis SAPA-UJI menggantikan informed consent resmi?',
    explanation: 'Materi SAPA-UJI adalah edukasi dan tidak menggantikan dokumen atau proses resmi penelitian.',
    category: 'Informed consent',
    options: [
      { optionText: 'Ya, menyelesaikan kuis sama dengan menyetujui penelitian', isCorrect: false, explanation: 'Kuis bukan persetujuan penelitian.' },
      { optionText: 'Tidak, proses resmi tetap dijelaskan oleh tim penelitian', isCorrect: true, explanation: 'Jawaban tepat.' },
      { optionText: 'Ya, jika skor mencapai nilai lulus', isCorrect: false, explanation: 'Nilai kuis tidak menjadi persetujuan.' },
      { optionText: 'Tidak perlu ada proses persetujuan', isCorrect: false, explanation: 'Penelitian memiliki proses resmi yang perlu dijelaskan.' },
    ],
  },
];

const draftQuizQuestions: QuizQuestionSeed[] = [
  {
    questionText: 'Apa yang dapat dilakukan sebelum memutuskan ikut penelitian?',
    explanation: 'Mintalah informasi, tanyakan hal yang belum jelas, dan luangkan waktu untuk mempertimbangkan.',
    category: 'Persiapan',
    options: [
      { optionText: 'Meminta penjelasan dan menyiapkan pertanyaan', isCorrect: true, explanation: 'Jawaban tepat.' },
      { optionText: 'Menyetujui tanpa membaca informasi', isCorrect: false, explanation: 'Informasi perlu dipahami.' },
      { optionText: 'Mengandalkan hasil kuis sebagai keputusan medis', isCorrect: false, explanation: 'Kuis tidak memberi keputusan medis.' },
    ],
  },
  {
    questionText: 'Apakah skenario SIMULASI membuka pendaftaran peserta?',
    explanation: 'Skenario demo bersifat fiktif dan tidak menerima peserta.',
    category: 'Membaca informasi',
    options: [
      { optionText: 'Ya, segera mendaftar', isCorrect: false, explanation: 'Skenario simulasi bukan penelitian nyata.' },
      { optionText: 'Tidak, hanya contoh untuk mencoba fitur', isCorrect: true, explanation: 'Jawaban tepat.' },
    ],
  },
  {
    questionText: 'Kepada siapa pertanyaan tentang penelitian tertentu ditujukan?',
    explanation: 'Informasi penelitian tertentu dijelaskan oleh tim penelitian yang bertanggung jawab.',
    category: 'Hak peserta',
    options: [
      { optionText: 'Tim penelitian yang tercantum dalam dokumen resmi', isCorrect: true, explanation: 'Jawaban tepat.' },
      { optionText: 'Akun demo lain di platform', isCorrect: false, explanation: 'Akun demo bukan sumber informasi resmi.' },
      { optionText: 'Sistem kuis otomatis', isCorrect: false, explanation: 'Kuis hanya memberi umpan balik edukatif.' },
    ],
  },
];

async function ensureQuiz(definition: {
  key: string;
  title: string;
  description: string;
  trialId: string;
  isPublished: boolean;
  questions: QuizQuestionSeed[];
}) {
  const existing = await db.quiz.findFirst({ where: { title: definition.title }, select: { id: true } });
  const quizData = {
    title: definition.title,
    description: definition.description,
    passingScore: 70,
    trialId: definition.trialId,
    articleId: null,
    isPublished: definition.isPublished,
  };
  const quiz = existing
    ? await db.quiz.update({ where: { id: existing.id }, data: quizData })
    : await db.quiz.create({ data: { id: seededId(`quiz:${definition.key}`), ...quizData } });

  const seededQuestions: Array<{ id: string; options: Array<{ id: string; isCorrect: boolean }> }> = [];
  for (const [questionIndex, question] of definition.questions.entries()) {
    const orderIndex = questionIndex + 1;
    const existingQuestion = await db.quizQuestion.findFirst({ where: { quizId: quiz.id, orderIndex }, select: { id: true } });
    const questionData = {
      quizId: quiz.id,
      questionText: question.questionText,
      explanation: question.explanation,
      category: question.category,
      orderIndex,
    };
    const savedQuestion = existingQuestion
      ? await db.quizQuestion.update({ where: { id: existingQuestion.id }, data: questionData })
      : await db.quizQuestion.create({ data: { id: seededId(`question:${definition.key}:${orderIndex}`), ...questionData } });

    const savedOptions: Array<{ id: string; isCorrect: boolean }> = [];
    for (const [optionIndex, option] of question.options.entries()) {
      const optionOrder = optionIndex + 1;
      const existingOption = await db.quizOption.findFirst({ where: { questionId: savedQuestion.id, orderIndex: optionOrder }, select: { id: true } });
      const optionData = {
        questionId: savedQuestion.id,
        optionText: option.optionText,
        isCorrect: option.isCorrect,
        explanation: option.explanation,
        orderIndex: optionOrder,
      };
      const savedOption = existingOption
        ? await db.quizOption.update({ where: { id: existingOption.id }, data: optionData })
        : await db.quizOption.create({ data: { id: seededId(`option:${definition.key}:${orderIndex}:${optionOrder}`), ...optionData } });
      savedOptions.push({ id: savedOption.id, isCorrect: option.isCorrect });
    }
    seededQuestions.push({ id: savedQuestion.id, options: savedOptions });
  }

  return { quiz, questions: seededQuestions };
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = new Map<string, { id: string; email: string; name: string; role: DemoRole }>();

  for (const definition of userDefinitions) {
    const user = await db.user.upsert({
      where: { email: definition.email },
      update: {
        name: definition.name,
        role: definition.role,
        institution: definition.institution,
        passwordHash,
        isActive: true,
      },
      create: {
        id: seededId(`user:${definition.email}`),
        name: definition.name,
        email: definition.email,
        role: definition.role,
        institution: definition.institution,
        passwordHash,
        isActive: true,
        emailVerifiedAt: dateDaysAgo(30),
      },
    });
    users.set(definition.email, user);
    await db.userProfile.upsert({
      where: { userId: user.id },
      update: { preferredLanguage: 'id', avatarUrl: null },
      create: { id: seededId(`profile:${definition.email}`), userId: user.id, preferredLanguage: 'id' },
    });
    await db.consentRecord.upsert({
      where: { id: seededId(`consent:${definition.email}`) },
      update: { userId: user.id, consentType: 'DEMO_SEED_ACCOUNT', version: DEMO_NOTICE_VERSION, acceptedAt: dateDaysAgo(30) },
      create: { id: seededId(`consent:${definition.email}`), userId: user.id, consentType: 'DEMO_SEED_ACCOUNT', version: DEMO_NOTICE_VERSION, acceptedAt: dateDaysAgo(30) },
    });
  }

  const admin = users.get('demo@sapa-uji.local')!;
  const reviewer = users.get('reviewer@sapa-uji.local')!;
  const researcher = users.get('researcher@sapa-uji.local')!;
  const learner = users.get('learner@sapa-uji.local')!;

  const categoryIds = new Map<string, string>();
  for (const category of categories) {
    const saved = await db.educationCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: { id: seededId(`category:${category.slug}`), ...category },
    });
    categoryIds.set(category.slug, saved.id);
  }

  const articleIds = new Map<string, string>();
  for (const [index, article] of articles.entries()) {
    const reviewedAt = article.decision ? dateDaysAgo(8 + index) : null;
    const saved = await db.educationArticle.upsert({
      where: { slug: article.slug },
      update: {
        categoryId: categoryIds.get(article.categorySlug)!,
        authorId: researcher.id,
        title: article.title,
        excerpt: article.content.replaceAll('\n', ' ').slice(0, 180),
        content: article.content,
        sourceReferences: article.sources,
        readingTimeMinutes: Math.max(2, Math.ceil(article.content.split(/\s+/).length / 180)),
        status: article.status,
        reviewedBy: article.decision ? reviewer.id : null,
        reviewedAt,
        publishedAt: article.status === 'PUBLISHED' ? dateDaysAgo(6 + index) : null,
      },
      create: {
        id: seededId(`article:${article.slug}`),
        categoryId: categoryIds.get(article.categorySlug)!,
        authorId: researcher.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.content.replaceAll('\n', ' ').slice(0, 180),
        content: article.content,
        sourceReferences: article.sources,
        readingTimeMinutes: Math.max(2, Math.ceil(article.content.split(/\s+/).length / 180)),
        status: article.status,
        reviewedBy: article.decision ? reviewer.id : null,
        reviewedAt,
        publishedAt: article.status === 'PUBLISHED' ? dateDaysAgo(6 + index) : null,
      },
    });
    articleIds.set(article.slug, saved.id);
  }

  const trialIds = new Map<string, string>();
  for (const [index, trial] of trials.entries()) {
    const reviewedAt = trial.decision ? dateDaysAgo(7 + index) : null;
    const trialData = {
      researcherId: researcher.id,
      title: trial.title,
      summary: trial.summary,
      objective: 'Contoh tujuan rekaan untuk memperagakan bagian tujuan penelitian. Skenario ini tidak menghasilkan bukti klinis.',
      background: 'Seluruh latar belakang dan nama intervensi pada rekaman ini adalah fiktif untuk pengujian antarmuka.',
      researchPhase: 'Simulasi edukasi',
      therapeuticArea: 'Simulasi edukasi',
      interventionDescription: 'Intervensi hanya konsep fiktif; tidak ada produk, layanan, atau tindakan kesehatan yang diberikan.',
      procedureDescription: 'Tidak ada prosedur atau kunjungan nyata. Semua uraian hanya contoh untuk mencoba tampilan informasi.',
      estimatedDuration: 'Tidak berlaku — skenario fiktif tanpa peserta.',
      potentialBenefits: 'Tidak ada manfaat klinis. Skenario ini bukan penelitian nyata.',
      potentialRisks: 'Tidak ada paparan atau peserta nyata. Jangan gunakan teks ini sebagai panduan klinis.',
      participantRights: 'Tidak ada pendaftaran peserta. Untuk penelitian nyata, tanyakan hak dan pilihan kepada tim penelitian yang bertanggung jawab.',
      privacyInformation: 'Tidak ada data peserta yang dikumpulkan oleh skenario ini.',
      contactInformation: { email: 'simulasi@sapa-uji.local', notice: 'Kontak fiktif untuk uji lokal; bukan kontak penelitian.' },
      sourceDocumentUrl: null,
      institution: 'Institusi Simulasi SAPA-UJI',
      isSimulation: true,
      status: trial.status,
      reviewerId: trial.decision ? reviewer.id : null,
      reviewNotes: trial.reviewComments ?? null,
      reviewedAt,
      publishedAt: trial.status === 'PUBLISHED' ? dateDaysAgo(5) : null,
    };
    const saved = await db.clinicalTrial.upsert({
      where: { slug: trial.slug },
      update: trialData,
      create: { id: seededId(`trial:${trial.slug}`), slug: trial.slug, ...trialData },
    });
    trialIds.set(trial.slug, saved.id);
  }

  const reviewIds: string[] = [];
  for (const [index, article] of articles.entries()) {
    if (!article.decision) continue;
    const id = seededId(`review:ARTICLE:${article.slug}`);
    reviewIds.push(id);
    await db.contentReview.upsert({
      where: { id },
      update: {
        contentType: 'ARTICLE',
        contentId: articleIds.get(article.slug)!,
        reviewerId: reviewer.id,
        decision: article.decision,
        comments: article.reviewComments!,
        reviewedAt: dateDaysAgo(8 + index),
      },
      create: {
        id,
        contentType: 'ARTICLE',
        contentId: articleIds.get(article.slug)!,
        reviewerId: reviewer.id,
        decision: article.decision,
        comments: article.reviewComments!,
        reviewedAt: dateDaysAgo(8 + index),
      },
    });
  }
  for (const [index, trial] of trials.entries()) {
    if (!trial.decision) continue;
    const id = seededId(`review:CLINICAL_TRIAL:${trial.slug}`);
    reviewIds.push(id);
    await db.contentReview.upsert({
      where: { id },
      update: {
        contentType: 'CLINICAL_TRIAL',
        contentId: trialIds.get(trial.slug)!,
        reviewerId: reviewer.id,
        decision: trial.decision,
        comments: trial.reviewComments!,
        reviewedAt: dateDaysAgo(7 + index),
      },
      create: {
        id,
        contentType: 'CLINICAL_TRIAL',
        contentId: trialIds.get(trial.slug)!,
        reviewerId: reviewer.id,
        decision: trial.decision,
        comments: trial.reviewComments!,
        reviewedAt: dateDaysAgo(7 + index),
      },
    });
  }

  const publicTrialId = trialIds.get('simulasi-penelitian-kandidat-obat')!;
  const pendingTrialId = trialIds.get('simulasi-pengamatan-vaksin')!;
  const mainQuiz = await ensureQuiz({
    key: 'main',
    title: 'Dasar pemahaman penelitian klinis',
    description: 'Latihan demo dengan umpan balik tentang tujuan penelitian, risiko, potensi manfaat, informed consent, dan batas penggunaan platform.',
    trialId: publicTrialId,
    isPublished: true,
    questions: mainQuizQuestions,
  });
  const draftQuiz = await ensureQuiz({
    key: 'draft',
    title: 'Latihan hak dan pertanyaan penelitian (draf demo)',
    description: 'Kuis draf untuk mencoba pengelolaan soal dan status publikasi pada dashboard administrator.',
    trialId: pendingTrialId,
    isPublished: false,
    questions: draftQuizQuestions,
  });

  const attemptIds: string[] = [];
  const answerIds: string[] = [];
  async function addAttempt(user: { id: string; email: string }, phase: 'BEFORE_LEARNING' | 'AFTER_LEARNING' | 'PRACTICE', correctCount: number, daysAgo: number) {
    const attemptId = seededId(`attempt:${user.email}:${mainQuiz.quiz.id}:${phase}`);
    attemptIds.push(attemptId);
    const completedAt = dateDaysAgo(daysAgo);
    const attemptData = {
      userId: user.id,
      quizId: mainQuiz.quiz.id,
      score: Number((correctCount / mainQuiz.questions.length * 100).toFixed(2)),
      totalQuestions: mainQuiz.questions.length,
      correctAnswers: correctCount,
      phase,
      completedAt,
    };
    await db.quizAttempt.upsert({
      where: { id: attemptId },
      update: attemptData,
      create: { id: attemptId, ...attemptData },
    });

    const answerData = mainQuiz.questions.map((question, index) => {
      const correctOption = question.options.find((option) => option.isCorrect)!;
      const wrongOption = question.options.find((option) => !option.isCorrect)!;
      const isCorrect = index < correctCount;
      const id = seededId(`answer:${attemptId}:${question.id}`);
      answerIds.push(id);
      return {
        id,
        attemptId,
        questionId: question.id,
        selectedOptionId: isCorrect ? correctOption.id : wrongOption.id,
        isCorrect,
        createdAt: completedAt,
      };
    });
    await db.quizAnswer.createMany({ data: answerData, skipDuplicates: true });
  }

  await addAttempt(learner, 'BEFORE_LEARNING', 4, 10);
  await addAttempt(learner, 'AFTER_LEARNING', 8, 7);
  await addAttempt(learner, 'PRACTICE', 7, 3);
  const pairedScores = [[3, 7], [4, 8], [5, 8], [6, 9], [6, 10]] as const;
  for (const [index, scores] of pairedScores.entries()) {
    const participant = users.get(`demo.peserta${String(index + 1).padStart(2, '0')}@sapa-uji.local`)!;
    await addAttempt(participant, 'BEFORE_LEARNING', scores[0], 20 - index);
    await addAttempt(participant, 'AFTER_LEARNING', scores[1], 16 - index);
  }

  const learnerQuestions = [
    { key: 'risk', category: 'Risiko dan manfaat', questionText: 'Risiko apa yang perlu saya tanyakan sebelum mempertimbangkan penelitian ini?', isDiscussed: false, trialId: publicTrialId },
    { key: 'time', category: 'Prosedur dan waktu', questionText: 'Berapa lama kegiatan dan kunjungan yang direncanakan dalam penelitian?', isDiscussed: false, trialId: publicTrialId },
    { key: 'withdrawal', category: 'Hak peserta', questionText: 'Dengan siapa saya perlu membahas pilihan jika ingin berhenti ikut penelitian?', isDiscussed: true, trialId: publicTrialId },
  ];
  const questionIds: string[] = [];
  for (const [index, question] of learnerQuestions.entries()) {
    const id = seededId(`user-question:${learner.email}:${question.key}`);
    questionIds.push(id);
    await db.userQuestion.upsert({
      where: { id },
      update: { userId: learner.id, trialId: question.trialId, category: question.category, questionText: question.questionText, isDiscussed: question.isDiscussed },
      create: { id, userId: learner.id, trialId: question.trialId, category: question.category, questionText: question.questionText, isDiscussed: question.isDiscussed, createdAt: dateDaysAgo(index + 2) },
    });
  }
  const participantQuestionId = seededId('user-question:participant-01:privacy');
  questionIds.push(participantQuestionId);
  const firstParticipant = users.get('demo.peserta01@sapa-uji.local')!;
  await db.userQuestion.upsert({
    where: { id: participantQuestionId },
    update: { userId: firstParticipant.id, trialId: publicTrialId, category: 'Privasi', questionText: 'Informasi apa yang dicatat dalam skenario penelitian ini?', isDiscussed: false },
    create: { id: participantQuestionId, userId: firstParticipant.id, trialId: publicTrialId, category: 'Privasi', questionText: 'Informasi apa yang dicatat dalam skenario penelitian ini?', isDiscussed: false, createdAt: dateDaysAgo(4) },
  });

  const bookmarks = [
    { key: 'learner-article-basics', userId: learner.id, articleId: articleIds.get('dasar-dasar-uji-klinis')!, trialId: null },
    { key: 'learner-article-phases', userId: learner.id, articleId: articleIds.get('tahapan-penelitian-klinis')!, trialId: null },
    { key: 'learner-public-trial', userId: learner.id, articleId: null, trialId: publicTrialId },
    { key: 'participant-article-basics', userId: firstParticipant.id, articleId: articleIds.get('dasar-dasar-uji-klinis')!, trialId: null },
    { key: 'participant-public-trial', userId: firstParticipant.id, articleId: null, trialId: publicTrialId },
  ];
  const bookmarkIds: string[] = [];
  for (const bookmark of bookmarks) {
    const id = seededId(`bookmark:${bookmark.key}`);
    bookmarkIds.push(id);
    await db.bookmark.upsert({
      where: { id },
      update: { userId: bookmark.userId, articleId: bookmark.articleId, trialId: bookmark.trialId },
      create: { id, userId: bookmark.userId, articleId: bookmark.articleId, trialId: bookmark.trialId, createdAt: dateDaysAgo(5) },
    });
  }

  const auditEntries = [
    { key: 'article-published', actorId: admin.id, action: 'ARTICLE_PUBLISHED', entityType: 'ARTICLE', entityId: articleIds.get('dasar-dasar-uji-klinis')!, metadata: { seed: true, simulated: true } },
    { key: 'trial-published', actorId: admin.id, action: 'TRIAL_PUBLISHED', entityType: 'CLINICAL_TRIAL', entityId: publicTrialId, metadata: { seed: true, simulationLabel: true } },
    { key: 'review-article', actorId: reviewer.id, action: 'ARTICLE_APPROVED', entityType: 'ARTICLE', entityId: articleIds.get('tahapan-penelitian-klinis')!, metadata: { seed: true } },
    { key: 'review-trial', actorId: reviewer.id, action: 'TRIAL_APPROVED', entityType: 'CLINICAL_TRIAL', entityId: trialIds.get('simulasi-pemantauan-kesehatan')!, metadata: { seed: true, simulated: true } },
    { key: 'role-assigned', actorId: admin.id, action: 'USER_ROLE_UPDATED', entityType: 'USER', entityId: researcher.id, metadata: { seed: true, role: 'RESEARCHER' } },
    { key: 'quiz-published', actorId: admin.id, action: 'QUIZ_PUBLISHED', entityType: 'QUIZ', entityId: mainQuiz.quiz.id, metadata: { seed: true } },
    { key: 'quiz-created', actorId: admin.id, action: 'QUIZ_CREATED', entityType: 'QUIZ', entityId: draftQuiz.quiz.id, metadata: { seed: true } },
    { key: 'question-saved', actorId: learner.id, action: 'DEMO_QUESTION_SAVED', entityType: 'USER_QUESTION', entityId: questionIds[0], metadata: { seed: true, private: true } },
  ];
  const auditIds: string[] = [];
  for (const [index, entry] of auditEntries.entries()) {
    const id = seededId(`audit:${entry.key}`);
    auditIds.push(id);
    await db.auditLog.upsert({
      where: { id },
      update: { actorId: entry.actorId, action: entry.action, entityType: entry.entityType, entityId: entry.entityId, metadata: entry.metadata, ipAddress: '127.0.0.1', createdAt: dateDaysAgo(index + 1) },
      create: { id, actorId: entry.actorId, action: entry.action, entityType: entry.entityType, entityId: entry.entityId, metadata: entry.metadata, ipAddress: '127.0.0.1', createdAt: dateDaysAgo(index + 1) },
    });
  }

  const quizQuestionIds = [...mainQuiz.questions, ...draftQuiz.questions].map((question) => question.id);
  const quizOptionIds = [...mainQuiz.questions, ...draftQuiz.questions].flatMap((question) => question.options.map((option) => option.id));
  const userIds = [...users.values()].map((user) => user.id);
  const seededCounts = await Promise.all([
    db.user.count({ where: { id: { in: userIds } } }),
    db.userProfile.count({ where: { userId: { in: userIds } } }),
    db.educationCategory.count({ where: { id: { in: [...categoryIds.values()] } } }),
    db.educationArticle.count({ where: { id: { in: [...articleIds.values()] } } }),
    db.clinicalTrial.count({ where: { id: { in: [...trialIds.values()] } } }),
    db.quiz.count({ where: { id: { in: [mainQuiz.quiz.id, draftQuiz.quiz.id] } } }),
    db.quizQuestion.count({ where: { id: { in: quizQuestionIds } } }),
    db.quizOption.count({ where: { id: { in: quizOptionIds } } }),
    db.quizAttempt.count({ where: { id: { in: attemptIds } } }),
    db.quizAnswer.count({ where: { id: { in: answerIds } } }),
    db.userQuestion.count({ where: { id: { in: questionIds } } }),
    db.bookmark.count({ where: { id: { in: bookmarkIds } } }),
    db.contentReview.count({ where: { id: { in: reviewIds } } }),
    db.auditLog.count({ where: { id: { in: auditIds } } }),
    db.consentRecord.count({ where: { userId: { in: userIds }, consentType: 'DEMO_SEED_ACCOUNT', version: DEMO_NOTICE_VERSION } }),
  ]);
  const tableNames = ['User', 'UserProfile', 'EducationCategory', 'EducationArticle', 'ClinicalTrial', 'Quiz', 'QuizQuestion', 'QuizOption', 'QuizAttempt', 'QuizAnswer', 'UserQuestion', 'Bookmark', 'ContentReview', 'AuditLog', 'ConsentRecord'];
  console.info('SAPA-UJI demo seed selesai (jumlah record fixture per tabel):');
  console.table(Object.fromEntries(tableNames.map((name, index) => [name, seededCounts[index]])));
  console.info(`Akun demo: ${userDefinitions.map((user) => user.email).join(', ')}`);
  console.info(`Login demo — password semua akun: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('SAPA-UJI demo seed gagal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
