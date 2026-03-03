#!/bin/bash

# --- KONFIGURASI ---

# 1. Ambil Nama Folder Project (Otomatis)
PROJECT_NAME=$(basename "$PWD")

# 2. Tentukan Folder Tujuan
BACKUP_ROOT="../backups"
TARGET_DIR="$BACKUP_ROOT/$PROJECT_NAME"

# 3. Jumlah history yang disimpan
MAX_BACKUPS=5

# 4. Nama File
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILENAME="${PROJECT_NAME}_${TIMESTAMP}.tar.gz"
FULL_PATH="$TARGET_DIR/$BACKUP_FILENAME"

# --- PROMPT BACKUP ---

echo "❓ Apakah Anda ingin membuat folder backup sebelum deploy? (y/n)"
read -r CONFIRM_BACKUP

if [[ "$CONFIRM_BACKUP" =~ ^[Yy]$ ]]; then
    echo "📂 Menyiapkan backup untuk: $PROJECT_NAME"
    
    # 1. Buat struktur folder
    mkdir -p "$TARGET_DIR"

    echo "📂 Lokasi Backup: $TARGET_DIR"
    echo "📦 Sedang mengompres..."

    # 2. Compress (Backup Fisik)
    tar --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='dist' --exclude='.vscode' -czf "$FULL_PATH" .

    # 3. ROTASI (Hapus backup lama)
    cd "$TARGET_DIR" || exit
    ls -t *.tar.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -I {} rm -- "{}" 2>/dev/null
    cd - > /dev/null

    echo "✅ Backup tersimpan rapi!"
else
    echo "⏭️  Melewati proses backup..."
fi

# --- ACTION GIT PUSH ---

echo "🚀 Mengirim ke GitHub/Vercel..."
git add .
COMMIT_MSG="${1:-update $TIMESTAMP}"
git commit -m "$COMMIT_MSG"
git push origin main

echo "🎉 Selesai!"