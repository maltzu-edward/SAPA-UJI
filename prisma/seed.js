/* eslint @typescript-eslint/no-require-imports: off */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const DEMO_INSTITUTION_SLUG = "sapa-uji-demo";
const SEED_REVIEW_TYPE = "DEMO_SEED_REVIEW";

const educationalModules = [
  {
    slug: "research-purpose",
    title: "Tujuan penelitian",
    summary: "Mengapa sebuah penelitian dilakukan?",
    content: "Penelitian dirancang untuk menjawab pertanyaan yang sudah ditentukan. Tujuan dan alasan pada studi tertentu perlu mengikuti protokol yang disetujui.",
  },
  {
    slug: "research-procedure",
    title: "Prosedur penelitian",
    summary: "Apa yang dapat terjadi selama penelitian?",
    content: "Prosedur, jumlah kunjungan, dan durasi berbeda di setiap penelitian. Jangan menyimpulkan detail suatu studi dari studi lain; periksa dokumen yang disetujui dan tanyakan kepada tim.",
  },
  {
    slug: "potential-benefits",
    title: "Manfaat potensial",
    summary: "Manfaat yang mungkin terjadi bukan jaminan.",
    content: "Manfaat potensial belum tentu dialami oleh setiap peserta. Mintalah penjelasan tentang manfaat yang diharapkan dan hal yang masih belum pasti.",
  },
  {
    slug: "potential-risks",
    title: "Risiko potensial",
    summary: "Pelajari risiko dari informasi studi yang disetujui.",
    content: "Risiko, efek samping, dan ketidaknyamanan spesifik harus berasal dari dokumen studi yang ditinjau. Tanyakan apa yang dapat dilakukan jika Anda mengalami masalah.",
  },
  {
    slug: "participant-rights",
    title: "Hak peserta",
    summary: "Anda dapat bertanya dan mengambil keputusan secara sukarela.",
    content: "Anda dapat membicarakan pertanyaan atau keinginan untuk berhenti dengan tim penelitian. Proses yang berlaku untuk studi tertentu perlu dijelaskan oleh tim dan tercantum di dokumen resmi.",
  },
];

const categoryDefinitions = [
  { slug: "research-purpose", name: "Tujuan penelitian", description: "Pemahaman tentang pertanyaan dan tujuan penelitian." },
  { slug: "research-procedure", name: "Prosedur penelitian", description: "Pemahaman tentang kegiatan dan proses penelitian." },
  { slug: "potential-benefits", name: "Manfaat potensial", description: "Pemahaman bahwa manfaat potensial tidak dijamin." },
  { slug: "potential-risks", name: "Risiko potensial", description: "Pemahaman tentang sumber informasi risiko penelitian." },
  { slug: "participant-rights", name: "Hak peserta", description: "Pemahaman tentang kesukarelaan dan hak untuk bertanya atau berhenti." },
];

