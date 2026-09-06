# 📋 AURA UII — Next Milestones & Thesis Defense To-Do List

Dokumen ini adalah daftar tugas resmi (*task checklist & reminder*) untuk penyelesaian 100% platform **AURA UII** menuju Sidang Skripsi (Teknik Informatika FTI UII).

---

## 🎯 Status Proyek Saat Ini: 90% Siap (Production Ready)
* [x] **Frontend Web Workspace**: Agency-grade brutalist UI, Three.js 60 FPS WebGL, responsive full-viewport.
* [x] **Hosting & Deployment**: Vercel Edge Singapore (`https://imuii-ai-rag.vercel.app/`).
* [x] **Database & Auth**: Supabase PostgreSQL, Google OAuth 2.0, Admin `hambaAllah`/`Takbir`, 1-Click Mode Demo Sidang.
* [x] **Scraper Pipeline**: Script crawling 16 subdomain UII (`scrape_uii.py`), Google Drive Sync (`IMUIIRAGS`), gap resolver (#42, #44, #6, #11).
* [x] **n8n Workflows**: `FuturaProof001A_v2` (Ingestion/Jina Reader) & `FuturaProof001B` (Telegram Trigger, Multimodal Vision GPT-4o, SearchApi).
* [x] **PRD Mutakhir (v3.0.0)**: Dokumentasi arsitektur, rumusan skripsi, skema database, dan standar evaluasi.

---

## 🚀 5 Target Kerja Selanjutnya (Action Items)

### [ ] Target 1: Verifikasi Live Pipeline Web $\leftrightarrow$ n8n Webhook
* **Prioritas**: High
* **Tujuan**: Memastikan chat di web produksi (`https://imuii-ai-rag.vercel.app/`) langsung mendapatkan balasan cerdas dari workflow n8n (bukan fallback offline).
* **Checklist Tugas**:
  - [ ] Periksa dan pastikan Environment Variable `N8N_WEBHOOK_BASE_URL` di Vercel mengarah ke URL n8n aktif (VPS / tunnel publik).
  - [ ] Uji coba kirim pesan dari browser: verifikasi waktu respon $< 5$ detik.
  - [ ] Pastikan respons memuat teks terstruktur dan sitasi dokumen resmi UII.

---

### [ ] Target 2: Re-Indexing & Validasi Vektor Pinecone (`imuiirags2`)
* **Prioritas**: High
* **Tujuan**: Memastikan semua data scraping terbaru (16 subdomain + file kontak & akreditasi) sudah ter-vektorisasi penuh di Pinecone.
* **Checklist Tugas**:
  - [ ] Pastikan file `data/uii-kontak-akreditasi.txt` dan file `.txt` hasil scraping ada di Google Drive folder `IMUIIRAGS` (`1l_GfI6NnC4Q32ZnvBCS0DXMoTU2GXr65`).
  - [ ] Jalankan eksekusi workflow `FuturaProof001A_v2` di n8n untuk mengonversi ke Markdown via Jina Reader dan upsert ke Pinecone.
  - [ ] Verifikasi jumlah total vektor di Pinecone dashboard (`imuiirags2`).

---

### [ ] Target 3: Eksekusi 50 Benchmark Kasus Uji *(Data Bab 4 Skripsi)*
* **Prioritas**: High / Academic Core
* **Tujuan**: Menghasilkan data empiris pengujian RAG Triad untuk dimasukkan langsung ke naskah skripsi Bab 4 (Hasil dan Pembahasan).
* **Checklist Tugas**:
  - [ ] Siapkan daftar 50 kueri uji (10 Regulasi Umum, 10 Skripsi FTI, 10 Beasiswa, 10 Celah Evaluasi Fakultas/Kontak, 10 Multimodal Foto).
  - [ ] Jalankan pengujian dan rekam hasil per kueri:
    - [ ] Nilai **Context Relevance** (Target $\ge 90\%$)
    - [ ] Nilai **Groundedness / Faithfulness** (Target $100\%$ anti-halusinasi)
    - [ ] Nilai **Answer Relevance** (Target $\ge 95\%$)
    - [ ] Latensi rata-rata (Target $< 5$ detik)
  - [ ] Susun tabel rekapitulasi data hasil evaluasi dalam format siap salin ke skripsi Word / LaTeX.

---

### [ ] Target 4: Pengujian Kasus Khusus Multimodal Visi (Foto Dokumen)
* **Prioritas**: Medium
* **Tujuan**: Membuktikan keunggulan sistem dalam membaca dokumen fisik mahasiswa (KTM, slip KRS, struk pembayaran).
* **Checklist Tugas**:
  - [ ] Uji kirim foto Kartu Tanda Mahasiswa (KTM) via Telegram / Web: verifikasi ekstraksi NIM dan angkatan.
  - [ ] Uji kirim foto lembar KRS: verifikasi perhitungan otomatis SKS dan kesimpulan kelayakan seminar proposal (110 SKS).
  - [ ] Uji kirim foto bukti bayar bank: verifikasi deteksi pembayaran angsuran SPP.

---

### [ ] Target 5: Penyusunan "Demo Defense Kit" (Skenario Demonstrasi Sidang)
* **Prioritas**: Final Stage / Defense Preparation
* **Tujuan**: Menyiapkan alur demonstrasi 5–7 menit di hadapan dosen penguji agar sidang skripsi berjalan meyakinkan.
* **Checklist Tugas**:
  - [ ] Skenario 1: Kueri jebakan aturan skripsi (membuktikan AI tidak halusinasi).
  - [ ] Skenario 2: Kueri kontak rektorat & akreditasi BAN-PT (membuktikan keunggulan gap resolution).
  - [ ] Skenario 3: Kueri pendaftaran dinamis minggu berjalan (membuktikan fitur live search SearchApi).
  - [ ] Skenario 4: Upload foto dokumen akademik (membuktikan keunggulan visi multimodal).
  - [ ] Skenario 5: Simulasi bila internet kampus mati (menunjukkan ketangguhan 1-Klik Mode Demo Sidang).

---
*Catatan: Dokumen ini diperbarui secara berkala seiring berjalannya progres implementasi dan evaluasi.*
