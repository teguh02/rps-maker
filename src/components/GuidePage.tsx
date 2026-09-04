const guideData: Record<string, { title: string; description: string; image?: string }> = {
  cover: {
    title: 'Cover',
    description: `Halaman cover adalah tampilan depan RPS yang berisi informasi umum mata kuliah.

Yang ditampilkan otomatis dari tab Identitas:
• Program Studi
• Mata Kuliah dan Kode
• Semester (Ganjil/Genap)
• Semester Akademik
• Nama Pengembang RPS dan NIDN
• Tanggal Penyusunan

Yang penting diketahui:
• Cover bersifat preview — data diambil langsung dari field yang sudah diisi di tab Identitas
• Jika ada data yang kosong di Cover, lengkapi di tab Identitas terlebih dahulu
• Orientasi halaman cover adalah potrait (vertikal)

Keterkaitan: Cover merangkum identitas mata kuliah secara visual. Semua data yang tampil di Cover berasal dari tab Identitas.`,
    image: '/guides/cover_screenshoot.png',
  },
  identitas: {
    title: 'Identitas Mata Kuliah',
    description: `Bagian ini berisi data identitas lengkap mata kuliah yang menjadi dasar pengisian seluruh RPS.

Yang perlu diisi:
• Program Studi — nama program studi (misal: S1 Farmasi)
• Mata Kuliah — nama mata kuliah
• Kode — kode mata kuliah dari kurikulum
• Rumpun MK — rumpun keilmuan mata kuliah
• SKS Teori (T) — jumlah SKS untuk komponen teori
• SKS Praktik (P) — jumlah SKS untuk komponen praktik
• Semester — Ganjil atau Genap
• Dosen Pengampu — nama dosen yang mengampu mata kuliah ini
• Pengembang RPS — nama dosen yang menyusun RPS (bisa sama dengan dosen pengampu)
• NIDN Pengembang — NIDN dosen pengembang RPS
• Kaprodi — nama Kepala Program Studi
• NIDN Kaprodi — NIDN Kaprodi
• Ketua STIKes — nama Ketua STIKes Ibnu Sina Ajibarang
• NIDN Ketua STIKes — NIDN Ketua STIKes
• Wakil Ketua I — nama Wakil Ketua I Bidang Akademik
• NIDN Wakil Ketua I — NIDN Wakil Ketua I
• Semester Akademik — tahun ajaran (misal: 2025-2026)
• Tanggal Penyusunan — tanggal RPS dibuat

Yang penting diketahui:
• Data di halaman ini akan otomatis terisi ke bagian lain: Cover, Otorisasi, dan Pengesahan (TTD)
• Isi dengan lengkap karena semua field dipakai di export DOCX/PDF

Keterkaitan:
• Cover — menampilkan prodi, mata kuliah, kode, semester, semester akademik, pengembang RPS, dan tanggal
• Otorisasi — menggunakan nama Kaprodi, Koordinator RMK (diisi terpisah di tab Otorisasi)
• Pengesahan (TTD) — menampilkan tanda tangan: Pengembang RPS, Dosen Pengampu, Kaprodi, Wakil Ketua I, dan Ketua STIKes beserta NIDN-nya`,
  },
  otorisasi: {
    title: 'Otorisasi',
    description: `Bagian ini berisi nama-nama penanggung jawab RPS yang akan muncul pada lembar pengesahan.

Yang perlu diisi:
• Koordinator RMK — koordinator rumpun keilmuan yang membina penyusunan RPS

Yang penting diketahui:
• Nama-nama lain (Pengembang RPS, Kaprodi, Ketua STIKes, Wakil Ketua I) sudah diisi di tab Identitas dan akan otomatis muncul di sini

Keterkaitan: Nama-nama dari tab Identitas akan otomatis muncul pada bagian Tanda Tangan Pengesahan (TTD).`,
    image: '/guides/otorisasi_red_sign.png',
  },
  cpl: {
    title: 'Capaian Pembelajaran Lulusan',
    description: `Capaian Pembelajaran Lulusan (CPL) adalah kemampuan yang harus dicapai mahasiswa setelah lulus dari program studi. CPL ditetapkan oleh program studi berdasarkan Kurikulum Nasional dan kebutuhan stakeholder.

Yang perlu diisi:
• Label CPL (misal: CPL-1, CPL-2, dst.)
• Deskripsi — rumusan kemampuan lulusan dalam bentuk kalimat observabel

Yang penting diketahui:
• CPL yang sudah ada dari kurikulum TIDAK BOLEH dihapus
• CPL baru BOLEH ditambahkan jika diperlukan

Keterkaitan: CPL menjadi acuan utama dalam menyusun CPMK. Setiap CPMK harus direlasikan ke CPL tertentu. Semua CPL yang ada harus tercakup dalam CPMK yang Anda buat.`,
    image: '/guides/cpl_red_sign.png',
  },
  cpmk: {
    title: 'Capaian Pembelajaran Mata Kuliah',
    description: `Capaian Pembelajaran Mata Kuliah (CPMK) adalah kemampuan spesifik yang harus dicapai mahasiswa setelah mengikuti mata kuliah ini. CPMK harus terukur dan dapat diverifikasi.

Yang perlu diisi:
• Label CPMK (misal: CPMK-1, CPMK-2, dst.)
• Deskripsi — rumusan capaian dengan KKO Bloom: Mengidentifikasi (C2), Memahami (C2), Menganalisis (C4), Mengevaluasi (C5), Mencipta (C6)

Yang penting diketahui:
• CPMK harus diturunkan dari CPL — setiap CPMK harus terkait minimal satu CPL
• Gunakan kata kerja operasional yang terukur (jangan: "memahami", tapi: "menganalisis")

Keterkaitan: CPMK dipecah menjadi Sub-CPMK untuk distribusi per pertemuan. CPMK juga menjadi dasar penyusunan format penilaian di tab Penilaian.`,
    image: '/guides/cpmk_red_sign.png',
  },
  sub_cpmk: {
    title: 'Sub Capaian Pembelajaran Mata Kuliah',
    description: `Sub-CPMK adalah pemecahan CPMK menjadi unit-unit kecil yang bisa diselesaikan dalam 1-2 pertemuan. Sub-CPMK membantu merencanakan pembelajaran secara bertahap.

Yang perlu diisi:
• Label Sub-CPMK (misal: Sub-CPMK1, Sub-CPMK2, dst.)
• CPMK induk — pilih CPMK mana yang menjadi induk Sub-CPMK ini
• Deskripsi — rumusan capaian yang lebih spesifik dari CPMK induk

Yang penting diketahui:
• Setiap CPMK minimal memiliki 1 Sub-CPMK
• Sub-CPMK harus mencakup seluruh CPMK yang ada — tidak boleh ada CPMK tanpa Sub-CPMK

Keterkaitan: Sub-CPMK menjadi dasar pengisian tab Pertemuan. Anda bisa klik "Generate dari Sub-CPMK" di tab Pertemuan untuk mengisi jadwal otomatis berdasarkan Sub-CPMK yang sudah dibuat.`,
    image: '/guides/sub_cpmk_red_sign.png',
  },
  deskripsi_mk: {
    title: 'Deskripsi',
    description: `Bagian ini berisi deskripsi singkat tentang mata kuliah, mencakup cakupan materi dan relevansinya dengan program studi.

Yang perlu diisi:
• Tuliskan 3-5 kalimat yang menjelaskan:
  – Cakupan materi apa saja yang dipelajari
  – Relevansi mata kuliah dengan program studi
  – Posisi mata kuliah dalam kurikulum (mata kuliah inti/pilihan)

Yang penting diketahui:
• Deskripsi harus ringkas tapi informatif
• Hindari penjelasan terlalu teknis — deskripsi ini untuk gambaran umum

Keterkaitan: Deskripsi merangkum isi mata kuliah secara keseluruhan. Deskripsi ini juga menjadi acuan saat mengisi bahan kajian dan pustaka, karena harus konsisten dengan cakupan materi yang disebutkan.`,
    image: '/guides/deskripsi_singkat_mk.png',
  },
  bahan_kajian: {
    title: 'Bahan Kajian',
    description: `Bahan kajian adalah topik-topik utama yang harus dikuasai mahasiswa dalam mata kuliah ini. Bahan kajian menjadi acuan penyusunan materi perkuliahan.

Yang perlu diisi:
• Tuliskan bahan kajian utama (bisa berupa daftar topik atau uraian singkat)
• Pastikan setiap bahan kajian terkait dengan CPMK/Sub-CPMK yang sudah dibuat

Yang penting diketahui:
• Jumlah bahan kajian sebaiknya disesuaikan dengan jumlah pertemuan
• Bahan kajian harus relevan dan terkini

Keterkaitan: Bahan kajian berhubungan langsung dengan CPMK/Sub-CPMK — setiap bahan kajian harus mendukung pencapaian minimal satu CPMK. Bahan kajian juga menjadi acuan dalam memilih pustaka di tab Pustaka, karena referensi harus mendukung topik yang dipelajari.`,
    image: '/guides/bahan_kajian_red_sign.png',
  },
  penilaian: {
    title: 'Penilaian',
    description: `Bagian ini berisi format penilaian yang digunakan untuk menilai pencapaian CPMK/Sub-CPMK mahasiswa.

Yang perlu diisi:
• Item penilaian (misal: Tugas, Quiz, UTS, UAS, Presentasi, dll.)
• Bobot masing-masing item (dalam persen)
• Pastikan total bobot = 100%

Yang penting diketahui:
• IKU 7: minimal 50% penilaian harus berupa asesmen partisipatif (tugas, presentasi, diskusi, dll.)
• Format penilaian fleksibel sesuai kebutuhan mata kuliah

Keterkaitan: Setiap item penilaian sebaiknya diasosiasikan dengan CPMK/Sub-CPMK tertentu. Misal, Tugas 1 menilai CPMK-1, UTS menilai CPMK-1 s/d CPMK-3, dst. Ini memastikan semua CPMK terukur melalui penilaian.`,
    image: '/guides/penilaian_red_sign.png',
  },
  pustaka: {
    title: 'Pustaka',
    description: `Bagian ini berisi daftar referensi buku dan sumber belajar yang digunakan dalam mata kuliah ini.

Yang perlu diisi:
• Pustaka Utama — minimal 2 buku wajib yang menjadi acuan utama
• Pustaka Pendukung — buku atau sumber tambahan (jurnal, website, dll.)

Yang penting diketahui:
• Referensi harus terkini (preferensi 5 tahun terakhir)
• Gunakan format sitasi yang konsisten (APA, IEEE, atau sesuai ketentuan program studi)
• Sertakan informasi lengkap: pengarang, judul, penerbit, tahun, edisi

Keterkaitan: Pustaka harus mendukung bahan kajian yang sudah diisi. Setiap bahan kajian seharusnya memiliki minimal satu referensi yang relevan. Pustaka juga menjadi acuan saat mahasiswa mencari sumber belajar tambahan.`,
    image: '/guides/pustaka_red_sign.png',
  },
}

export const guideSections = Object.keys(guideData)

interface GuidePageProps {
  section: string
  onBack: () => void
}

export function GuidePage({ section, onBack }: GuidePageProps) {
  const guide = guideData[section]
  if (!guide) return null

  return (
    <div className="guide-page">
      <div className="guide-page-header">
        <button onClick={onBack} className="guide-page-back">&larr; Kembali</button>
        <h2 className="guide-page-title">{guide.title}</h2>
      </div>
      <div className="guide-page-content">
        <p className="guide-page-desc">{guide.description}</p>
        {guide.image && <img src={guide.image} alt={guide.title} className="guide-page-image" />}
        <div className="guide-page-reference">
          <p className="guide-page-reference-label">Referensi:</p>
          <p className="guide-page-reference-text">RENCANA PEMBELAJARAN SEMESTER (RPS) GENAP</p>
          <p className="guide-page-reference-text">TAHUN AKADEMIK 2025-2026</p>
          <p className="guide-page-reference-text">BIOFARMASETIKA (SF555)</p>
          <p className="guide-page-reference-text">PRODI S1 FARMASI</p>
        </div>
      </div>
    </div>
  )
}