const questionDefinitions = [
  {
    orderIndex: 1,
    categorySlug: "research-purpose",
    questionType: "MULTIPLE_CHOICE",
    questionText: "Apa tujuan utama penelitian klinis?",
    explanation: "Penelitian dirancang untuk menjawab pertanyaan tertentu. Hasil dan manfaat bagi setiap orang tidak dapat dijamin.",
    options: [
      { text: "Menjawab pertanyaan penelitian secara terencana", correct: true },
      { text: "Menjamin semua peserta memperoleh manfaat", correct: false },
      { text: "Menggantikan perawatan rutin", correct: false },
    ],
  },
  {
    orderIndex: 2,
    categorySlug: "research-procedure",
    questionType: "MULTIPLE_CHOICE",
    questionText: "Bagaimana mengetahui kegiatan dan jadwal penelitian tertentu?",
    explanation: "Prosedur, jumlah kunjungan, dan durasi berbeda di setiap penelitian. Rujuk dokumen yang disetujui dan tanyakan kepada tim.",
    options: [
      { text: "Menyalin jadwal penelitian lain", correct: false },
      { text: "Memeriksa informasi penelitian yang disetujui dan bertanya kepada tim", correct: true },
      { text: "Memperkirakan sendiri", correct: false },
    ],
  },
  {
    orderIndex: 3,
    categorySlug: "potential-benefits",
    questionType: "MULTIPLE_CHOICE",
    questionText: "Apakah manfaat potensial pasti dialami peserta?",
    explanation: "Manfaat potensial bukan jaminan. Tanyakan manfaat yang diharapkan dan ketidakpastiannya untuk penelitian tertentu.",
    options: [
      { text: "Ya, selalu", correct: false },
      { text: "Belum tentu; manfaat pribadi tidak dapat dijanjikan", correct: true },
      { text: "Ya, bila penelitian disetujui", correct: false },
    ],
  },
  {
    orderIndex: 4,
    categorySlug: "potential-risks",
    questionType: "MULTIPLE_CHOICE",
    questionText: "Dari mana Anda memahami risiko studi tertentu?",
    explanation: "Risiko spesifik harus berasal dari informasi studi yang ditinjau. Jangan menyimpulkan risiko dari penelitian lain.",
    options: [
      { text: "Dari penelitian lain yang mirip", correct: false },
      { text: "Dari informasi studi yang disetujui dan penjelasan tim", correct: true },
      { text: "Dengan mengabaikan risiko", correct: false },
    ],
  },
  {
    orderIndex: 5,
    categorySlug: "participant-rights",
    questionType: "SCENARIO",
    questionText: "Anda merasa tidak ingin melanjutkan penelitian. Apa yang dapat Anda lakukan?",
    scenarioText: "Anda sudah mengikuti beberapa kegiatan penelitian. Anda merasa ragu dan ingin membicarakannya dengan tim.",
    explanation: "Keikutsertaan bersifat sukarela. Anda dapat membicarakan keputusan dan pertanyaan dengan tim penelitian.",
    options: [
      { text: "Menyampaikan keputusan atau pertanyaan kepada tim penelitian", correct: true },
      { text: "Tetap ikut karena sudah memulai", correct: false },
      { text: "Meminta orang lain memutuskan untuk Anda", correct: false },
    ],
  },
  {
    orderIndex: 6,
    categorySlug: "participant-rights",
    questionType: "TEACH_BACK",
    questionText: "Dengan kata-kata sendiri, apa yang masih ingin Anda pahami atau tanyakan sebelum memutuskan?",
    explanation: "Jawaban bebas tidak dinilai otomatis. Teach-back untuk konteks nyata memerlukan rubrik yang sesuai dan peninjauan manusia.",
    options: [],
    rubric: {
      rubricTitle: "Refleksi teach-back demo",
      rubricDescription: "Prompt refleksi umum. Rubrik ini belum divalidasi untuk penggunaan klinis.",
      evaluationCriteria: [
        { criterion: "Menyebutkan hal yang belum dipahami", guidance: "Catat topik yang perlu dijelaskan kembali." },
        { criterion: "Menyiapkan pertanyaan untuk tim", guidance: "Dukung pertanyaan tanpa mengambil keputusan atas nama peserta." },
      ],
      reviewerGuidance: "Tinjau manusia hanya dalam latihan demo. Jangan menyimpulkan kelayakan atau pemahaman klinis secara otomatis.",
    },
  },
];

async function ensureRole(userId, role, institutionId) {
  const existing = await prisma.userRole.findFirst({ where: { userId, role, institutionId } });
  if (!existing) await prisma.userRole.create({ data: { userId, role, institutionId } });
}

async function ensureMembership(userId, institutionId) {
  const existing = await prisma.institutionMembership.findUnique({
    where: { userId_institutionId: { userId, institutionId } },
  });
  if (!existing) {
    await prisma.institutionMembership.create({ data: { userId, institutionId, membershipStatus: "ACTIVE" } });
  }
}

async function upsertModule(moduleData) {
  const existing = await prisma.educationalModule.findFirst({
    where: { slug: moduleData.slug, createdById: moduleData.createdById },
  });
  if (existing) {
    return prisma.educationalModule.update({ where: { id: existing.id }, data: moduleData });
  }
  return prisma.educationalModule.create({ data: moduleData });
}

