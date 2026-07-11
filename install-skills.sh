#!/usr/bin/env bash
# install-skills.sh — install the curated Claude Code skills into ~/.claude/skills/
#
# Run this ONCE on each machine. The skills then become available across ALL
# your projects on that machine (they live in your personal ~/.claude/skills/).
#
#   bash install-skills.sh
#
# Sources (all public):
#   - multica-ai/andrej-karpathy-skills  → karpathy-guidelines
#   - bradautomates/claude-video         → watch
#   - obra/superpowers                   → 14 workflow skills
#   - rohitg00/agentmemory               → 8 memory skills (need the agentmemory server to function)
set -euo pipefail

SKILLS_DIR="${HOME}/.claude/skills"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$SKILLS_DIR"
echo "Installing skills into $SKILLS_DIR"
echo

clone() { # clone <repo-url> <tmp-name>
  echo "→ fetching $2 ..."
  git clone --depth 1 --quiet "$1" "$TMP/$2"
}

put() { # put <src-skill-dir> <skill-name>
  rm -rf "${SKILLS_DIR:?}/$2"
  mkdir -p "$SKILLS_DIR/$2"
  cp -R "$1"/. "$SKILLS_DIR/$2/"
  echo "  ✓ $2"
}

# 1) Karpathy guidelines
clone https://github.com/multica-ai/andrej-karpathy-skills.git karpathy
put "$TMP/karpathy/skills/karpathy-guidelines" karpathy-guidelines

# 2) claude-video — SKILL.md + scripts/ live at the repo root
clone https://github.com/bradautomates/claude-video.git claude-video
rm -rf "${SKILLS_DIR:?}/watch"
mkdir -p "$SKILLS_DIR/watch/scripts"
cp "$TMP/claude-video/SKILL.md" "$SKILLS_DIR/watch/SKILL.md"
cp "$TMP/claude-video"/scripts/*.py "$SKILLS_DIR/watch/scripts/"
echo "  ✓ watch  (needs ffmpeg + yt-dlp installed; Whisper API key for caption-less videos)"

# 3) Superpowers — every skill under skills/
clone https://github.com/obra/superpowers.git superpowers
for d in "$TMP"/superpowers/skills/*/; do
  put "$d" "$(basename "$d")"
done

# 4) Agentmemory — every skill under plugin/skills/
clone https://github.com/rohitg00/agentmemory.git agentmemory
for d in "$TMP"/agentmemory/plugin/skills/*/; do
  put "$d" "$(basename "$d")"
done
echo "  ↳ agentmemory skills need the agentmemory MCP server running to actually work."

echo
echo "Done. Installed $(find "$SKILLS_DIR" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ') skills:"
ls -1 "$SKILLS_DIR"
echo
echo "Restart Claude Code (or start a new session) so it picks up newly created skill directories."
