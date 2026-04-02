#!/usr/bin/env python3
"""
Upload folder data/uii-scraped ke Google Drive.
Perlu setup credentials dulu (lihat CARA_UPLOAD_DRIVE.md).

Usage:
    pip install google-api-python-client google-auth
    python scripts/upload_to_drive.py
"""

import os
from pathlib import Path
from typing import Optional

# Path default
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_SOURCE = PROJECT_ROOT / "data" / "uii-scraped"


def upload_to_drive(source_dir: Path, folder_id: Optional[str] = None):
    """Upload semua file di source_dir ke Google Drive."""
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
    except ImportError:
        print("❌ Library belum terpasang. Jalankan:")
        print("   pip3 install google-api-python-client google-auth")
        return False

    # Cari file credentials
    creds_path = PROJECT_ROOT / "scripts" / "google-credentials.json"
    if not creds_path.exists():
        creds_path = PROJECT_ROOT / "google-credentials.json"
    if not creds_path.exists():
        print("❌ File credentials tidak ditemukan.")
        print("   Simpan file JSON dari Google Cloud Console ke:")
        print(f"   {creds_path}")
        print("   Lihat CARA_UPLOAD_DRIVE.md untuk panduan setup.")
        return False

    if not source_dir.exists():
        print(f"❌ Folder tidak ada: {source_dir}")
        print("   Jalankan scraper dulu: npm run scrape")
        return False

    files = list(source_dir.glob("*.txt"))
    if not files:
        print(f"❌ Tidak ada file .txt di {source_dir}")
        return False

    print("🔐 Memuat credentials...")
    creds = service_account.Credentials.from_service_account_file(
        str(creds_path),
        scopes=["https://www.googleapis.com/auth/drive.file"]
    )
    service = build("drive", "v3", credentials=creds)

    # Buat folder di Drive jika folder_id tidak diberikan
    if not folder_id:
        folder_metadata = {
            "name": "UII-Scraped-Data",
            "mimeType": "application/vnd.google-apps.folder"
        }
        folder = service.files().create(body=folder_metadata, fields="id").execute()
        folder_id = folder.get("id")
        print(f"📁 Folder baru dibuat di Drive (ID: {folder_id})")
        print("   Share folder ini ke email kamu agar bisa diakses.")

    uploaded = 0
    for fpath in files:
        try:
            file_metadata = {"name": fpath.name, "parents": [folder_id]}
            media = MediaFileUpload(str(fpath), mimetype="text/plain", resumable=False)
            service.files().create(body=file_metadata, media_body=media, fields="id").execute()
            uploaded += 1
            print(f"  ✓ {fpath.name}")
        except Exception as e:
            print(f"  ✗ {fpath.name}: {e}")

    print(f"\n✅ {uploaded}/{len(files)} file berhasil di-upload ke Google Drive.")
    return True


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Upload scraped data ke Google Drive")
    parser.add_argument("--source", "-s", type=str, default=str(DEFAULT_SOURCE),
                        help="Folder sumber (default: data/uii-scraped)")
    parser.add_argument("--folder-id", "-f", type=str, default=None,
                        help="ID folder Google Drive tujuan (opsional, akan buat folder baru jika kosong)")
    args = parser.parse_args()

    upload_to_drive(Path(args.source), args.folder_id)


if __name__ == "__main__":
    main()
