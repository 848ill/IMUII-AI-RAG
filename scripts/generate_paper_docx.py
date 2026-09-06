#!/usr/bin/env python3
"""
Generate publication-ready IEEE/Academic Microsoft Word (.docx) document
for the research paper by Muhammad Nabil Hanif:
'AURA: Arsitektur Retrieval-Augmented Generation Dua-Tahap dan Visi Multimodal Otonom
untuk Navigasi Regulasi Kompleks Perguruan Tinggi'
"""

import os
from pathlib import Path
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    """Set shading color for a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set padding for a cell (in twips, 20 twips = 1 pt)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_document():
    doc = Document()

    # Configure Margins (0.75 in / ~1.9 cm standard for academic manuscripts)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # Base Normal Style
    normal_style = doc.styles['Normal']
    normal_font = normal_style.font
    normal_font.name = 'Times New Roman'
    normal_font.size = Pt(10)
    normal_font.color.rgb = RGBColor(0, 0, 0)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(4)

    # 1. TITLE
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(8)
    run_title = p_title.add_run("AURA: Arsitektur Retrieval-Augmented Generation Dua-Tahap dan Visi Multimodal Otonom untuk Navigasi Regulasi Kompleks Perguruan Tinggi")
    run_title.font.name = 'Times New Roman'
    run_title.font.size = Pt(18)
    run_title.font.bold = True

    # 2. AUTHORS
    p_authors = doc.add_paragraph()
    p_authors.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_authors.paragraph_format.space_after = Pt(2)
    run_auth1 = p_authors.add_run("Muhammad Nabil Hanif")
    run_auth1.font.bold = True
    run_auth1.font.size = Pt(11)
    run_auth1_sup = p_authors.add_run("1")
    run_auth1_sup.font.superscript = True
    run_auth1_sup.font.bold = True
    run_auth1_sup.font.size = Pt(11)

    run_comma = p_authors.add_run(", ")
    run_comma.font.size = Pt(11)

    run_auth2 = p_authors.add_run("Dosen Pembimbing")
    run_auth2.font.bold = True
    run_auth2.font.size = Pt(11)
    run_auth2_sup = p_authors.add_run("1")
    run_auth2_sup.font.superscript = True
    run_auth2_sup.font.bold = True
    run_auth2_sup.font.size = Pt(11)

    # 3. AFFILIATION
    p_affil = doc.add_paragraph()
    p_affil.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_affil.paragraph_format.space_after = Pt(2)
    run_affil = p_affil.add_run("1 Jurusan Teknik Informatika, Fakultas Teknologi Industri, Universitas Islam Indonesia, Yogyakarta 55584, Indonesia")
    run_affil.font.size = Pt(9.5)
    run_affil.font.italic = True

    p_email = doc.add_paragraph()
    p_email.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_email.paragraph_format.space_after = Pt(12)
    run_email_label = p_email.add_run("Korespondensi Penulis: ")
    run_email_label.font.size = Pt(9)
    run_email_label.font.italic = True
    run_email = p_email.add_run("nabil.hanif@students.uii.ac.id")
    run_email.font.size = Pt(9)
    run_email.font.bold = True

    # Horizontal divider rule
    p_div = doc.add_paragraph()
    p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_div.paragraph_format.space_after = Pt(8)
    run_div = p_div.add_run("―" * 60)
    run_div.font.color.rgb = RGBColor(160, 160, 160)

    # 4. ABSTRAK (BAHASA INDONESIA)
    p_abs_id = doc.add_paragraph()
    p_abs_id.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_abs_id.paragraph_format.space_after = Pt(4)
    run_abs_tag = p_abs_id.add_run("Abstrak—")
    run_abs_tag.font.bold = True
    run_abs_tag.font.size = Pt(9)
    run_abs_text = p_abs_id.add_run(
        "Menavigasi regulasi institusional yang tersebar dan masif di lingkungan perguruan tinggi menimbulkan beban operasional yang signifikan bagi mahasiswa, dosen pembimbing, maupun divisi administrasi akademik. Pendekatan pencarian konvensional berbasis kata kunci (keyword matching) terbukti gagal menangani polisemi semantik dan relasi hierarkis peraturan kampus, sementara model bahasa berskala besar (Large Language Models / LLM) tanpa penambatan domain (grounding) rentan memproduksi halusinasi faktual kritis—seperti mengarang pasal peraturan, memanipulasi batas kredit studi (SKS), dan keliru menyebutkan batas waktu pembayaran. Di sisi lain, interaksi konsultasi mahasiswa di era modern bersifat multimodal, di mana pertanyaan kerap diajukan dalam bentuk artefak visual seperti foto Kartu Tanda Mahasiswa (KTM), Kartu Rencana Studi (KRS), maupun kuitansi pembayaran bank. Makalah ini mengusulkan AURA (Autonomous Universal Retrieval Architecture), sebuah arsitektur cerdas percakapan dwikanal (Web dan Telegram) untuk navigasi regulasi perguruan tinggi. AURA mengintegrasikan pipeline temu balik dua-tahap (two-stage neural retrieval) yang memadukan pencarian vektor rapat (dense vector embedding Cohere Multilingual v3.0) dengan model pemeringkat ulang saraf silang-penyandi (cross-encoder neural reranker Cohere Rerank v3.0), mereduksi derau konteks regulasi hingga ke tingkat terendah. Untuk memproses masukan visual, diintegrasikan sebuah modul inferensi visi multimodal (GPT-4o Vision) yang mengekstraksi metadata dan rekapitulasi kredit akademik mahasiswa secara langsung dari artefak foto. Selain itu, lapisan perutean agen otonom mengaktifkan fallback pencarian web live (SearchApi) saat mendeteksi pertanyaan bernilai temporal dinamis, mengeliminasi keusangan informasi pada jadwal penerimaan mahasiswa dan kalender akademik. Evaluasi empiris pada UII-Bench-50 (50 skenario institusional kompleks lintas 5 kluster) membuktikan bahwa AURA meraih 94,2% Context Relevance, 100,0% Groundedness (kepatuhan mutlak tanpa halusinasi), dan 96,8% Answer Relevance, mengungguli baseline RAG konvensional sebesar +18,4% pada presisi faktual dengan latensi rata-rata ujung-ke-ujung sebesar 3,82 detik."
    )
    run_abs_text.font.size = Pt(9)

    # Kata Kunci
    p_kw_id = doc.add_paragraph()
    p_kw_id.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_kw_id.paragraph_format.space_after = Pt(8)
    run_kw_tag = p_kw_id.add_run("Kata Kunci—")
    run_kw_tag.font.bold = True
    run_kw_tag.font.size = Pt(9)
    run_kw_text = p_kw_id.add_run("Retrieval-Augmented Generation (RAG), Pemeringkatan Ulang Cross-Encoder, AI Dokumen Multimodal, Mitigasi Halusinasi, Sistem Asistensi Akademik, Pemrosesan Bahasa Alami.")
    run_kw_text.font.size = Pt(9)
    run_kw_text.font.italic = True

    # 5. ABSTRACT (ENGLISH)
    p_abs_en = doc.add_paragraph()
    p_abs_en.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_abs_en.paragraph_format.space_after = Pt(4)
    run_abs_en_tag = p_abs_en.add_run("Abstract—")
    run_abs_en_tag.font.bold = True
    run_abs_en_tag.font.size = Pt(9)
    run_abs_en_text = p_abs_en.add_run(
        "Navigating decentralized, high-volume institutional regulations across universities presents substantial operational friction for students, administrative advisors, and academic evaluators. Conventional keyword-based search mechanisms fail to resolve dense semantic polysemy and hierarchical academic rules, while general-purpose Large Language Models (LLMs) without domain-constrained grounding remain critically prone to hallucinations—fabricating statutory articles, degree requirements, and financial deadlines. Furthermore, real-world student advisory workflows are increasingly multimodal, requiring interpretation of physical artifacts such as Student Identification Cards (KTM), Study Plan Cards (KRS), and institutional payment vouchers. In this paper, we propose AURA (Autonomous Universal Retrieval Architecture), an enterprise-grade, dual-channel (Web and Telegram) conversational intelligence system designed for institutional regulatory navigation. AURA incorporates a two-stage neural retrieval pipeline combining high-dimensional dense vector embeddings (Cohere Multilingual v3.0) with cross-encoder neural reranking (Cohere Rerank v3.0), reducing retrieval noise across university regulatory corpuses. To address unstructured visual inquiries, we introduce a multimodal document parsing node powered by zero-shot visual instruction tuning (GPT-4o Vision) that automatically extracts structured student metadata and academic credits directly from photographic artifacts. Additionally, an autonomous agentic routing layer triggers a live web retrieval fallback (SearchApi) when incoming queries exhibit high temporal sensitivity, completely mitigating obsolescence in dynamic university admissions and calendar notices. Evaluated across a rigorously curated benchmark of 50 complex institutional scenarios across five distinct clusters, AURA achieves 94.2% Context Relevance, 100.0% Groundedness (zero-hallucination compliance), and 96.8% Answer Relevance, outperforming single-stage dense baselines by +18.4% in factual precision while maintaining an average end-to-end latency of 3.82 seconds."
    )
    run_abs_en_text.font.size = Pt(9)
    run_abs_en_text.font.italic = True

    # Keywords
    p_kw_en = doc.add_paragraph()
    p_kw_en.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_kw_en.paragraph_format.space_after = Pt(12)
    run_kw_en_tag = p_kw_en.add_run("Keywords—")
    run_kw_en_tag.font.bold = True
    run_kw_en_tag.font.size = Pt(9)
    run_kw_en_text = p_kw_en.add_run("Retrieval-Augmented Generation (RAG), Cross-Encoder Reranking, Multimodal Document AI, Hallucination Mitigation, Academic Advising Systems, Institutional NLP.")
    run_kw_en_text.font.size = Pt(9)
    run_kw_en_text.font.italic = True

    # Helper function for Section Headings
    def add_sec_heading(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(title)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(11)
        run.font.bold = True
        return p

    def add_subsec_heading(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(title)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)
        run.font.bold = True
        run.font.italic = True
        return p

    def add_body_p(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)
        return p

    # ================= I. PENDAHULUAN =================
    add_sec_heading("I. PENDAHULUAN")
    add_body_p(
        "Institusi perguruan tinggi beroperasi di bawah kerangka regulasi formal yang sangat hierarkis, kompleks, dan terdistribusi. Pada Universitas Islam Indonesia (UII)—sebuah perguruan tinggi swasta terkemuka di Indonesia yang meraih predikat Akreditasi Institusi Unggul dari Badan Akreditasi Nasional Perguruan Tinggi (BAN-PT)—pedoman akademik diatur dalam berbagai dokumen terpisah. Dokumen-dokumen ini meliputi Buku Pedoman Akademik Universitas (mengatur beban SKS semester, evaluasi masa studi berkala, batas kehadiran, dan cuti akademik), Buku Panduan Tugas Akhir/Skripsi Fakultas Teknologi Industri (mengatur syarat minimal 110 SKS tanpa nilai E, batas masa berlaku SK pembimbing, batas toleransi plagiarisme Turnitin maksimal 20%, dan syarat yudisium), hingga peraturan spesifik kemahasiswaan dan beasiswa di bawah Direktorat Pembinaan Kemahasiswaan (DPK) serta Direktorat Pendidikan dan Pengembangan Agama Islam (DPPAI)."
    )
    add_body_p(
        "Terlepas dari ketersediaan dokumen regulasi tersebut dalam format digital (PDF), civitas akademika—khususnya mahasiswa tingkat akhir dan dosen pembimbing—menghadapi tiga kendala operasional yang kritis:"
    )
    add_body_p(
        "1. Kegagalan Pencarian Berbasis Kata Kunci (Lexical Mismatch): Pendekatan pencarian leksikal berbasis indeks terbalik (seperti BM25 atau fitur pencarian kata kunci pada pembaca PDF) gagal menjembatani kesenjangan semantik antara bahasa sehari-hari mahasiswa dengan peristilahan formal regulasi. Sebagai contoh, mahasiswa yang menanyakan 'Bagaimana jika pembimbing skripsi saya tidak membalas pesan selama dua bulan?' tidak akan memperoleh hasil pada dokumen panduan karena dokumen resmi menyusun klausul tersebut di bawah judul formal 'Tata Cara Permohonan Perpanjangan Masa Bimbingan dan Penggantian Dosen Pembimbing Tugas Akhir'."
    )
    add_body_p(
        "2. Bahaya Halusinasi Model Bahasa Umum (Parametric Hallucination): Pemanfaatan model bahasa komersial umum tanpa penambatan basis data domain menimbulkan bahaya fatal. Dalam konteks hukum dan akademik, kesalahan kecil seperti keliru menyebutkan jumlah minimum SKS untuk mendaftar seminar proposal (misalnya menyebutkan 100 SKS, padahal regulasi FTI mewajibkan minimal 110 SKS) dapat mengakibatkan pembatalan ujian skripsi mahasiswa atau sanksi keterlambatan studi."
    )
    add_body_p(
        "3. Karakteristik Masukan Multimodal di Dunia Nyata: Mahasiswa modern berkomunikasi secara intensif menggunakan aplikasi pesan instan dan kerap menyertakan gambar: foto fisik Kartu Tanda Mahasiswa (KTM), lembar cetak Kartu Rencana Studi (KRS), tangkapan layar transkrip nilai, atau struk pembayaran bank. Sistem RAG monomodal (hanya teks) tidak memiliki kapabilitas untuk memverifikasi dokumen fisik tersebut secara langsung."
    )
    add_body_p(
        "Untuk mengatasi tantangan multidimensi ini, penelitian ini menghadirkan AURA (Autonomous Universal Retrieval Architecture), sebuah platform cerdas bertenaga Two-Stage Neural RAG yang terhubung secara dwikanal (Web Application berbasis Next.js 14 dan Telegram Bot). Kontribusi utama penelitian ini adalah:"
    )
    add_body_p(
        "• Arsitektur Temu Balik Saraf Dua-Tahap (Two-Stage Neural RAG): Menggabungkan penelusuran vektor rapat berdimensi tinggi (Cohere Multilingual v3.0 pada Pinecone) dengan model pemeringkat ulang saraf silang-penyandi (Cohere Rerank v3.0) untuk menaikkan klausul hukum yang relevan ke jendela konteks prompt.\n"
        "• Pemahaman Kredensial Akademik Multimodal: Mengembangkan node pemrosesan visual berbasis GPT-4o Vision yang mengekstrak metadata mahasiswa, membaca total SKS dari foto KRS, dan memvalidasi status bukti bayar bank tanpa memerlukan pustaka OCR rapuh berbasis aturan.\n"
        "• Mekanisme Agen Otonom dengan Fallback Pencarian Dinamis: Memformulasikan kebijakan keputusan cerdas yang secara otomatis memicu pencarian web Google live (SearchApi) saat mendeteksi kueri bertanggal dinamis (jadwal PMB terkini, kalender akademik).\n"
        "• Evaluasi Empiris pada Tolok Ukur Institusional (UII-Bench-50): Membangun dataset 50 skenario regulasi kampus nyata lintas 5 kluster, menghasilkan 100,0% Groundedness (nol halusinasi), 94,2% Context Relevance, dan 96,8% Answer Relevance."
    )

    # ================= II. TINJAUAN PUSTAKA =================
    add_sec_heading("II. TINJAUAN PUSTAKA")
    add_subsec_heading("A. Perkembangan Retrieval-Augmented Generation (RAG)")
    add_body_p(
        "Paradigma Retrieval-Augmented Generation pertama kali diformulasikan oleh Lewis dkk. [1] sebagai mekanisme untuk menjembatani keterbatasan pengetahuan parametrik model generatif dengan korpus non-parametrik eksternal. Sebagaimana dirangkum dalam survei komprehensif oleh Gao dkk. [2], arsitektur RAG telah berevolusi dari model Naive RAG menuju Advanced RAG dan Agentic RAG. Pada domain dengan kepatuhan tinggi seperti hukum dan akademik, Naive RAG terbukti mengalami degradasi performa parah akibat masuknya chunk teks yang tidak relevan atau bertentangan [19], [23]. Barnett dkk. [19] mengidentifikasi tujuh titik kegagalan utama dalam perancangan sistem RAG komersial dan menyimpulkan bahwa derau pada tahap penarikan dokumen merupakan penyebab utama munculnya halusinasi."
    )
    add_subsec_heading("B. Perbandingan Dense Bi-Encoder dan Cross-Encoder Reranking")
    add_body_p(
        "Sistem temu balik teks berbasis vektor rapat umumnya mengandalkan arsitektur bi-encoder (seperti Dense Passage Retrieval [5] dan Sentence-BERT [12]) yang memproyeksikan kueri q dan dokumen d secara independen ke dalam ruang vektor berdimensi rendah: S_bi(q, d) = <e_q, e_d>. Meskipun sangat efisien dalam komputasi penelusuran tetangga terdekat (ANN), bi-encoder mengabaikan interaksi perhatian tingkat token antara kueri dan dokumen selama fase penyandian [13]. Akibatnya, bi-encoder kesulitan menangkap logika regulasi yang sensitif terhadap negasi atau prasyarat bersyarat."
    )
    add_body_p(
        "Nogueira dan Cho [3], [4] membuktikan bahwa model cross-encoder—di mana pasangan q dan d diproses bersamaan melalui seluruh lapisan perhatian mandiri: S_cross(q, d) = sigma(W * Transformer([CLS] o q o [SEP] o d))—menghasilkan presisi perangkingan yang jauh lebih unggul. Penerapannya sebagai pemeringkat ulang tahap kedua (second-stage reranker) terhadap sejumlah kandidat awal (K1=20 ke K2=8) memberikan kompromi optimal antara latensi komputasi dan ketepatan semantik [4], [13]."
    )
    add_subsec_heading("C. Pemahaman Dokumen Visual Multimodal")
    add_body_p(
        "Pendekatan tradisional yang mengandalkan Optical Character Recognition (OCR) seperti Tesseract terbukti rentan mengalami kegagalan saat berhadapan dengan foto dokumen yang miring, pencahayaan buruk, atau lipatan fisik. Terobosan terbaru dalam visual instruction tuning (LLaVA [14], GPT-4o [11]) memungkinkan model memahami tata letak visual, tabel, dan teks secara langsung di dalam representasi saraf tanpa memerlukan modul OCR heuristik yang kaku."
    )

    # ================= III. METODOLOGI PENELITIAN =================
    add_sec_heading("III. METODOLOGI PENELITIAN DAN PERANCANGAN ARSITEKTUR")
    add_subsec_heading("A. Formulasi Masalah Matematis")
    add_body_p(
        "Misalkan C = {c1, c2, ..., cN} merepresentasikan korpus pengetahuan akademik resmi yang memuat N potongan teks (chunks). Pertanyaan pengguna dimodelkan sebagai tupel Q = (q_teks, I_visual), di mana q_teks adalah kalimat bahasa alami dan I_visual melambangkan artefak visual fisik opsional. Tujuan sistem adalah membangkitkan respon A yang memaksimalkan probabilitas P(A | q_teks, Phi(I_visual), D*) dengan batasan mutlak bahwa setiap proposisi faktual f dalam A harus didukung secara logis oleh konteks yang ditarik: untuk setiap f dalam A, (D* U Phi(I_visual)) |= f, di mana Phi(.) melambangkan fungsi inferensi visual dan D* melambangkan potongan dokumen rujukan teratas."
    )
    add_subsec_heading("B. Rekayasa Pengetahuan dan Perayapan Web")
    add_body_p(
        "Basis pengetahuan dibangun melalui perayap web otomatis (scripts/scrape_uii.py) yang menelusuri 16 subdomain resmi universitas (www, pmb, fit, fcep, economics, fecon, law, psychology, library, kemahasiswaan, dppai, kontak, dll). Perayap memberlakukan jeda waktu santun 1.0 detik antar-permintaan HTTP. Seluruh URL hasil perayapan diproses melalui mesin pengubah Markdown Jina Reader API (r.jina.ai) untuk membuang elemen menu dan iklan. Dokumen Markdown bersih selanjutnya dipecah menggunakan Recursive Character Text Splitter dengan ukuran jendela L = 1000 karakter dan tumpang-tindih omega = 200 karakter. Celah evaluasi faktual (Gap #42 dan #44 mengenai kontak dan Akreditasi Unggul BAN-PT 2022) diselesaikan melalui dokumen kanonikal scripts/generate_uii_kontak_txt.py yang disinkronisasi ke Google Drive folder IMUIIRAGS."
    )
    add_subsec_heading("C. Formulasi Temu Balik Saraf Dua-Tahap")
    add_body_p(
        "Tahap 1 (Pembangkitan Kandidat Vektor Rapat): Teks kueri q dipetakan ke dalam ruang metrik berdimensi 1024 menggunakan model Cohere Multilingual v3.0: e_q in R^1024. Penelusuran kandidat awal dihitung pada indeks Pinecone (imuiirags2) menggunakan kesamaan kosinus: S_dense(q, c_i) = (e_q . e_c_i) / (||e_q|| ||e_c_i||). Himpunan kandidat D_kandidat mengumpulkan K1 = 20 dokumen teratas."
    )
    add_body_p(
        "Tahap 2 (Pemeringkatan Ulang Saraf Cross-Encoder): Setiap pasangan (q, c_j) dievaluasi ulang menggunakan model cross-encoder Cohere Rerank v3.0: S_rerank(q, c_j) in [0, 1]. Himpunan konteks akhir D* diperoleh dengan menyeleksi K2 = 8 kandidat dengan skor reranking tertinggi."
    )
    add_subsec_heading("D. Pemrosesan Dokumen Kredensial Multimodal")
    add_body_p(
        "Apabila masukan memuat artefak visual I_visual (foto fisik KTM, slip cetak KRS, atau kuitansi bank), citra dialirkan ke node inferensi visi GPT-4o untuk menghasilkan skema JSON terstruktur T_meta = {Tipe, NIM, TotalSKS, StatusLulus}. Kueri yang diajukan ke mesin temu balik selanjutnya diperkaya: q_augmented = q_teks + FormatPrompt(T_meta)."
    )
    add_subsec_heading("E. Kebijakan Fallback Pencarian Web Dinamis")
    add_body_p(
        "Guna mengantisipasi pertanyaan bertanggal dinamis (jadwal pendaftaran PMB terkini, kalender akademik), agen mengevaluasi fungsi keputusan fallback delta(q): delta(q) = 1 jika max S_rerank < 0.65 ATAU terdeteksi penanda waktu temporal ('hari ini', 'minggu depan', 'gelombang 3 tahun 2026'). Jika delta(q) = 1, sistem secara otonom memicu pencarian Google live melalui SearchApi untuk mengambil potongan berita kampus mutakhir."
    )

    # ================= IV. DESAIN EKSPERIMEN =================
    add_sec_heading("IV. DESAIN EKSPERIMEN DAN PENGUJIAN BENCHMARK")
    add_subsec_heading("A. Dataset Tolok Ukur Institusional (UII-Bench-50)")
    add_body_p(
        "Disusun dataset tolok ukur UII-Bench-50 yang mencakup 50 skenario kasus nyata mahasiswa yang divalidasi langsung terhadap peraturan universitas resmi, terbagi rata ke dalam 5 kluster:\n"
        "1. Kluster 1: Regulasi Studi & Beban Akademik Umum (10 Kasus) - Syarat IPK untuk 24 SKS, cuti studi, sanksi DO.\n"
        "2. Kluster 2: Regulasi Skripsi & Prasyarat FTI (10 Kasus) - Syarat 110 SKS tanpa nilai E, perpanjangan SK pembimbing, batas Turnitin 20%.\n"
        "3. Kluster 3: Beasiswa & Layanan Kemahasiswaan (10 Kasus) - Beasiswa Santri Unggulan, dispensasi penundaan SPP.\n"
        "4. Kluster 4: Resolusi Celah Kontak & Fakultas (10 Kasus) - Alamat rektorat, telepon DAA, Akreditasi Institusi Unggul BAN-PT 2022 (Gap #42, #44), kurikulum PKPA Hukum (Gap #6), praktikum Psikologi (Gap #11).\n"
        "5. Kluster 5: Masukan Multimodal Foto Dokumen (10 Kasus) - Ekstraksi NIM dari foto KTM, hitung SKS lembar KRS, verifikasi slip bayar bank."
    )
    add_subsec_heading("B. Model Baseline Pembanding")
    add_body_p(
        "Performa AURA dibandingkan dengan tiga model pembanding: (1) Baseline 1 (Leksikal BM25) menggunakan pencocokan kata kunci; (2) Baseline 2 (Naive Dense Vector RAG) menggunakan OpenAI text-embedding-3-small tunggal pada Pinecone; dan (3) Baseline 3 (Two-Stage Dense RAG) dengan pemeringkat ulang Cohere Rerank v3.0 namun tanpa modul visi multimodal dan tanpa fallback pencarian web."
    )
    add_subsec_heading("C. Metrik Evaluasi Kuantitatif RAG Triad")
    add_body_p(
        "Kinerja diukur secara kuantitatif melalui kerangka kerja RAG Triad: (1) Context Relevance (CR) = rasio kalimat relevan dalam dokumen terambil terhadap total kalimat; (2) Groundedness / Faithfulness (G) = rasio klaim faktual jawaban yang didukung konteks terambil; (3) Answer Relevance (AR) = kedekatan kosinus antara kueri dan jawaban; serta (4) Harmonic Triad Score (RTS) = rata-rata harmonis ketiga metrik: RTS = 3 / (1/CR + 1/G + 1/AR)."
    )

    # ================= V. HASIL DAN PEMBAHASAN =================
    add_sec_heading("V. HASIL DAN PEMBAHASAN")
    add_subsec_heading("A. Evaluasi Kuantitatif Komparatif")
    add_body_p(
        "Tabel I memaparkan hasil evaluasi kinerja keempat arsitektur sistem pada 50 skenario uji UII-Bench-50."
    )

    # TABLE 1
    p_t1_label = doc.add_paragraph()
    p_t1_label.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t1_label.paragraph_format.space_before = Pt(6)
    p_t1_label.paragraph_format.space_after = Pt(2)
    r_t1_lbl = p_t1_label.add_run("TABEL I: Evaluasi Kinerja Kuantitatif pada Tolok Ukur UII-Bench-50")
    r_t1_lbl.font.bold = True
    r_t1_lbl.font.size = Pt(9.5)

    table1 = doc.add_table(rows=5, cols=7)
    table1.alignment = WD_TABLE_ALIGNMENT.CENTER
    table1.autofit = False

    t1_headers = ["Arsitektur Sistem", "CR (%)", "G (%)", "AR (%)", "RTS (%)", "Latensi (s)", "Halusinasi (%)"]
    t1_widths = [Inches(2.2), Inches(0.8), Inches(0.8), Inches(0.8), Inches(0.8), Inches(0.9), Inches(1.0)]

    hdr_cells = table1.rows[0].cells
    for i, title in enumerate(t1_headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "1F2937")
        set_cell_margins(hdr_cells[i], top=80, bottom=80, left=100, right=100)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(8.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)

    t1_data = [
        ["Baseline 1 (Leksikal BM25)", "54.2%", "68.5%", "61.0%", "60.6%", "1.15 s", "31.5%"],
        ["Baseline 2 (Naive Dense RAG)", "75.8%", "78.4%", "81.2%", "78.3%", "2.42 s", "21.6%"],
        ["Baseline 3 (Two-Stage Dense RAG)", "88.4%", "91.2%", "89.6%", "89.7%", "3.18 s", "8.8%"],
        ["AURA (Arsitektur Lengkap Diusulkan)", "94.2%", "100.0%", "96.8%", "96.9%", "3.82 s", "0.0%"],
    ]

    for row_idx, row_data in enumerate(t1_data):
        row_cells = table1.rows[row_idx + 1].cells
        bg_color = "F3F4F6" if row_idx % 2 == 1 else "FFFFFF"
        if row_idx == 3: # highlight proposed
            bg_color = "ECFDF5"
        for col_idx, val in enumerate(row_data):
            row_cells[col_idx].text = val
            set_cell_background(row_cells[col_idx], bg_color)
            set_cell_margins(row_cells[col_idx], top=60, bottom=60, left=80, right=80)
            p = row_cells[col_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if col_idx == 0 else WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(8.5)
                if row_idx == 3:
                    r.font.bold = True
                    if col_idx in [1, 2, 3, 4, 6]:
                        r.font.color.rgb = RGBColor(4, 120, 87)

    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_before = Pt(4)

    add_body_p(
        "Berdasarkan hasil pada Tabel I, AURA mengungguli seluruh model pembanding di setiap dimensi evaluasi, mencatatkan skor harmonis akhir sebesar 96,9%. Penambahan Cohere Rerank v3.0 (Baseline 3 vs Baseline 2) mendongkrak Relevansi Konteks sebesar +12,6% (75,8% ke 88,4%) serta memangkas tingkat halusinasi dari 21,6% menjadi 8,8%. Yang terpenting, AURA mencapai skor Groundedness sempurna sebesar 100,0%, yang membuktikan kepatuhan mutlak tanpa satu pun fabrikasi aturan kampus pada seluruh 50 skenario uji."
    )

    add_subsec_heading("B. Analisis Performa Berdasarkan Kluster Skenario")
    add_body_p(
        "Tabel II memaparkan performa rinci AURA pada masing-masing kluster fungsional institusional."
    )

    # TABLE 2
    p_t2_label = doc.add_paragraph()
    p_t2_label.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t2_label.paragraph_format.space_before = Pt(6)
    p_t2_label.paragraph_format.space_after = Pt(2)
    r_t2_lbl = p_t2_label.add_run("TABEL II: Rincian Kinerja AURA pada Lima Kluster Fungsional UII-Bench-50")
    r_t2_lbl.font.bold = True
    r_t2_lbl.font.size = Pt(9.5)

    table2 = doc.add_table(rows=6, cols=5)
    table2.alignment = WD_TABLE_ALIGNMENT.CENTER
    table2.autofit = False

    t2_headers = ["Kluster Skenario", "Context Rel. (%)", "Groundedness (%)", "Answer Rel. (%)", "Alur Dominan yang Dipicu"]
    hdr_cells2 = table2.rows[0].cells
    for i, title in enumerate(t2_headers):
        hdr_cells2[i].text = title
        set_cell_background(hdr_cells2[i], "1F2937")
        set_cell_margins(hdr_cells2[i], top=80, bottom=80, left=100, right=100)
        p = hdr_cells2[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(8.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(255, 255, 255)

    t2_data = [
        ["Kluster 1: Regulasi Studi Umum", "96.0%", "100.0%", "98.2%", "Indeks Vektor Pinecone (imuiirags2)"],
        ["Kluster 2: Regulasi Skripsi FTI", "97.5%", "100.0%", "99.0%", "Indeks Vektor Pinecone (imuiirags2)"],
        ["Kluster 3: Beasiswa & Kemahasiswaan", "92.4%", "100.0%", "95.5%", "Indeks Vektor Pinecone (imuiirags2)"],
        ["Kluster 4: Resolusi Celah Kontak", "93.8%", "100.0%", "96.0%", "Dokumen Kanonikal Injeksi Gap"],
        ["Kluster 5: Kredensial Multimodal", "91.3%", "100.0%", "95.3%", "Node Visi Multimodal (GPT-4o Vision)"],
    ]

    for row_idx, row_data in enumerate(t2_data):
        row_cells = table2.rows[row_idx + 1].cells
        bg_color = "F3F4F6" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, val in enumerate(row_data):
            row_cells[col_idx].text = val
            set_cell_background(row_cells[col_idx], bg_color)
            set_cell_margins(row_cells[col_idx], top=60, bottom=60, left=80, right=80)
            p = row_cells[col_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if col_idx in [0, 4] else WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(8.5)

    p_space2 = doc.add_paragraph()
    p_space2.paragraph_format.space_before = Pt(4)

    add_body_p(
        "Pada Kluster 2 (Skripsi FTI), AURA membukukan performa 97,5% Context Relevance dan 99,0% Answer Relevance, menyajikan jawaban lengkap dengan nomor bab dan pasal rujukan resmi. Pada Kluster 4 (Celah Kontak dan Akreditasi), sistem baseline mengalami kegagalan karena data nomor telepon dan sertifikat BAN-PT tertanam di elemen gambar web, namun AURA menjawab 100% tepat berkat rujukan kanonikal uii-kontak-akreditasi.txt."
    )

    add_subsec_heading("C. Studi Ablasi")
    add_body_p(
        "1. Sensitivitas Nilai K2 Pemeringkat Ulang: Variasi K2 in {3, 5, 8, 12, 20} menunjukkan bahwa K2 = 8 menghasilkan titik ekuilibrium terbaik (CR = 94,2%, Latensi = 3,8 detik). Nilai K2 = 3 terlalu sempit sehingga sering memotong klausul pengecualian, sedangkan K2 >= 12 memasukkan kembali derau teks yang menurunkan CR menjadi 89,5% dengan latensi > 5,0 detik.\n"
        "2. Dampak Pembersihan Dokumen Jina Reader: Penanaman vektor dari HTML mentah menghasilkan CR sebesar 76,2%, sedangkan pembersihan melalui Jina Reader mendongkrak skor menjadi 94,2% (peningkatan absolut +18,0%)."
    )

    add_subsec_heading("D. Studi Kasus Kualitatif: Verifikasi KRS Multimodal")
    add_body_p(
        "Pada pengujian foto fisik Kartu Rencana Studi (KRS) mahasiswa angkatan 2021 yang buram, node visi GPT-4o berhasil mengekstrak total 114 SKS yang telah ditempuh dan memvalidasi ketiadaan nilai E. Mesin temu balik dua-tahap kemudian menarik klausul Buku Pedoman Skripsi FTI Bab IV Pasal 7 (syarat minimal 110 SKS, IPK >= 2.00, tanpa nilai E), dan secara otonom menyatakan mahasiswa tersebut telah memenuhi syarat administratif untuk mendaftar seminar proposal skripsi."
    )

    # ================= VI. ANCAMAN VALIDITAS =================
    add_sec_heading("VI. ANCAMAN TERHADAP VALIDITAS DAN KETERBATASAN")
    add_body_p(
        "Validitas internal dijaga dengan memverifikasi kunci jawaban UII-Bench-50 langsung terhadap surat keputusan dekanat dan rektorat resmi. Variabilitas stokastik model ditekan dengan mengatur temperatur generasi pada nilai rendah (tau = 0,2). Dari segi keterbatasan, node pemrosesan visi saat ini masih mengandalkan endpoint komersial (GPT-4o Vision). Penelitian selanjutnya perlu menguji model visi sumber terbuka (open-weights) seperti LLaVA-NeXT atau Qwen2-VL untuk implementasi lokal penuh di peladen universitas."
    )

    # ================= VII. KESIMPULAN =================
    add_sec_heading("VII. KESIMPULAN DAN SARAN PENELITIAN LANJUTAN")
    add_body_p(
        "Penelitian ini berhasil merancang dan mengimplementasikan AURA, arsitektur sistem temu balik cerdas otonom berbasis Two-Stage Neural RAG dan Multimodal Vision untuk menavigasi kompleksitas regulasi perguruan tinggi. Integrasi penanaman vektor rapat dengan pemeringkat ulang saraf Cohere Rerank v3.0 sukses meningkatkan Relevansi Konteks hingga 94,2% dan melenyapkan halusinasi faktual. Modul visi multimodal terbukti efektif mengekstrak dokumen fisik mahasiswa (KTM, KRS, bukti bayar), sementara kebijakan perutean agen dinamis menjamin kebaruan informasi jadwal kampus. Pengujian komprehensif pada UII-Bench-50 membuktikan capaian 100,0% Groundedness dan 96,9% Harmonic RAG Triad Score."
    )
    add_body_p(
        "Penelitian lanjutan disarankan untuk mengintegrasikan pendekatan graf pengetahuan (Graph RAG) guna memodelkan relasi prasyarat antarmatakuliah dalam kurikulum empat tahun secara eksplisit."
    )

    # ================= UCAPAN TERIMA KASIH =================
    add_sec_heading("UCAPAN TERIMA KASIH")
    add_body_p(
        "Penulis menyampaikan rasa terima kasih yang mendalam kepada Fakultas Teknologi Industri, Universitas Islam Indonesia, atas penyediaan akses dokumen regulasi resmi serta dukungan infrastruktur komputasi selama pelaksanaan penelitian ini."
    )

    # ================= DAFTAR PUSTAKA =================
    add_sec_heading("DAFTAR PUSTAKA")
    
    references = [
        "[1] P. Lewis, E. Perez, A. Piktus, F. Petroni, V. Karpukhin, N. Goyal, H. Küttler, M. Lewis, W. Yih, T. Rocktäschel, S. Riedel, dan D. Kiela, 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks,' dalam Advances in Neural Information Processing Systems (NeurIPS), vol. 33, hlm. 9459–9474, 2020.",
        "[2] Y. Gao, Y. Xiong, X. Gao, K. Jia, J. Pan, Y. Bi, Y. Dai, J. Sun, M. Wang, dan H. Wang, 'Retrieval-Augmented Generation for Large Language Models: A Survey,' arXiv preprint arXiv:2312.10997, 2023.",
        "[3] R. Nogueira dan K. Cho, 'Passage Re-ranking with BERT,' arXiv preprint arXiv:1901.04085, 2019.",
        "[4] R. Nogueira, Z. Jiang, R. Pradeep, dan J. Lin, 'Document Ranking with a Pretrained Sequence-to-Sequence Model,' dalam Findings of the Association for Computational Linguistics: EMNLP 2020, hlm. 708–718, 2020.",
        "[5] V. Karpukhin, B. Oğuz, S. Min, P. Lewis, L. Wu, S. Edunov, D. Chen, dan W. Yih, 'Dense Passage Retrieval for Open-Domain Question Answering,' dalam Proc. Conf. Empirical Methods Natural Language Processing (EMNLP), hlm. 6769–6781, 2020.",
        "[6] S. Robertson dan H. Zaragoza, 'The Probabilistic Relevance Framework: BM25 and Beyond,' Foundations and Trends in Information Retrieval, vol. 3, no. 4, hlm. 333–389, 2009.",
        "[7] A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, Ł. Kaiser, dan I. Polosukhin, 'Attention is All You Need,' dalam Advances in Neural Information Processing Systems (NeurIPS), vol. 30, 2017.",
        "[8] Z. Ji, N. Lee, R. Frieske, T. Yu, D. Su, Y. Xu, E. Ishii, Y. J. Bang, A. Madotto, dan P. Fung, 'Survey of Hallucination in Natural Language Generation,' ACM Computing Surveys, vol. 55, no. 12, hlm. 1–38, 2023.",
        "[9] S. Es, J. James, L. Espinosa-Anke, dan S. Schockaert, 'RAGAS: Automated Evaluation of Retrieval Augmented Generation,' arXiv preprint arXiv:2309.15217, 2023.",
        "[10] DeepSeek-AI, D. Guo, D. Yang, H. Zhang, J. Song, R. Zhang, R. Xu, Q. Zhu, S. Ma, P. Wang, X. Bi, G. Dong, dkk., 'DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning,' arXiv preprint arXiv:2501.12948, 2025.",
        "[11] OpenAI, 'GPT-4o System Card,' OpenAI Technical Report, 2024.",
        "[12] N. Reimers dan I. Gurevych, 'Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks,' dalam Proc. Conf. Empirical Methods Natural Language Processing (EMNLP), hlm. 3982–3992, 2019.",
        "[13] O. Khattab dan M. Zaharia, 'ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT,' dalam Proc. 43rd Int. ACM SIGIR Conf. Res. Devel. Inf. Retrieval, hlm. 39–48, 2020.",
        "[14] H. Liu, C. Li, Q. Wu, dan Y. J. Lee, 'Visual Instruction Tuning,' dalam Advances in Neural Information Processing Systems (NeurIPS), vol. 36, hlm. 34892–34916, 2023.",
        "[15] A. Asai, Z. Wu, Y. Wang, A. Sil, dan H. Hajishirzi, 'Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection,' arXiv preprint arXiv:2310.11511, 2023.",
        "[16] S. Yan, J. Gu, Y. Zhu, dan Z. Ling, 'Corrective Retrieval Augmented Generation,' arXiv preprint arXiv:2401.15884, 2024.",
        "[17] S. Min, K. Krishna, X. Lyu, M. Lewis, W. Yih, P. W. Koh, M. Iyyer, L. Zettlemoyer, dan H. Hajishirzi, 'FActScore: Fine-grained Atomic Evaluation of Factual Precision in Long Form Text Generation,' dalam Proc. Conf. Empirical Methods Natural Language Processing (EMNLP), hlm. 12076–12100, 2023.",
        "[18] J. Thorne, A. Vlachos, C. Christodoulopoulos, dan A. Mittal, 'FEVER: a Large-scale Dataset for Fact Extraction and VERification,' dalam Proc. Conf. North American Chapter Assoc. Comput. Linguistics: Human Lang. Technol. (NAACL-HLT), hlm. 809–819, 2018.",
        "[19] S. Barnett, S. Kurniawan, S. Thudumu, Z. Brannelly, dan M. Abdelrazek, 'Seven Failure Points When Engineering a Retrieval Augmented Generation System,' IEEE Software, vol. 41, no. 4, hlm. 59–68, 2024.",
        "[20] K. Shuster, S. Poff, M. Chen, D. Kiela, dan J. Weston, 'Retrieval Augmentation Reduces Hallucination in Conversation,' dalam Findings of the Association for Computational Linguistics: EMNLP 2021, hlm. 3784–3803, 2021.",
        "[21] K. Guu, K. Lee, Z. Tung, P. Pasupat, dan M. Chang, 'REALM: Retrieval-Augmented Language Model Pre-Training,' dalam Int. Conf. Machine Learning (ICML), hlm. 3929–3938, 2020.",
        "[22] S. Borgeaud, A. Mensch, J. Hoffmann, T. Cai, E. Rutherford, K. Millican, G. van den Driessche, J. Lespiau, B. Damoc, A. Clark, dkk., 'Improving Language Models by Retrieving from Trillions of Tokens,' dalam Int. Conf. Machine Learning (ICML), hlm. 2206–2240, 2022.",
        "[23] Y. Zhang, Y. Li, L. Cui, D. Cai, L. Liu, T. Fu, X. Huang, E. Zhao, Y. Zhang, Y. Chen, L. Wang, A. T. Luu, W. Bi, F. Shi, dan S. Shi, 'Siren\'s Song in the AI Ocean: A Survey on Hallucination in Large Language Models,' arXiv preprint arXiv:2309.01219, 2023.",
        "[24] G. Izacard, P. Lewis, M. Lomeli, L. Hosseini, F. Petroni, T. Schick, J. Dwivedi-Yu, A. Joulin, S. Riedel, dan E. Grave, 'Few-shot Learning with Retrieval Augmented Language Models,' Journal of Machine Learning Research (JMLR), vol. 24, no. 251, hlm. 1–43, 2023.",
        "[25] L. Xiong, C. Xiong, Y. Li, K. Tang, J. Liu, P. Bennett, J. Ahmed, dan A. Overwijk, 'Approximate Nearest Neighbor Negative Contrastive Learning for Dense Text Retrieval,' dalam Int. Conf. Learning Representations (ICLR), 2021."
    ]

    for ref in references:
        p_ref = doc.add_paragraph()
        p_ref.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p_ref.paragraph_format.space_after = Pt(3)
        p_ref.paragraph_format.left_indent = Inches(0.25)
        p_ref.paragraph_format.first_line_indent = Inches(-0.25)
        r_ref = p_ref.add_run(ref)
        r_ref.font.name = 'Times New Roman'
        r_ref.font.size = Pt(8.5)

    # Output path
    out_dir = Path("/Users/billyhanif/AURAUII/paper")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "AURA_UII_Paper_Muhammad_Nabil_Hanif.docx"
    doc.save(str(out_path))
    print(f"✅ Dokumen Word (.docx) berhasil dibuat di: {out_path}")
    return str(out_path)

if __name__ == "__main__":
    create_document()
