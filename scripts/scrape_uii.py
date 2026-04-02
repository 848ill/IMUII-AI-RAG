#!/usr/bin/env python3
"""
UII Website Scraper - Scrape data dari uii.ac.id untuk Knowledge Base chatbot IMUII.
Menjalankan crawl otomatis tanpa perlu memilih halaman manual.

Usage:
    pip install -r scripts/requirements-scraper.txt
    python scripts/scrape_uii.py

Output: UII-Data/scraped/*.txt (default: Google Drive)
"""

import os
import re
import time
import hashlib
import argparse
from pathlib import Path
from typing import Optional, Tuple
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# ============ KONFIGURASI ============
BASE_URL = "https://www.uii.ac.id"
START_URLS = [
    "https://www.uii.ac.id",
    "https://pmb.uii.ac.id",           # Pendaftaran
    "https://www.uii.ac.id/kehidupan-kampus",   # Fasilitas, UKM, kegiatan mahasiswa
    "https://www.uii.ac.id/fasilitas",          # Fasilitas kampus
    "https://www.uii.ac.id/lingkungan-dan-keberlanjutan",
    "https://www.uii.ac.id/sistem-dan-teknologi-informasi",
    "https://fit.uii.ac.id",            # FTI - Fakultas Teknologi Industri (seluruh prodi)
    "https://fcep.uii.ac.id",          # FCEP - Teknik Sipil, Arsitektur
    "https://economics.uii.ac.id",     # FE - Fakultas Ekonomi
    "https://fecon.uii.ac.id",         # FBE - Fakultas Bisnis dan Ekonomi
    "https://library.uii.ac.id",       # Perpustakaan (jam buka, layanan)
    "https://kemahasiswaan.uii.ac.id", # UKM, organisasi mahasiswa, DPK
    "https://dppai.uii.ac.id",         # Kemahasiswaan DPPAI
    "https://psychology.uii.ac.id",    # Fakultas Psikologi (gap evaluasi #11)
    "https://law.uii.ac.id",           # Fakultas Hukum (gap evaluasi #6)
    "https://www.uii.ac.id/kontak",    # Info kontak, telepon, email, akreditasi (gap #42, #44)
]
ALLOWED_DOMAINS = [
    "uii.ac.id", "www.uii.ac.id", "pmb.uii.ac.id", "academic.uii.ac.id",
    "fit.uii.ac.id", "industrial.uii.ac.id", "ee.uii.ac.id", "economics.uii.ac.id", "fecon.uii.ac.id",
    "dppai.uii.ac.id", "fcep.uii.ac.id", "chemical-engineering.uii.ac.id",
    "library.uii.ac.id", "kemahasiswaan.uii.ac.id",
    "psychology.uii.ac.id", "law.uii.ac.id",
]
MAX_PAGES = 300          # Batas halaman (sesuaikan kebutuhan)
MAX_DEPTH = 4            # Kedalaman crawl (0 = hanya start URL)
DELAY_SECONDS = 1        # Jeda antar request (hormati server)
# Default: Google Drive (sesuaikan jika path berbeda)
OUTPUT_DIR = Path("/Users/billyhanif/Library/CloudStorage/GoogleDrive-siberaksi88@gmail.com/My Drive/UII-Data/scraped")
MIN_TEXT_LENGTH = 100    # Skip halaman dengan teks terlalu pendek
# =====================================

# Skip URL yang tidak relevan (gambar, file, dll)
SKIP_PATTERNS = [
    r"\.(pdf|jpg|jpeg|png|gif|doc|docx|xls|xlsx|zip|rar)$",
    r"/wp-content/uploads/",
    r"\.php\?",
    r"#",
    r"mailto:",
    r"tel:",
    r"javascript:",
    r"/tag/",
    r"/author/",
    r"/page/\d+$",       # Pagination (optional: bisa di-enable untuk lebih banyak)
    r"feed",
    r"rss",
    r"login",
    r"logout",
    r"register",
    r"cart",
    r"checkout",
]


def load_scraped_urls(output_dir: Path) -> set:
    """Baca URL yang sudah di-scrape dari file .txt di output_dir (baris '# Source: URL')."""
    scraped = set()
    if not output_dir.exists():
        return scraped
    for f in output_dir.glob("*.txt"):
        try:
            with open(f, "r", encoding="utf-8") as fp:
                first = fp.readline().strip()
                if first.startswith("# Source: "):
                    url = first.replace("# Source: ", "").strip()
                    if url:
                        scraped.add(normalize_url(url))
        except Exception:
            pass
    return scraped


def is_allowed_url(url: str) -> bool:
    """Cek apakah URL boleh di-crawl."""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower().replace("www.", "")
        if not any(d in domain for d in ["uii.ac.id"]):
            return False
        if parsed.path.startswith("/wp-admin") or "/admin" in parsed.path:
            return False
        for pattern in SKIP_PATTERNS:
            if re.search(pattern, url, re.I):
                return False
        return True
    except Exception:
        return False


