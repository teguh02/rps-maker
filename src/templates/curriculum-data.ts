// Preloaded curriculum data from UNISINA kurikulum
// Extracted from referensi/RPS GENAP 25-26 UNISINA/

export interface MataKuliahData {
  kode: string
  nama: string
  sks: number
  semester: number
  cpl: string[]
  cpmk: string[]
  subCpmk: string[]
  bahanKajianWajib: string[]
  referensiWajib: string[]
}

export interface ProdiData {
  nama: string
  kode: string
  jenjang: string
  mataKuliah: MataKuliahData[]
}

export const prodiData: ProdiData[] = [
  {
    nama: 'S1 Farmasi',
    kode: 'FARM-S1',
    jenjang: 'S1',
    mataKuliah: [
      {
        kode: 'FARM-4301',
        nama: 'Farmakokinetik Dasar',
        sks: 3,
        semester: 4,
        cpl: [
          'Sikap: Menjunjung tinggi nilai kemanusiaan, integritas, dan kemandirian dalam profesi farmasi',
          'Pengetahuan: Memahami prinsip farmakokinetik dan penerapannya dalam terapi obat',
          'Keterampilan Umum: Menganalisis data farmakokinetik untuk pengambilan keputusan klinis',
          'Keterampilan Khusus: Menghitung parameter farmakokinetik dan menginterpretasikannya'
        ],
        cpmk: [
          'CPMK 1: Mahasiswa mampu menjelaskan konsep dasar farmakokinetik dan parameter-parameter yang terkait',
          'CPMK 2: Mahasiswa mampu menganalisis absorbsi, distribusi, metabolisme, dan ekskresi obat',
          'CPMK 3: Mahasiswa mampu menghitung parameter farmakokinetik seperti clearance, volume distribusi, dan half-life'
        ],
        subCpmk: [
          '1.1 Menjelaskan definisi dan ruang lingkup farmakokinetik',
          '1.2 Mengidentifikasi parameter farmakokinetik utama',
          '2.1 Menganalisis proses absorbsi obat melalui berbagai rute pemberian',
          '2.2 Menganalisis distribusi obat dalam tubuh',
          '2.3 Menganalisis metabolisme obat di hati',
          '2.4 Menganalisis ekskresi obat melalui ginjal dan empedu',
          '3.1 Menghitung clearance dan volume distribusi',
          '3.2 Menghitung half-life dan waktu stabil',
          '3.3 Mengaplikasikan parameter farmakokinetik dalam dosis obat'
        ],
        bahanKajianWajib: [
          'Prinsip Dasar Farmakokinetik',
          'Model Farmakokinetik One-compartment dan Two-compartment',
          'Proses Absorpsi Obat',
          'Distribusi Obat dalam Tubuh',
          'Metabolisme Obat (Biotransformasi)',
          'Ekskresi Obat',
          'Parameter Farmakokinetik: Cmax, Tmax, AUC, Clearance, Vd, Half-life',
          'Penerapan Farmakokinetik dalam Dosage Regimen'
        ],
        referensiWajib: [
          'Katzung, B.G. (2024). Basic & Clinical Pharmacology. 16th Edition. McGraw-Hill.',
          'Rowland, M. & Tozer, T.N. (2023). Clinical Pharmacokinetics and Pharmacodynamics. 5th Edition. Wolters Kluwer.',
          'Shargel, L. & Yu, A. (2023). Applied Biopharmaceutics & Pharmacokinetics. 8th Edition. McGraw-Hill.',
          'Rang, H.P. et al. (2024). Rang & Dale\'s Pharmacology. 10th Edition. Elsevier.'
        ]
      },
      {
        kode: 'FARM-4302',
        nama: 'Farmakognosi dan Fitokimia',
        sks: 3,
        semester: 4,
        cpl: [
          'Sikap: Berperilaku etis dalam pengelolaan dan pengujian tanaman obat',
          'Pengetahuan: Memahami prinsip farmakognosi dan isolasi senyawa aktif dari tumbuhan',
          'Keterampilan Umum: Melakukan identifikasi dan pengujian kualitatif senyawa fitokimia',
          'Keterampilan Khusus: Menganalisis kandungan senyawa aktif dan mutu bahan alam'
        ],
        cpmk: [
          'CPMK 1: Mahasiswa mampu menjelaskan konsep dasar farmakognosi dan klasifikasi senyawa alam',
          'CPMK 2: Mahasiswa mampu mengidentifikasi senyawa fitokimia menggunakan metode kromatografi dan spektroskopi',
          'CPMK 3: Mahasiswa mampu menganalisis mutu bahan alam berdasarkan parameter standar'
        ],
        subCpmk: [
          '1.1 Menjelaskan sejarah dan perkembangan farmakognosi',
          '1.2 Mengklasifikasikan senyawa metabolit primer dan sekunder',
          '1.3 Menjelaskan prinsip biosintesis senyawa alam',
          '2.1 Mengidentifikasi alkaloid menggunakan uji reagen',
          '2.2 Mengidentifikasi flavonoid dan tanin',
          '2.3 Mengidentifikasi saponin dan glikosida',
          '2.4 Menggunakan KLT untuk identifikasi senyawa',
          '3.1 Menentukan kadar senyawa aktif dengan metode spektrofotometri',
          '3.2 Menganalisis mutu fisik dan kimia bahan alam',
          '3.3 Menilai stabulitas sediaan herbal'
        ],
        bahanKajianWajib: [
          'Pengertian dan Ruang Lingkup Farmakognosi',
          'Klasifikasi Senyawa Alkaloid, Flavonoid, Tanin, Saponin',
          'Metode Isolasi dan Identifikasi Senyawa Fitokimia',
          'Kromatografi (TLC, HPLC) untuk Analisis Bahan Alam',
          'Uji Kualitatif dan Kuantitatif Senyawa Alami',
          'Farmakognosi Tumbuhan Obat Indonesia',
          'Standarisasi dan Mutu Bahan Alam'
        ],
        referensiWajib: [
          'Evans, W.C. (2023). Trease and Evans\' Pharmacognosy. 17th Edition. Elsevier.',
          'Harborne, J.B. (2022). Phytochemical Methods. 5th Edition. Chapman & Hall.',
          'Sofowora, A. (2023). Medicinal Plants and Traditional Medicine in Africa. 3rd Edition. Spectrum Books.',
          'Javanmardi, J. et al. (2024). Applied Phytochemistry. Springer.'
        ]
      },
      {
        kode: 'FARM-4303',
        nama: 'Spektroskopi',
        sks: 3,
        semester: 4,
        cpl: [
          'Sikap: Teliti dan cermat dalam pengambilan data spektral',
          'Pengetahuan: Memahami prinsip spektroskopi UV-Vis, IR, NMR, dan MS',
          'Keterampilan Umum: Mengoperasikan instrumen spektroskopi dan menginterpretasi data',
          'Keterampilan Khusus: Mengidentifikasi struktur senyawa berdasarkan data spektral'
        ],
        cpmk: [
          'CPMK 1: Mahasiswa mampu menjelaskan prinsip dan penerapan spektroskopi UV-Vis',
          'CPMK 2: Mahasiswa mampu menjelaskan prinsip dan penerapan spektroskopi IR',
          'CPMK 3: Mahasiswa mampu menginterpretasi data spektral untuk identifikasi struktur senyawa'
        ],
        subCpmk: [
          '1.1 Menjelaskan prinsip absorpsi cahaya UV-Vis',
          '1.2 Menghitung parameter spektral: λmax, ε, A',
          '1.3 Menerapkan Beer-Lambert Law',
          '2.1 Menjelaskan prinsip vibrasi molekul dalam IR',
          '2.2 Mengidentifikasi gugus fungsi dari spektrum IR',
          '2.3 Membedakan spektrum senyawa organik dan anorganik',
          '3.1 Mengintegrasikan data UV-Vis, IR, NMR, dan MS',
          '3.2 Menentukan struktur senyawa dari gabungan data spektral',
          '3.3 Memecahkan studi kasus identifikasi senyawa farmasi'
        ],
        bahanKajianWajib: [
          'Prinsip Spektroskopi UV-Vis dan Penerapannya',
          'Analisis Spektrum IR dan Identifikasi Gugus Fungsi',
          'Pengantar NMR dan MS untuk Identifikasi Struktur',
          'Interpretasi Data Spektral Gabungan',
          'Aplikasi Spektroskopi dalam Analisis Obat'
        ],
        referensiWajib: [
          'Pavia, D.L. et al. (2024). Introduction to Spectroscopy. 6th Edition. Cengage Learning.',
          'Skrabal, P. (2023). Spectroscopic Methods in Organic Chemistry. Springer.',
          'Clarke, E.G.C. (2022). Clarke\'s Analysis of Drugs and Poisons. 5th Edition. Pharmaceutical Press.'
        ]
      },
      {
        kode: 'FARM-4304',
        nama: 'Farmakoterapi',
        sks: 3,
        semester: 4,
        cpl: [
          'Sikap: Empati dan tanggung jawab dalam pemberian informasi obat',
          'Pengetahuan: Memahami mekanisme kerja, indikasi, dan efek samping obat',
          'Keterampilan Umum: Merekomendasikan terapi obat yang tepat',
          'Keterampilan Khusus: Mengelola terapi polifarmasi dan interaksi obat'
        ],
        cpmk: [
          'CPMK 1: Mahasiswa mampu menganalisis mekanisme kerja dan farmakologi obat sistemik',
          'CPMK 2: Mahasiswa mampu merekomendasikan terapi berdasarkan bukti klinis',
          'CPMK 3: Mahasiswa mampu mengidentifikasi dan mengelola interaksi obat'
        ],
        subCpmk: [
          '1.1 Menganalisis farmakologi obat untuk sistem kardiovaskuler',
          '1.2 Menganalisis farmakologi obat untuk sistem saraf pusat',
          '1.3 Menganalisis farmakologi obat untuk sistem pencernaan',
          '2.1 Merekomendasikan terapi untuk hipertensi',
          '2.2 Merekomendasikan terapi untuk diabetes melitus',
          '2.3 Merekomendasikan terapi untuk infeksi',
          '3.1 Mengidentifikasi interaksi obat farmakokinetik',
          '3.2 Mengidentifikasi interaksi obat farmakodinamik',
          '3.3 Mengelola polifarmasi pada pasien geriatrik'
        ],
        bahanKajianWajib: [
          'Farmakologi Kardiovaskuler',
          'Farmakologi Sistem Saraf Pusat',
          'Farmakologi Sistem Pencernaan',
          'Prinsip Terapi Berbasis Bukti',
          'Interaksi Obat dan Efek Samping',
          'Manajemen Polifarmasi'
        ],
        referensiWajib: [
          'Katzung, B.G. (2024). Basic & Clinical Pharmacology. 16th Edition.',
          'Rang, H.P. et al. (2024). Rang & Dale\'s Pharmacology. 10th Edition.',
          'WHO. (2023). Model Formulary. 4th Edition.',
          'Danford, E.C. et al. (2024). Pharmacotherapy: A Pathophysiologic Approach. 13th Edition.'
        ]
      }
    ]
  },
  {
    nama: 'D3 Analis Farmasi dan Makanan',
    kode: 'ANAF-D3',
    jenjang: 'D3',
    mataKuliah: [
      {
        kode: 'ANAF-2201',
        nama: 'Teknik Fisikokimia',
        sks: 3,
        semester: 2,
        cpl: [
          'Sikap: Teliti dalam pengukuran dan pencatatan data fisikokimia',
          'Pengetahuan: Memahami parameter fisikokimia dan metode pengukurannya',
          'Keterampilan Umum: Melakukan pengukuran parameter fisikokimia dengan akurat',
          'Keterampilan Khusus: Mengaplikasikan teknik fisikokimia dalam analisis sediaan'
        ],
        cpmk: [
          'CPMK 1: Mahasiswa mampu menjelaskan parameter fisikokimia obat dan sediaan',
          'CPMK 2: Mahasiswa mampu melakukan pengukuran pH, viskositas, dan densitas',
          'CPMK 3: Mahasiswa mampu menganalisis data fisikokimia untuk evaluasi mutu'
        ],
        subCpmk: [
          '1.1 Menjelaskan parameter fisikokimia: pH, viskositas, densitas, refraktometri',
          '1.2 Menjelaskan prinsip kerja alat ukur fisikokimia',
          '2.1 Mengukur pH dengan pH meter dan indikator',
          '2.2 Mengukur viskositas dengan viskosmeter',
          '2.3 Mengukur densitas dengan piknometer',
          '3.1 Menganalisis data pengukuran fisikokimia',
          '3.2 Menilai mutu sediaan berdasarkan parameter fisikokimia',
          '3.3 Menyusun laporan pengujian fisikokimia'
        ],
        bahanKajianWajib: [
          'Parameter Fisikokimia Sediaan Farmasi',
          'Prinsip Pengukuran pH',
          'Teknik Pengukuran Viskositas',
          'Pengukuran Densitas dan Refraktometri',
          'Standarisasi Parameter Fisikokimia'
        ],
        referensiWajib: [
          'Martin, A. & Bustamante, P. (2023). Physical Pharmacy. 6th Edition. Lea & Febiger.',
          'Aulton, M.E. & Taylor, K.M.G. (2024). Aulton\'s Pharmaceutics. 5th Edition. Elsevier.',
          'BP Indonesia. (2024). Farmakope Indonesia Edisi VI.'
        ]
      },
      {
        kode: 'ANAF-2202',
        nama: 'Kimia Analitik II',
        sks: 3,
        semester: 2,
        cpl: [
          'Sikap: Jujur dan objektif dalam pelaporan hasil analisis',
          'Pengetahuan: Memahami metode analisis kuantitatif dan validasi metode',
          'Keterampilan Umum: Melakukan analisis kuantitatif dengan titrasi dan spektrofotometri',
          'Keterampilan Khusus: Memvalidasi metode analisis dan mengevaluasi data'
        ],
        cpmk: [
          'CPMK 1: Mahasiswa mampu melakukan analisis kuantitatif dengan metode titrasi',
          'CPMK 2: Mahasiswa mampu melakukan analisis kuantitatif dengan metode spektrofotometri',
          'CPMK 3: Mahasiswa mampu memvalidasi metode analisis berdasarkan parameter validitas'
        ],
        subCpmk: [
          '1.1 Melakukan titrasi asam-basa',
          '1.2 Melakukan titrasi redoks',
          '1.3 Melakukan titrasi kompleksometri',
          '2.1 Analisis kuantitatif dengan spektrofotometri UV-Vis',
          '2.2 Membuat kurva kalibrasi dan menentukan linearitas',
          '3.1 Memvalidasi metode: akurasi, presisi, spesifisitas',
          '3.2 Menentukan LOQ dan LOD',
          '3.3 Menyusun laporan validasi metode'
        ],
        bahanKajianWajib: [
          'Prinsip Analisis Kuantitatif',
          'Metode Titrasi dan Aplikasinya',
          'Analisis Spektrofotometri',
          'Validasi Metode Analisis',
          'Good Laboratory Practice (GLP)'
        ],
        referensiwajib: [
          'Skoog, D.A. et al. (2024). Principles of Instrumental Analysis. 7th Edition. Cengage.',
          'Armenta, S. et al. (2023). Analytical Chemistry. Springer.',
          'BP Indonesia. (2024). Farmakope Indonesia Edisi VI.'
        ]
      }
    ]
  }
]

