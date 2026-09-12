#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
test_root=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/resume-builder-installer-test.XXXXXX")
trap 'rm -rf -- "$test_root"' EXIT HUP INT TERM

fake_home="$test_root/home"
release_dir="$test_root/release"
payload_dir="$test_root/payload"
mkdir -p "$fake_home" "$release_dir" "$payload_dir/app"

printf '#!/bin/sh\nprintf "packaged app %%s\\n" "$1"\n' > "$payload_dir/app/AppRun"
chmod 755 "$payload_dir/app/AppRun"
install -m 755 "$repo_root/scripts/install-linux.sh" "$payload_dir/install-linux.sh"
install -m 644 "$repo_root/src-tauri/icons/128x128@2x.png" "$payload_dir/resume-builder.png"
printf '%s\n' 'test-version' > "$payload_dir/VERSION"

case "$(uname -m)" in
  x86_64|amd64) release_arch=x64 ;;
  aarch64|arm64) release_arch=arm64 ;;
  *) echo "Unsupported test architecture" >&2; exit 1 ;;
esac

archive_name="resume-builder-linux-$release_arch.tar.gz"
tar -C "$payload_dir" -czf "$release_dir/$archive_name" .
(
  cd "$release_dir"
  sha256sum "$archive_name" > "$archive_name.sha256"
)

HOME="$fake_home" RESUME_BUILDER_DOWNLOAD_BASE="file://$release_dir" \
  sh "$repo_root/scripts/install-linux.sh"
"$fake_home/.local/bin/resume-builder" smoke-test | grep -F 'packaged app smoke-test'
test -f "$fake_home/.local/share/applications/resume-builder.desktop"
test -f "$fake_home/.local/share/icons/hicolor/256x256/apps/resume-builder.png"

HOME="$fake_home" RESUME_BUILDER_DOWNLOAD_BASE="file://$release_dir" \
  sh "$repo_root/scripts/install-linux.sh" --update
HOME="$fake_home" sh "$fake_home/.local/lib/resume-builder/install-linux.sh" --uninstall
test ! -e "$fake_home/.local/bin/resume-builder"
test ! -e "$fake_home/.local/lib/resume-builder"

echo "Linux release installer test passed."