async function saveContentVersion({ moduleId, projectId, createdById, snapshot, changeDescription }) {
  const where = moduleId
    ? { educationalModuleId: moduleId, versionNumber: 1 }
    : { researchProjectId: projectId, versionNumber: 1 };
  const existing = await prisma.contentVersion.findFirst({ where });
  const data = {
    ...(moduleId ? { educationalModuleId: moduleId } : { researchProjectId: projectId }),
    versionNumber: 1,
    contentSnapshot: snapshot,
    changeDescription,
    createdById,
  };
  if (existing) return prisma.contentVersion.update({ where: { id: existing.id }, data });
  return prisma.contentVersion.create({ data });
}

async function saveDemoReview({ moduleId, projectId, reviewerId, title }) {
  const where = {
    ...(moduleId ? { educationalModuleId: moduleId } : { researchProjectId: projectId }),
    reviewerId,
    reviewType: SEED_REVIEW_TYPE,
  };
  const existing = await prisma.contentReview.findFirst({ where });
  const data = {
    ...(moduleId ? { educationalModuleId: moduleId } : { researchProjectId: projectId }),
    reviewerId,
    reviewType: SEED_REVIEW_TYPE,
    status: "APPROVED",
    reviewerNotes: `Seeded demonstration record for ${title}. This is not clinical review or validation.`,
    reviewedAt: new Date(),
  };
  if (existing) return prisma.contentReview.update({ where: { id: existing.id }, data });
  return prisma.contentReview.create({ data });
}