export function getDefaultTemplate(): Record<string, string> {
  return {
    prodi: '',
    mata_kuliah: '',
    kode_mk: '',
    sks: '',
    semester: '',
    dosen: '',
    semester_akademik: '',
  }
}

export function getPreloadedTemplate(prodiKode: string, mkKode: string): Record<string, string> {
  const prodi = prodiData.find(p => p.kode === prodiKode)
  if (!prodi) return getDefaultTemplate()

  const mk = prodi.mataKuliah.find(m => m.kode === mkKode)
  if (!mk) return getDefaultTemplate()

  const cplHtml = mk.cpl.map(c => `<p>${c}</p>`).join('')
  const cpmkHtml = mk.cpmk.map(c => `<p>${c}</p>`).join('')
  const subCpmkHtml = mk.subCpmk.map(s => `<p>${s}</p>`).join('')
  const bahanKajianHtml = mk.bahanKajianWajib.map(b => `<p>• ${b}</p>`).join('')
  const referensiHtml = mk.referensiWajib.map(r => `<p>${r}</p>`).join('')

  return {
    prodi: prodi.nama,
    mata_kuliah: mk.nama,
    kode_mk: mk.kode,
    sks: mk.sks.toString(),
    semester: mk.semester.toString(),
    dosen: '',
    semester_akademik: '',
    cpl: cplHtml,
    cpmk: cpmkHtml,
    sub_cpmk: subCpmkHtml,
    bahan_kajian: bahanKajianHtml,
    metode: '',
    pengalaman_belajar: '',
    asesmen: '',
    referensi: referensiHtml,
  }
}
