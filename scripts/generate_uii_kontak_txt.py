#!/usr/bin/env python3
"""
Generate file uii-kontak-akreditasi.txt untuk ditambahkan ke folder scraped.
File ini berisi info kontak dan akreditasi UII yang sering ditanya tapi
kadang tidak ter-capture dari scraping.

Usage:
    python3 scripts/generate_uii_kontak_txt.py
    # Output: data/uii-kontak-akreditasi.txt
    # Copy ke folder Google Drive UII-Data/scraped sebelum re-index
"""

from pathlib import Path

CONTENT = """# Source: https://www.uii.ac.id/kontak

Kontak Universitas Islam Indonesia (UII)

Alamat:
Gedung GBPH Prabuningrat (Rektorat)
Kampus Terpadu Universitas Islam Indonesia
Jl. Kaliurang km. 14,5 Sleman, Yogyakarta 55584 Indonesia

Telepon: +62 274 898444
Faks: +62 274 898459
Email: info@uii.ac.id

Akreditasi:
Universitas Islam Indonesia telah mendapatkan Akreditasi Institusi Unggul dari Badan Akreditasi Nasional Perguruan Tinggi (BAN-PT) pada tahun 2022. Sebagian besar program studi UII juga terakreditasi Unggul atau A.
"""

def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    out_dir = project_root / "data"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / "uii-kontak-akreditasi.txt"
    out_path.write_text(CONTENT, encoding="utf-8")
    print(f"✅ File dibuat: {out_path}")
    print("   Copy ke folder Google Drive UII-Data/scraped sebelum re-index Pinecone.")

if __name__ == "__main__":
    main()
