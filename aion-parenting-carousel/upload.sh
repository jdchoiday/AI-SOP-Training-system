#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# 생성된 슬라이드를 구글드라이브에 업로드한다 (rclone 사용).
#
#   ./upload.sh vn-001-lam-vo-bat
#
# 필요한 환경변수 2개 (GitHub Actions 에서는 Secrets 로 주입된다):
#   RCLONE_CONFIG_GDRIVE_TOKEN  ← rclone authorize "drive" 결과 JSON
#   DRIVE_PARENT_FOLDER_ID      ← 업로드할 상위 폴더 ID
#
# rclone 은 설정파일 없이 환경변수만으로도 동작한다(RCLONE_CONFIG_<remote>_<key>).
# 그래서 토큰을 디스크에 남기지 않는다.
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

TOPIC="${1:-}"
if [ -z "$TOPIC" ]; then
  echo "사용법: ./upload.sh <주제ID>"
  echo "예)     ./upload.sh vn-001-lam-vo-bat"
  exit 1
fi

DIR="out/$TOPIC"
if [ ! -d "$DIR" ]; then
  echo "❌ $DIR 폴더가 없습니다. 먼저 생성하세요:"
  echo "   node build.mjs topics/$TOPIC.json"
  exit 1
fi

: "${RCLONE_CONFIG_GDRIVE_TOKEN:?❌ RCLONE_CONFIG_GDRIVE_TOKEN 이 설정되지 않았습니다 (README의 1회 설정 참고)}"
: "${DRIVE_PARENT_FOLDER_ID:?❌ DRIVE_PARENT_FOLDER_ID 가 설정되지 않았습니다 (README의 1회 설정 참고)}"

export RCLONE_CONFIG_GDRIVE_TYPE=drive
export RCLONE_CONFIG_GDRIVE_SCOPE=drive
export RCLONE_CONFIG_GDRIVE_ROOT_FOLDER_ID="$DRIVE_PARENT_FOLDER_ID"

echo "▶ 업로드: $DIR  →  구글드라이브/$TOPIC/"
rclone copy "$DIR" "gdrive:$TOPIC/" --stats-one-line --stats=5s

echo "✅ 업로드 완료 — 드라이브에서 '$TOPIC' 폴더를 확인하세요."
echo "   팀에게 검토를 요청하려면 해당 폴더를 공유하세요."
