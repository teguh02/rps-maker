// Preloaded curriculum data from UNISINA kurikulum
// Extracted from referensi/RPS GENAP 25-26 UNISINA/ (actual RPS files)

export interface MataKuliahData {
  kode: string
  nama: string
  sks: number
  semester: number
  rumpunMK: string
  cpl: string[]           // CPL Prodi yang dibebankan pada MK
  cpmk: string[]
  subCpmk: string[]
  deskripsiMK: string
  bahanKajian: string[]
  pustakaUtama: string[]
  pustakaPendukung: string[]
  matakuliahSyarat: string
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
        kode: 'SF433',
        nama: 'Farmakognosi Fitokimia',
        sks: 3,
        semester: 4,
        rumpunMK: 'MK Keahlian',
        cpl: [
          'CPL 1: Mahasiswa mampu memanfaatkan teknologi informasi serta mengintegrasikan ilmu dasar, ilmu kefarmasian, ilmu humaniora, dan kesehatan masyarakat guna mengembangkan dan menerapkan ilmu pengetahuan, teknologi, dan/atau seni guna memajukan kesejahteraan nasional dan menjadi warga dunia yang bertanggung jawab.',
          'CPL 2: Mahasiswa mampu mengimplementasikan konsep pengembangan, penjaminan mutu, dan pengujian kualitas sediaan farmasi, alat kesehatan, serta perbekalan kesehatan rumah tangga yang aman, berkhasiat, bermutu, dan terjangkau.',
          'CPL 7: Mahasiswa mampu mengaplikasikan konsep dan metode penelitian ilmiah di bidang farmasi, baik dalam konteks laboratorium maupun lapangan, serta melakukan penelitian yang dapat memberikan kontribusi bagi pengembangan ilmu pengetahuan dan teknologi kefarmasian.'
        ],
        cpmk: [
          'CPMK-1: Mahasiswa mampu mengidentifikasi tanaman obat dan kandungan metabolit sekundernya.',
          'CPMK-2: Mahasiswa mampu mengembangkan sediaan herbal berdasarkan evaluasi bahan aktif.',
          'CPMK-3: Mahasiswa mampu melakukan penelitian terhadap senyawa aktif dari tanaman obat.'
        ],
        subCpmk: [
          'Sub-CPMK1: Mahasiswa mampu menjelaskan konsep dasar, ruang lingkup, dan manfaat farmakognosi dan fitokimia',
          'Sub-CPMK2: Mahasiswa mampu mengidentifikasi dan menjelaskan proses pembuatan simplisia sesuai standar mutu',
          'Sub-CPMK3: Mahasiswa mampu mengevaluasi kualitas simplisia menggunakan metode organoleptik, mikroskopis, dan fisikokimia',
          'Sub-CPMK4: Mahasiswa mampu mengklasifikasikan metabolit primer dan menjelaskan fungsinya dalam simplisia',
          'Sub-CPMK5: Mahasiswa mampu mengidentifikasi senyawa metabolit primer menggunakan metode yang tepat',
          'Sub-CPMK6: Menjelaskan jalur biosintesis metabolit sekunder pada tumbuhan',
          'Sub-CPMK7: Mahasiswa mampu membedakan klasifikasi metabolit sekunder dan menjelaskan manfaatnya',
          'Sub-CPMK8: Mahasiswa mampu menjelaskan karakteristik fisikokimia dan aktivitas biologis metabolit sekunder',
          'Sub-CPMK9: Mahasiswa mampu menerapkan metode ekstraksi konvensional dan modern dalam memperoleh senyawa aktif',
          'Sub-CPMK10: Mahasiswa mampu melakukan skrining kualitatif untuk mendeteksi keberadaan metabolit sekunder',
          'Sub-CPMK11: Mahasiswa mampu menjelaskan prinsip dasar pemisahan, isolasi, dan pemurnian senyawa aktif dari bahan alam secara sistematis dan sesuai standar.',
          'Sub-CPMK12: Mahasiswa mampu mengidentifikasi senyawa aktif menggunakan Teknik kromatografi dan spektroskopi untuk analisis struktural senyawa aktif',
          'Sub-CPMK13: Mahasiswa mampu menerapkan etika penggunaan bahan alam dalam penelitian dan pengembangan obat'
        ],
        deskripsiMK: 'Mata kuliah ini membahas konsep dasar, ruang lingkup, serta manfaat farmakognosi dan fitokimia. Cakupan materi meliputi pembuatan dan kontrol kualitas simplisia, identifikasi metabolit primer dan sekunder, skrining fitokimia, ekstraksi, pemisahan, pemurnian, serta identifikasi senyawa aktif dari tanaman obat.',
        bahanKajian: [
          'Simplisia dan Pembuatannya',
          'Kontrol Kualitas Simplisia',
          'Metabolit Primer dan Identifikasinya',
          'Metabolit Sekunder',
          'Skrining Fitokimia',
          'Ekstraksi',
          'Pemisahan',
          'Pemurnian'
        ],
        pustakaUtama: [
          'Emelda. (2019). Farmakognosi Untuk Mahasiswa Kompetensi Keahlian Farmasi. Yogyakarta: Pustaka Baru Press.',
          'Wardani, T. S. (2022). Isolasi dan Analisis Tumbuhan Obat. Yogyakarta: Pustaka Baru Press.'
        ],
        pustakaPendukung: [
          'Simanjuntak, P. (2014). Biokimia Tumbuhan. Jakarta: Erlangga.',
          'Voigt, R. (1995). Buku Pelajaran Teknologi Farmasi. Jakarta: UI Press.',
          'Silverstein, R. M., Bassler, G. C., & Morrill, T. C. (2005). Spectrometric Identification of Organic Compounds.'
        ],
        matakuliahSyarat: 'KROMATOGRAFI (SF213)'
      },
      {
        kode: 'SF434',
        nama: 'Spektroskopi',
        sks: 3,
        semester: 4,
        rumpunMK: 'MK Keahlian',
        cpl: [
          'CPL 1: Mahasiswa mampu memanfaatkan teknologi informasi serta mengintegrasikan ilmu dasar, ilmu kefarmasian, ilmu humaniora, dan kesehatan masyarakat guna mengembangkan dan menerapkan ilmu pengetahuan, teknologi, dan/atau seni guna memajukan kesejahteraan nasional dan menjadi warga dunia yang bertanggung jawab.',
          'CPL 2: Mahasiswa mampu mengimplementasikan konsep pengembangan, penjaminan mutu, dan pengujian kualitas sediaan farmasi, alat kesehatan, serta perbekalan kesehatan rumah tangga yang aman, berkhasiat, bermutu, dan terjangkau.',
          'CPL 7: Mahasiswa mampu mengaplikasikan konsep dan metode penelitian ilmiah di bidang farmasi, baik dalam konteks laboratorium maupun lapangan, serta melakukan penelitian yang dapat memberikan kontribusi bagi pengembangan ilmu pengetahuan dan teknologi kefarmasian.'
        ],
        cpmk: [
          'CPMK-1: Mahasiswa mampu menjelaskan prinsip dan penerapan spektroskopi UV-Vis.',
          'CPMK-2: Mahasiswa mampu menjelaskan prinsip dan penerapan spektroskopi IR.',
          'CPMK-3: Mahasiswa mampu menginterpretasi data spektral untuk identifikasi struktur senyawa.'
        ],
        subCpmk: [
          'Sub-CPMK1: Menjelaskan prinsip absorpsi cahaya UV-Vis',
          'Sub-CPMK2: Menghitung parameter spektral: lambda max, epsilon, A',
          'Sub-CPMK3: Menerapkan Beer-Lambert Law',
          'Sub-CPMK4: Menjelaskan prinsip vibrasi molekul dalam IR',
          'Sub-CPMK5: Mengidentifikasi gugus fungsi dari spektrum IR',
          'Sub-CPMK6: Membedakan spektrum senyawa organik dan anorganik',
          'Sub-CPMK7: Mengintegrasikan data UV-Vis, IR, NMR, dan MS',
          'Sub-CPMK8: Menentukan struktur senyawa dari gabungan data spektral',
          'Sub-CPMK9: Memecahkan studi kasus identifikasi senyawa farmasi'
        ],
        deskripsiMK: 'Mata kuliah ini membahas prinsip-prinsip spektroskopi yang digunakan dalam analisis obat, meliputi spektroskopi UV-Vis, IR, NMR, dan MS serta interpretasi data spektral untuk identifikasi struktur senyawa.',
        bahanKajian: [
          'Prinsip Spektroskopi UV-Vis dan Penerapannya',
          'Analisis Spektrum IR dan Identifikasi Gugus Fungsi',
          'Pengantar NMR dan MS untuk Identifikasi Struktur',
          'Interpretasi Data Spektral Gabungan',
          'Aplikasi Spektroskopi dalam Analisis Obat'
        ],
        pustakaUtama: [
          'Pavia, D. L. et al. (2024). Introduction to Spectroscopy. 6th Edition. Cengage Learning.',
          'Skrabal, P. (2023). Spectroscopic Methods in Organic Chemistry. Springer.'
        ],
        pustakaPendukung: [
          'Clarke, E. G. C. (2022). Clarke\'s Analysis of Drugs and Poisons. 5th Edition. Pharmaceutical Press.'
        ],
        matakuliahSyarat: 'KIMIA ORGANIK LANJUT'
      },
      {
        kode: 'SF435',
        nama: 'Farmakoterapi',
        sks: 3,
        semester: 4,
        rumpunMK: 'MK Keahlian',
        cpl: [
          'CPL 1: Mahasiswa mampu memanfaatkan teknologi informasi serta mengintegrasikan ilmu dasar, ilmu kefarmasian, ilmu humaniora, dan kesehatan masyarakat guna mengembangkan dan menerapkan ilmu pengetahuan, teknologi, dan/atau seni guna memajukan kesejahteraan nasional dan menjadi warga dunia yang bertanggung jawab.',
          'CPL 3: Mahasiswa mampu menganalisis dan mengelola informasi obat serta memberikan layanan informasi obat yang tepat guna dan bertanggung jawab.',
          'CPL 4: Mahasiswa mampu mengidentifikasi dan menganalisis masalah kefarmasian serta merumuskan solusi berbasis bukti ilmiah.'
        ],
        cpmk: [
          'CPMK-1: Mahasiswa mampu menganalisis mekanisme kerja dan farmakologi obat sistemik.',
          'CPMK-2: Mahasiswa mampu merekomendasikan terapi berdasarkan bukti klinis.',
          'CPMK-3: Mahasiswa mampu mengidentifikasi dan mengelola interaksi obat.'
        ],
        subCpmk: [
          'Sub-CPMK1: Menganalisis farmakologi obat untuk sistem kardiovaskuler',
          'Sub-CPMK2: Menganalisis farmakologi obat untuk sistem saraf pusat',
          'Sub-CPMK3: Menganalisis farmakologi obat untuk sistem pencernaan',
          'Sub-CPMK4: Merekomendasikan terapi untuk hipertensi',
          'Sub-CPMK5: Merekomendasikan terapi untuk diabetes melitus',
          'Sub-CPMK6: Merekomendasikan terapi untuk infeksi',
          'Sub-CPMK7: Mengidentifikasi interaksi obat farmakokinetik',
          'Sub-CPMK8: Mengidentifikasi interaksi obat farmakodinamik',
          'Sub-CPMK9: Mengelola polifarmasi pada pasien geriatrik'
        ],
        deskripsiMK: 'Mata kuliah ini membahas prinsip farmakologi terapan meliputi mekanisme kerja obat, indikasi, efek samping, interaksi obat, dan penerapannya dalam terapi penyakit sistemik.',
        bahanKajian: [
          'Farmakologi Kardiovaskuler',
          'Farmakologi Sistem Saraf Pusat',
          'Farmakologi Sistem Pencernaan',
          'Prinsip Terapi Berbasis Bukti',
          'Interaksi Obat dan Efek Samping',
          'Manajemen Polifarmasi'
        ],
        pustakaUtama: [
          'Katzung, B. G. (2024). Basic & Clinical Pharmacology. 16th Edition. McGraw-Hill.',
          'Rang, H. P. et al. (2024). Rang & Dale\'s Pharmacology. 10th Edition. Elsevier.'
        ],
        pustakaPendukung: [
          'WHO. (2023). Model Formulary. 4th Edition.',
          'Danford, E. C. et al. (2024). Pharmacotherapy: A Pathophysiologic Approach. 13th Edition.'
        ],
        matakuliahSyarat: 'FARMAKOLOGI DAN TOKSIKOLOGI DASAR'
      },
      {
        kode: 'SF431',
        nama: 'Farmakokinetik Dasar',
        sks: 3,
        semester: 4,
        rumpunMK: 'MK Keahlian',
        cpl: [
          'CPL 1: Mahasiswa mampu memanfaatkan teknologi informasi serta mengintegrasikan ilmu dasar, ilmu kefarmasian, ilmu humaniora, dan kesehatan masyarakat guna mengembangkan dan menerapkan ilmu pengetahuan, teknologi, dan/atau seni guna memajukan kesejahteraan nasional dan menjadi warga dunia yang bertanggung jawab.',
          'CPL 2: Mahasiswa mampu mengimplementasikan konsep pengembangan, penjaminan mutu, dan pengujian kualitas sediaan farmasi, alat kesehatan, serta perbekalan kesehatan rumah tangga yang aman, berkhasiat, bermutu, dan terjangkau.',
          'CPL 3: Mahasiswa mampu menganalisis dan mengelola informasi obat serta memberikan layanan informasi obat yang tepat guna dan bertanggung jawab.'
        ],
        cpmk: [
          'CPMK-1: Mahasiswa mampu menjelaskan konsep dasar farmakokinetik dan parameter-parameter yang terkait.',
          'CPMK-2: Mahasiswa mampu menganalisis absorbsi, distribusi, metabolisme, dan ekskresi obat.',
          'CPMK-3: Mahasiswa mampu menghitung parameter farmakokinetik seperti clearance, volume distribusi, dan half-life.'
        ],
        subCpmk: [
          'Sub-CPMK1: Menjelaskan definisi dan ruang lingkup farmakokinetik',
          'Sub-CPMK2: Mengidentifikasi parameter farmakokinetik utama',
          'Sub-CPMK3: Menganalisis proses absorbsi obat melalui berbagai rute pemberian',
          'Sub-CPMK4: Menganalisis distribusi obat dalam tubuh',
          'Sub-CPMK5: Menganalisis metabolisme obat di hati',
          'Sub-CPMK6: Menganalisis ekskresi obat melalui ginjal dan empedu',
          'Sub-CPMK7: Menghitung clearance dan volume distribusi',
          'Sub-CPMK8: Menghitung half-life dan waktu stabil',
          'Sub-CPMK9: Mengaplikasikan parameter farmakokinetik dalam dosis obat'
        ],
        deskripsiMK: 'Mata kuliah ini membahas konsep dasar farmakokinetik meliputi absorpsi, distribusi, metabolisme, dan ekskresi obat serta parameter-parameter farmakokinetik dan penerapannya dalam regimen dosis.',
        bahanKajian: [
          'Prinsip Dasar Farmakokinetik',
          'Model Farmakokinetik One-compartment dan Two-compartment',
          'Proses Absorpsi Obat',
          'Distribusi Obat dalam Tubuh',
          'Metabolisme Obat (Biotransformasi)',
          'Ekskresi Obat',
          'Parameter Farmakokinetik: Cmax, Tmax, AUC, Clearance, Vd, Half-life',
          'Penerapan Farmakokinetik dalam Dosage Regimen'
        ],
        pustakaUtama: [
          'Katzung, B. G. (2024). Basic & Clinical Pharmacology. 16th Edition. McGraw-Hill.',
          'Rowland, M. & Tozer, T. N. (2023). Clinical Pharmacokinetics and Pharmacodynamics. 5th Edition. Wolters Kluwer.',
          'Shargel, L. & Yu, A. (2023). Applied Biopharmaceutics & Pharmacokinetics. 8th Edition. McGraw-Hill.'
        ],
        pustakaPendukung: [
          'Rang, H. P. et al. (2024). Rang & Dale\'s Pharmacology. 10th Edition. Elsevier.'
        ],
        matakuliahSyarat: 'FARMAKOLOGI DAN TOKSIKOLOGI DASAR'
      }
    ]
  },
  {
    nama: 'D3 Analis Farmasi dan Makanan',
    kode: 'ANAF-D3',
    jenjang: 'D3',
    mataKuliah: [
      {
        kode: 'TIK221',
        nama: 'Teknik Fisikokimia',
        sks: 3,
        semester: 2,
        rumpunMK: 'MK Keahlian',
        cpl: [
          'CPL 1: Mahasiswa mampu menerapkan pengetahuan dasar analisis dan teknik fisikokimia dalam pengujian sediaan farmasi.',
          'CPL 2: Mahasiswa mampu melakukan pengukuran parameter fisikokimia sesuai standar prosedur operasional.',
          'CPL 3: Mahasiswa mampu menganalisis dan melaporkan data pengujian fisikokimia dengan benar dan objektif.'
        ],
        cpmk: [
          'CPMK-1: Mahasiswa mampu menjelaskan parameter fisikokimia obat dan sediaan.',
          'CPMK-2: Mahasiswa mampu melakukan pengukuran pH, viskositas, dan densitas.',
          'CPMK-3: Mahasiswa mampu menganalisis data fisikokimia untuk evaluasi mutu.'
        ],
        subCpmk: [
          'Sub-CPMK1: Menjelaskan parameter fisikokimia: pH, viskositas, densitas, refraktometri',
          'Sub-CPMK2: Menjelaskan prinsip kerja alat ukur fisikokimia',
          'Sub-CPMK3: Mengukur pH dengan pH meter dan indikator',
          'Sub-CPMK4: Mengukur viskositas dengan viskosmeter',
          'Sub-CPMK5: Mengukur densitas dengan piknometer',
          'Sub-CPMK6: Menganalisis data pengukuran fisikokimia',
          'Sub-CPMK7: Menilai mutu sediaan berdasarkan parameter fisikokimia',
          'Sub-CPMK8: Menyusun laporan pengujian fisikokimia'
        ],
        deskripsiMK: 'Mata kuliah ini membahas parameter fisikokimia sediaan farmasi meliputi pH, viskositas, densitas, dan refraktometri beserta metode pengukurannya dan penerapannya dalam evaluasi mutu sediaan.',
        bahanKajian: [
          'Parameter Fisikokimia Sediaan Farmasi',
          'Prinsip Pengukuran pH',
          'Teknik Pengukuran Viskositas',
          'Pengukuran Densitas dan Refraktometri',
          'Standarisasi Parameter Fisikokimia'
        ],
        pustakaUtama: [
          'Martin, A. & Bustamante, P. (2023). Physical Pharmacy. 6th Edition. Lea & Febiger.',
          'Aulton, M. E. & Taylor, K. M. G. (2024). Aulton\'s Pharmaceutics. 5th Edition. Elsevier.'
        ],
        pustakaPendukung: [
          'BP Indonesia. (2024). Farmakope Indonesia Edisi VI.'
        ],
        matakuliahSyarat: '-'
      },
      {
        kode: 'KIA222',
        nama: 'Kimia Analitik II',
        sks: 3,
        semester: 2,
        rumpunMK: 'MK Keahlian',
        cpl: [
          'CPL 1: Mahasiswa mampu menerapkan pengetahuan dasar analisis dan teknik fisikokimia dalam pengujian sediaan farmasi.',
          'CPL 2: Mahasiswa mampu melakukan pengukuran parameter fisikokimia sesuai standar prosedur operasional.',
          'CPL 3: Mahasiswa mampu menganalisis dan melaporkan data pengujian fisikokimia dengan benar dan objektif.'
        ],
        cpmk: [
          'CPMK-1: Mahasiswa mampu melakukan analisis kuantitatif dengan metode titrasi.',
          'CPMK-2: Mahasiswa mampu melakukan analisis kuantitatif dengan metode spektrofotometri.',
          'CPMK-3: Mahasiswa mampu memvalidasi metode analisis berdasarkan parameter validitas.'
        ],
        subCpmk: [
          'Sub-CPMK1: Melakukan titrasi asam-basa',
          'Sub-CPMK2: Melakukan titrasi redoks',
          'Sub-CPMK3: Melakukan titrasi kompleksometri',
          'Sub-CPMK4: Analisis kuantitatif dengan spektrofotometri UV-Vis',
          'Sub-CPMK5: Membuat kurva kalibrasi dan menentukan linearitas',
          'Sub-CPMK6: Memvalidasi metode: akurasi, presisi, spesifisitas',
          'Sub-CPMK7: Menentukan LOQ dan LOD',
          'Sub-CPMK8: Menyusun laporan validasi metode'
        ],
        deskripsiMK: 'Mata kuliah ini membahas metode analisis kuantitatif meliputi titrasi dan spektrofotometri serta validasi metode analisis untuk pengujian sediaan farmasi.',
        bahanKajian: [
          'Prinsip Analisis Kuantitatif',
          'Metode Titrasi dan Aplikasinya',
          'Analisis Spektrofotometri',
          'Validasi Metode Analisis',
          'Good Laboratory Practice (GLP)'
        ],
        pustakaUtama: [
          'Skoog, D. A. et al. (2024). Principles of Instrumental Analysis. 7th Edition. Cengage.',
          'Armenta, S. et al. (2023). Analytical Chemistry. Springer.'
        ],
        pustakaPendukung: [
          'BP Indonesia. (2024). Farmakope Indonesia Edisi VI.'
        ],
        matakuliahSyarat: 'KIMIA ANALITIK I'
      }
    ]
  }
]