def normalize_url(url: str) -> str:
    """Normalisasi URL (hapus fragment, trailing slash)."""
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def url_to_filename(url: str) -> str:
    """Convert URL ke nama file yang aman."""
    h = hashlib.md5(url.encode()).hexdigest()[:12]
    path = urlparse(url).path.strip("/") or "index"
    safe = re.sub(r"[^\w\-]", "_", path)[:80]
    return f"{safe}_{h}.txt"


def extract_text(soup: BeautifulSoup) -> str:
    """Ekstrak teks utama dari HTML, buang nav/footer/script."""
    # Buang elemen yang tidak relevan
    for tag in soup.find_all(["script", "style", "nav", "footer", "header", "aside", "form"]):
        tag.decompose()
    # Fokus ke main content
    main = soup.find("main") or soup.find("article") or soup.find("div", class_=re.compile(r"content|main|post", re.I))
    if main:
        body = main
    else:
        body = soup.find("body") or soup
    text = body.get_text(separator="\n", strip=True)
    # Bersihkan whitespace berlebihan
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n\n".join(lines)


def fetch_page(url: str, session: requests.Session) -> Tuple[Optional[str], Optional[str]]:
    """Fetch halaman, return (html, error)."""
    try:
        r = session.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (compatible; IMUII-Bot/1.0; +https://github.com/aurauii)"
        })
        r.raise_for_status()
        r.encoding = r.apparent_encoding or "utf-8"
        return r.text, None
    except Exception as e:
        return None, str(e)


def run_scraper(max_pages: int = MAX_PAGES, max_depth: int = MAX_DEPTH, delay: float = DELAY_SECONDS, output_dir: Optional[Path] = None):
    """Jalankan crawler."""
    out = output_dir or OUTPUT_DIR
    out.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    visited = load_scraped_urls(out)
    if visited:
        print(f"📂 Skip {len(visited)} URL yang sudah di-scrape sebelumnya")
    to_visit = [(u, 0) for u in START_URLS]  # (url, depth)
    scraped = 0
    skipped = 0
    errors = []

    print(f"🚀 UII Scraper dimulai")
    print(f"   Max pages: {max_pages}, Max depth: {max_depth}, Delay: {delay}s")
    print(f"   Output: {out}")
    print("-" * 50)

    while to_visit and scraped < max_pages:
        url, depth = to_visit.pop(0)
        url_norm = normalize_url(url)

        if url_norm in visited:
            skipped += 1
            continue
        if depth > max_depth:
            continue

        visited.add(url_norm)
        time.sleep(delay)

        html, err = fetch_page(url_norm, session)
        if err:
            errors.append((url_norm, err))
            continue

        soup = BeautifulSoup(html, "html.parser")
        text = extract_text(soup)

        # Simpan jika ada konten cukup
        if len(text) >= MIN_TEXT_LENGTH:
            fname = url_to_filename(url_norm)
            out_path = out / fname
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(f"# Source: {url_norm}\n\n")
                f.write(text)
            scraped += 1
            print(f"  [{scraped}] {url_norm[:70]}... ({len(text)} chars)")

        # Cari link untuk crawl
        if depth < max_depth:
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                full_url = urljoin(url_norm, href)
                full_norm = normalize_url(full_url)
                if is_allowed_url(full_url) and full_norm not in visited:
                    to_visit.append((full_norm, depth + 1))

    print("-" * 50)
    print(f"✅ Selesai. {scraped} halaman baru disimpan ke {out}")
    if skipped:
        print(f"   (Skip {skipped} URL yang sudah pernah di-scrape)")
    if errors:
        print(f"⚠️  {len(errors)} error. Cek log di bawah.")
        for u, e in errors[:10]:
            print(f"   - {u}: {e}")

    return scraped


def main():
    parser = argparse.ArgumentParser(description="Scrape data UII untuk Knowledge Base IMUII")
    parser.add_argument("--max-pages", type=int, default=MAX_PAGES, help="Max halaman")
    parser.add_argument("--max-depth", type=int, default=MAX_DEPTH, help="Max kedalaman crawl")
    parser.add_argument("--delay", type=float, default=DELAY_SECONDS, help="Delay antar request (detik)")
    parser.add_argument("--output", "-o", type=str, default=None, help="Folder output (default: data/uii-scraped). Bisa pakai path ke Google Drive.")
    args = parser.parse_args()

    output_dir = Path(args.output) if args.output else OUTPUT_DIR
    run_scraper(max_pages=args.max_pages, max_depth=args.max_depth, delay=args.delay, output_dir=output_dir)


if __name__ == "__main__":
    main()
