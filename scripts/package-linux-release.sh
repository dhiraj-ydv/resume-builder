#!/bin/sh
set -eu

case "${1:-}" in
  x64|arm64) release_arch=$1 ;;
  *) echo "Usage: package-linux-release.sh <x64|arm64>" >&2; exit 1 ;;
esac

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output_dir="$repo_root/dist/linux"
version=$(node -p "require('$repo_root/package.json').version")
archive_name="resume-builder-linux-$release_arch.tar.gz"
work_dir=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/resume-builder-package.XXXXXX")
stage_dir="$work_dir/stage"
trap 'rm -rf -- "$work_dir"' EXIT HUP INT TERM

appimage=$(find "$repo_root/src-tauri/target/release/bundle/appimage" -maxdepth 1 -type f -name '*.AppImage' -print -quit)
if [ -z "$appimage" ] || [ ! -x "$appimage" ]; then
  echo "The Tauri AppImage was not found." >&2
  exit 1
fi

mkdir -p "$stage_dir" "$output_dir"
(
  cd "$work_dir"
  "$appimage" --appimage-extract >/dev/null
)
mv "$work_dir/squashfs-root" "$stage_dir/app"
install -m 755 "$repo_root/scripts/install-linux.sh" "$stage_dir/install-linux.sh"
install -m 644 "$repo_root/src-tauri/icons/128x128@2x.png" "$stage_dir/resume-builder.png"
install -m 644 "$repo_root/LICENSE" "$stage_dir/LICENSE"
install -m 644 "$repo_root/NOTICE" "$stage_dir/NOTICE"
install -m 644 "$repo_root/THIRD-PARTY-NOTICES.md" "$stage_dir/THIRD-PARTY-NOTICES.md"
printf '%s\n' "$version" > "$stage_dir/VERSION"

archive_file="$output_dir/$archive_name"
tar --sort=name --mtime="@${SOURCE_DATE_EPOCH:-0}" --owner=0 --group=0 --numeric-owner \
  -C "$stage_dir" -czf "$archive_file" .
(
  cd "$output_dir"
  sha256sum "$archive_name" > "$archive_name.sha256"
)

echo "Created $archive_file"