export function getDefaultTemplate(): Record<string, string> {
  return {
    // Identitas
    prodi: '',
    mata_kuliah: '',
    kode_mk: '',
    rumpun_mk: '',
    sks: '',
    semester: '',
    dosen: '',
    semester_akademik: '',
    tgl_penyusunan: '',
    // Otorisasi
    pengembang_rps: '',
    koordinator_rmk: '',
    kaprodi: '',
    // CPL
    cpl: '',
    // CPMK
    cpmk: '',
    // Sub-CPMK
    sub_cpmk: '',
    // Deskripsi
    deskripsi_mk: '',
    // Bahan Kajian
    bahan_kajian: '',
    // Penilaian (flexible JSON)
    penilaian: JSON.stringify([
      { item: 'Kehadiran', bobot: 10 },
      { item: 'Partisipasi', bobot: 5 },
      { item: 'Tugas', bobot: 15 },
      { item: 'UTS', bobot: 30 },
      { item: 'UAS', bobot: 40 },
    ]),
    // Pustaka
    pustaka_utama: '',
    pustaka_pendukung: '',
    // Dosen & Prasyarat
    dosen_pengampu: '',
    matakuliah_syarat: '',
    // Tabel Pertemuan (flexible JSON)
    pertemuan: '[]',
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
  const bahanKajianHtml = mk.bahanKajian.map(b => `<p>• ${b}</p>`).join('')
  const pustakaUtamaHtml = mk.pustakaUtama.map(r => `<p>${r}</p>`).join('')
  const pustakaPendukungHtml = mk.pustakaPendukung.map(r => `<p>${r}</p>`).join('')

  return {
    prodi: prodi.nama,
    mata_kuliah: mk.nama,
    kode_mk: mk.kode,
    rumpun_mk: mk.rumpunMK,
    sks: mk.sks.toString(),
    semester: mk.semester.toString(),
    dosen: '',
    semester_akademik: '',
    tgl_penyusunan: '',
    pengembang_rps: '',
    koordinator_rmk: '',
    kaprodi: '',
    cpl: cplHtml,
    cpmk: cpmkHtml,
    sub_cpmk: subCpmkHtml,
    deskripsi_mk: mk.deskripsiMK,
    bahan_kajian: bahanKajianHtml,
    penilaian: JSON.stringify([
      { item: 'Kehadiran', bobot: 10 },
      { item: 'Partisipasi', bobot: 5 },
      { item: 'Tugas', bobot: 15 },
      { item: 'UTS', bobot: 30 },
      { item: 'UAS', bobot: 40 },
    ]),
    pustaka_utama: pustakaUtamaHtml,
    pustaka_pendukung: pustakaPendukungHtml,
    dosen_pengampu: '',
    matakuliah_syarat: mk.matakuliahSyarat,
    pertemuan: '[]',
  }
}