async function main() {
  const institution = await prisma.institution.upsert({
    where: { slug: DEMO_INSTITUTION_SLUG },
    update: { name: "Institusi Simulasi SAPA-UJI", institutionType: "Clinical Research Unit", status: "ACTIVE" },
    create: {
      name: "Institusi Simulasi SAPA-UJI",
      slug: DEMO_INSTITUTION_SLUG,
      institutionType: "Clinical Research Unit",
      description: "Institusi contoh untuk seed demo SAPA-UJI. Bukan organisasi nyata.",
      contactEmail: "contact@sapa-uji.example.test",
    },
  });

  const demoUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: "researcher@sapa-uji.example.test" },
      update: { name: "Peneliti Demo", passwordHash: null, isActive: true },
      create: { name: "Peneliti Demo", email: "researcher@sapa-uji.example.test", passwordHash: null },
    }),
    prisma.user.upsert({
      where: { email: "reviewer@sapa-uji.example.test" },
      update: { name: "Reviewer Demo", passwordHash: null, isActive: true },
      create: { name: "Reviewer Demo", email: "reviewer@sapa-uji.example.test", passwordHash: null },
    }),
    prisma.user.upsert({
      where: { email: "admin@sapa-uji.example.test" },
      update: { name: "Admin Institusi Demo", passwordHash: null, isActive: true },
      create: { name: "Admin Institusi Demo", email: "admin@sapa-uji.example.test", passwordHash: null },
    }),
  ]);
  const [researcher, reviewer, institutionAdmin] = demoUsers;

  for (const [user, role] of [
    [researcher, "RESEARCHER"],
    [reviewer, "CLINICAL_REVIEWER"],
    [institutionAdmin, "INSTITUTION_ADMIN"],
  ]) {
    await ensureMembership(user.id, institution.id);
    await ensureRole(user.id, role, institution.id);
  }

  const projectData = {
    institutionId: institution.id,
    createdById: researcher.id,
    title: "Simulasi penelitian obat",
    slug: "demo-study",
    publicDescription: "Skenario edukasi generik untuk mencoba alur SAPA-UJI. Ini bukan penelitian sungguhan dan tidak memuat protokol klinis.",
    scientificTitle: "SAPA-UJI educational simulation only",
    researchType: "EDUCATIONAL_SIMULATION",
    researchPhase: "NOT_APPLICABLE",
    researchPurpose: "Simulasi ini tidak menjelaskan tujuan suatu studi nyata. Tujuan penelitian sebenarnya harus diambil dari protokol yang disetujui.",
    researchStatus: "DEMO_ONLY",
    interventionDescription: "Tidak ada obat atau intervensi nyata pada simulasi ini.",
    controlDescription: "Tidak ada kelompok kontrol pada simulasi ini.",
    durationDescription: "Tidak ada jadwal kunjungan atau durasi penelitian pada simulasi ini.",
    potentialBenefits: "Tidak ada manfaat klinis yang dijanjikan. Pada studi tertentu, manfaat potensial bukan jaminan manfaat pribadi.",
    potentialRisks: "Simulasi ini tidak memuat risiko klinis spesifik. Risiko studi nyata harus diambil dari dokumen yang disetujui.",
    participantRights: "Simulasi ini bukan ajakan mengikuti penelitian. Pada penelitian nyata, partisipasi bersifat sukarela; tanyakan hak dan prosesnya kepada tim.",
    sourceName: "Materi demonstrasi SAPA-UJI",
    sourceVersion: "Demo 1.0",
    sourceReference: "Materi generik; bukan protokol penelitian",
    inclusionInformation: "Tidak ada syarat kelayakan; simulasi ini bukan proses rekrutmen.",
    exclusionInformation: "Tidak ada kriteria eksklusi pada simulasi ini.",
    contactInformation: "Tidak ada tim penelitian nyata yang terhubung dengan simulasi ini.",
    language: "id",
    visibility: "PUBLIC",
    reviewStatus: "PUBLISHED",
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  const project = await prisma.researchProject.upsert({
    where: { institutionId_slug: { institutionId: institution.id, slug: projectData.slug } },
    update: projectData,
    create: projectData,
  });

  const stages = [
    ["Persiapan dan informasi", "Kerangka edukasi umum; bukan tahapan protokol studi tertentu."],
    ["Skrining", "Skrining pada studi nyata harus dijelaskan dari protokol yang disetujui."],
    ["Intervensi", "Simulasi ini tidak memiliki intervensi atau produk penelitian."],
    ["Pemantauan", "Pemantauan dan kontak keselamatan pada studi nyata harus dijelaskan oleh tim penelitian."],
    ["Penyelesaian", "Tindak lanjut dan akhir partisipasi berbeda pada setiap studi."],
  ];
  for (const [index, [title, description]] of stages.entries()) {
    const data = {
      researchProjectId: project.id,
      title,
      description,
      stageOrder: index + 1,
      estimatedDuration: null,
      whatHappens: description,
      whyItMatters: "Informasi spesifik perlu dicocokkan dengan protokol penelitian yang disetujui.",
      possibleExperiences: "Tidak ada pengalaman klinis yang terjadi dalam simulasi edukasi ini.",
      participantRights: "Untuk studi nyata, minta penjelasan tim mengenai hak peserta pada tahap ini.",
    };
    await prisma.researchStage.upsert({
      where: { researchProjectId_stageOrder: { researchProjectId: project.id, stageOrder: index + 1 } },
      update: data,
      create: data,
    });
  }

  await saveContentVersion({
    projectId: project.id,
    createdById: researcher.id,
    snapshot: { ...projectData, publishedAt: projectData.publishedAt.toISOString() },
    changeDescription: "Initial synthetic education demo seed; not a real study.",
  });
  await saveDemoReview({ projectId: project.id, reviewerId: reviewer.id, title: project.title });

  const moduleBySlug = new Map();
  for (const [index, module] of educationalModules.entries()) {
    const moduleData = {
      researchProjectId: null,
      title: module.title,
      slug: module.slug,
      summary: module.summary,
      content: module.content,
      sourceReference: "General educational concept; not a source for any specific study.",
      contentType: "PLAIN_LANGUAGE_ARTICLE",
      language: "id",
      estimatedReadingTime: 2,
      orderIndex: index + 1,
      status: "PUBLISHED",
      createdById: researcher.id,
    };
    const savedModule = await upsertModule(moduleData);
    moduleBySlug.set(module.slug, savedModule);
    await saveContentVersion({
      moduleId: savedModule.id,
      createdById: researcher.id,
      snapshot: moduleData,
      changeDescription: "Initial general education demo seed.",
    });
    await saveDemoReview({ moduleId: savedModule.id, reviewerId: reviewer.id, title: module.title });
  }

  const glossaryTerms = [
    {
      term: "Protokol penelitian",
      language: "id",
      category: "RESEARCH_DOCUMENT",
      simpleDefinition: "Dokumen yang menjelaskan rencana penelitian tertentu.",
      detailedDefinition: "Protokol memuat tujuan, rancangan, prosedur, dan pengawasan penelitian tertentu. Rincian yang disampaikan kepada peserta harus cocok dengan versi yang disetujui.",
    },
    {
      term: "Sukarela",
      language: "id",
      category: "PARTICIPANT_RIGHTS",
      simpleDefinition: "Keputusan dibuat tanpa paksaan.",
      detailedDefinition: "Keikutsertaan dalam penelitian harus didasarkan pada keputusan sukarela. Untuk hak dan proses pada studi tertentu, baca informasi yang disetujui dan tanyakan kepada tim.",
    },
  ];
  for (const term of glossaryTerms) {
    const savedTerm = await prisma.glossaryTerm.upsert({
      where: { term_language: { term: term.term, language: term.language } },
      update: { ...term, sourceReference: "Materi edukasi umum SAPA-UJI; bukan protokol studi" },
      create: { ...term, sourceReference: "Materi edukasi umum SAPA-UJI; bukan protokol studi", reviewStatus: "PUBLISHED" },
    });
    const educationalModule = moduleBySlug.get("research-purpose");
    await prisma.educationalModuleGlossary.upsert({
      where: { educationalModuleId_glossaryTermId: { educationalModuleId: educationalModule.id, glossaryTermId: savedTerm.id } },
      update: {},
      create: { educationalModuleId: educationalModule.id, glossaryTermId: savedTerm.id },
    });
  }

  const categories = new Map();
  for (const category of categoryDefinitions) {
    const savedCategory = await prisma.assessmentCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category,
    });
    categories.set(category.slug, savedCategory);
  }

  const existingAssessment = await prisma.assessment.findFirst({
    where: { researchProjectId: project.id, title: "Latihan pemahaman umum" },
  });
  const assessmentData = {
    researchProjectId: project.id,
    title: "Latihan pemahaman umum",
    description: "Latihan edukasi demo tanpa nilai lulus atau dampak pada kelayakan penelitian.",
    assessmentType: "COMPREHENSION",
    version: 1,
    status: "PUBLISHED",
    createdById: researcher.id,
  };
  const assessment = existingAssessment
    ? await prisma.assessment.update({ where: { id: existingAssessment.id }, data: assessmentData })
    : await prisma.assessment.create({ data: assessmentData });

  for (const definition of questionDefinitions) {
    const questionData = {
      assessmentId: assessment.id,
      categoryId: categories.get(definition.categorySlug).id,
      questionText: definition.questionText,
      questionType: definition.questionType,
      scenarioText: definition.scenarioText ?? null,
      explanation: definition.explanation,
      difficulty: "FOUNDATION",
      points: 1,
      orderIndex: definition.orderIndex,
      status: "PUBLISHED",
    };
    const question = await prisma.question.upsert({
      where: { assessmentId_orderIndex: { assessmentId: assessment.id, orderIndex: definition.orderIndex } },
      update: questionData,
      create: questionData,
    });

    for (const [index, option] of definition.options.entries()) {
      await prisma.questionOption.upsert({
        where: { questionId_orderIndex: { questionId: question.id, orderIndex: index + 1 } },
        update: {
          optionText: option.text,
          isCorrect: option.correct,
          feedback: definition.explanation,
        },
        create: {
          questionId: question.id,
          optionText: option.text,
          isCorrect: option.correct,
          feedback: definition.explanation,
          orderIndex: index + 1,
        },
      });
    }

    if (definition.rubric) {
      await prisma.teachBackRubric.upsert({
        where: { questionId: question.id },
        update: definition.rubric,
        create: { questionId: question.id, ...definition.rubric },
      });
    }
  }

  const existingAudit = await prisma.auditLog.findFirst({
    where: { action: "SEED_DEMO_CONTENT", resourceType: "ResearchProject", resourceId: project.id },
  });
  if (!existingAudit) {
    await prisma.auditLog.create({
      data: {
        actorId: institutionAdmin.id,
        institutionId: institution.id,
        action: "SEED_DEMO_CONTENT",
        resourceType: "ResearchProject",
        resourceId: project.id,
        metadata: { seed: "sapa-uji-demo-v1", containsParticipantData: false },
      },
    });
  }

  console.log(`Seeded SAPA-UJI demo content for institution '${institution.slug}'.`);
  console.log("No password credentials or participant records were created.");
}

main()
  .catch((error) => {
    console.error("SAPA-UJI database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
