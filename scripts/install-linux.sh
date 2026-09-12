#!/bin/sh
set -eu

if [ "$(uname -s)" != "Linux" ]; then
  echo "This installer is for Linux only." >&2
  exit 1
fi

if [ -z "${HOME:-}" ]; then
  echo "HOME is not set." >&2
  exit 1
fi

REPOSITORY="exolithelabs/resume-builder"
DOWNLOAD_BASE_DEFAULT="https://github.com/$REPOSITORY/releases/latest/download"
DOWNLOAD_BASE="${RESUME_BUILDER_DOWNLOAD_BASE:-$DOWNLOAD_BASE_DEFAULT}"
LOCAL_ROOT="$HOME/.local"
INSTALL_DIR="$LOCAL_ROOT/lib/resume-builder"
BIN_DIR="$LOCAL_ROOT/bin"
DATA_ROOT="${XDG_DATA_HOME:-$LOCAL_ROOT/share}"
APPLICATIONS_DIR="$DATA_ROOT/applications"
ICON_DIR="$DATA_ROOT/icons/hicolor/256x256/apps"
COMMAND_FILE="$BIN_DIR/resume-builder"
DESKTOP_FILE="$APPLICATIONS_DIR/resume-builder.desktop"
ICON_FILE="$ICON_DIR/resume-builder.png"
PROFILE_FILE="$HOME/.profile"
PATH_MARKER_START="# >>> resume-builder PATH >>>"
PATH_MARKER_END="# <<< resume-builder PATH <<<"
INSTALL_MARKER="$INSTALL_DIR/.resume-builder-install"
DOWNLOAD_DIR=""
STAGING_DIR=""
BACKUP_DIR=""

usage() {
  echo "Usage: install-linux.sh [--update | --uninstall]" >&2
}

cleanup() {
  [ -z "$DOWNLOAD_DIR" ] || rm -rf -- "$DOWNLOAD_DIR"
  [ -z "$STAGING_DIR" ] || rm -rf -- "$STAGING_DIR"
  [ -z "$BACKUP_DIR" ] || rm -rf -- "$BACKUP_DIR"
}

refresh_desktop_database() {
  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$APPLICATIONS_DIR" >/dev/null 2>&1 || true
  fi
  if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q -t "$DATA_ROOT/icons/hicolor" >/dev/null 2>&1 || true
  fi
}

remove_path_block() {
  if [ -f "$PROFILE_FILE" ] && grep -Fq "$PATH_MARKER_START" "$PROFILE_FILE"; then
    sed -i '/^# >>> resume-builder PATH >>>$/,/^# <<< resume-builder PATH <<<$/{d;}' "$PROFILE_FILE"
  fi
}

uninstall_app() {
  if [ ! -f "$INSTALL_MARKER" ]; then
    echo "No installer-managed Resume Builder installation was found in $INSTALL_DIR"
    return 0
  fi

  rm -f -- "$COMMAND_FILE" "$DESKTOP_FILE" "$ICON_FILE"
  rm -rf -- "$INSTALL_DIR"
  remove_path_block
  refresh_desktop_database
  echo "Resume Builder was removed. Resume workspaces were not deleted."
}

download_file() {
  url=$1
  destination=$2
  if command -v curl >/dev/null 2>&1; then
    curl -fL --retry 3 --connect-timeout 15 "$url" -o "$destination"
  elif command -v wget >/dev/null 2>&1; then
    wget -q --https-only --tries=3 -O "$destination" "$url"
  else
    echo "Install curl or wget, then run the installer again." >&2
    exit 1
  fi
}

verify_archive() {
  archive=$1
  checksum_file=$2
  archive_name=$3

  expected=$(awk -v name="$archive_name" '$2 == name || $2 == "*" name { print $1; exit }' "$checksum_file")
  if [ "${#expected}" -ne 64 ]; then
    echo "The published checksum is missing or invalid." >&2
    exit 1
  fi

  if command -v sha256sum >/dev/null 2>&1; then
    actual=$(sha256sum "$archive" | awk '{ print $1 }')
  elif command -v shasum >/dev/null 2>&1; then
    actual=$(shasum -a 256 "$archive" | awk '{ print $1 }')
  else
    echo "A SHA-256 tool (sha256sum or shasum) is required." >&2
    exit 1
  fi

  if [ "$actual" != "$expected" ]; then
    echo "Checksum verification failed; the downloaded archive was not installed." >&2
    exit 1
  fi
}

case "$INSTALL_DIR" in
  "$LOCAL_ROOT/lib/resume-builder") ;;
  *) echo "Refusing unexpected installation path: $INSTALL_DIR" >&2; exit 1 ;;
esac

mode=install
case "${1:-}" in
  "") ;;
  --update) mode=update ;;
  --uninstall) uninstall_app; exit 0 ;;
  *) usage; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64|amd64) release_arch=x64 ;;
  aarch64|arm64) release_arch=arm64 ;;
  *) echo "Unsupported Linux architecture: $(uname -m). Only x86_64 and ARM64 are available." >&2; exit 1 ;;
esac

for command_name in tar awk; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

archive_name="resume-builder-linux-$release_arch.tar.gz"
mkdir -p "$LOCAL_ROOT/lib" "$BIN_DIR" "$APPLICATIONS_DIR" "$ICON_DIR"

if { [ -e "$COMMAND_FILE" ] || [ -e "$INSTALL_DIR" ]; } && [ ! -f "$INSTALL_MARKER" ]; then
  echo "An unmanaged Resume Builder path already exists; refusing to replace it." >&2
  exit 1
fi
if [ -d "$COMMAND_FILE" ] && [ ! -L "$COMMAND_FILE" ]; then
  echo "The command path is a directory; refusing to replace it: $COMMAND_FILE" >&2
  exit 1
fi

DOWNLOAD_DIR=$(mktemp -d "${TMPDIR:-/tmp}/resume-builder-download.XXXXXX")
STAGING_DIR=$(mktemp -d "$LOCAL_ROOT/lib/.resume-builder-install.XXXXXX")
trap cleanup EXIT HUP INT TERM

archive_file="$DOWNLOAD_DIR/$archive_name"
checksum_file="$DOWNLOAD_DIR/$archive_name.sha256"
echo "Downloading Resume Builder for Linux $release_arch..."
download_file "$DOWNLOAD_BASE/$archive_name" "$archive_file"
download_file "$DOWNLOAD_BASE/$archive_name.sha256" "$checksum_file"
verify_archive "$archive_file" "$checksum_file" "$archive_name"

if ! tar -tzf "$archive_file" | while IFS= read -r entry; do
  case "$entry" in
    /*|../*|*/../*|*/..) exit 1 ;;
  esac
done; then
  echo "The release archive contains an unsafe path; nothing was installed." >&2
  exit 1
fi

tar -xzf "$archive_file" -C "$STAGING_DIR"
if [ ! -x "$STAGING_DIR/app/AppRun" ] || [ ! -f "$STAGING_DIR/resume-builder.png" ] || [ ! -x "$STAGING_DIR/install-linux.sh" ]; then
  echo "The release archive is incomplete; nothing was installed." >&2
  exit 1
fi
touch "$STAGING_DIR/.resume-builder-install"

BACKUP_DIR="$LOCAL_ROOT/lib/.resume-builder-backup.$$"
case "$BACKUP_DIR" in
  "$LOCAL_ROOT/lib/.resume-builder-backup."*) ;;
  *) echo "Refusing unexpected backup path: $BACKUP_DIR" >&2; exit 1 ;;
esac
rm -rf -- "$BACKUP_DIR"
if [ -e "$INSTALL_DIR" ]; then
  mv "$INSTALL_DIR" "$BACKUP_DIR"
fi

if mv "$STAGING_DIR" "$INSTALL_DIR"; then
  STAGING_DIR=""
  rm -rf -- "$BACKUP_DIR"
  BACKUP_DIR=""
else
  [ ! -e "$BACKUP_DIR" ] || mv "$BACKUP_DIR" "$INSTALL_DIR"
  BACKUP_DIR=""
  echo "Installation failed; the previous version was restored." >&2
  exit 1
fi

ln -sfn "$INSTALL_DIR/app/AppRun" "$COMMAND_FILE"
install -m 644 "$INSTALL_DIR/resume-builder.png" "$ICON_FILE"

desktop_temp=$(mktemp "$APPLICATIONS_DIR/.resume-builder.desktop.XXXXXX")
{
  printf '%s\n' '[Desktop Entry]'
  printf '%s\n' 'Type=Application'
  printf '%s\n' 'Name=Resume Builder'
  printf 'Exec="%s"\n' "$COMMAND_FILE"
  printf '%s\n' 'Icon=resume-builder'
  printf '%s\n' 'Terminal=false'
  printf '%s\n' 'Categories=Office;Utility;'
  printf '%s\n' 'StartupNotify=true'
} > "$desktop_temp"
chmod 644 "$desktop_temp"
mv "$desktop_temp" "$DESKTOP_FILE"

touch "$PROFILE_FILE"
if ! grep -Fq "$PATH_MARKER_START" "$PROFILE_FILE"; then
  {
    printf '\n%s\n' "$PATH_MARKER_START"
    printf '%s\n' 'case ":$PATH:" in'
    printf '%s\n' '  *":$HOME/.local/bin:"*) ;;'
    printf '%s\n' '  *) PATH="$HOME/.local/bin:$PATH" ;;'
    printf '%s\n' 'esac'
    printf '%s\n' 'export PATH'
    printf '%s\n' "$PATH_MARKER_END"
  } >> "$PROFILE_FILE"
fi

refresh_desktop_database
installed_version=$(sed -n '1p' "$INSTALL_DIR/VERSION" 2>/dev/null || true)
if [ "$mode" = update ]; then
  echo "Resume Builder ${installed_version:-latest} was installed successfully."
else
  echo "Resume Builder ${installed_version:-latest} was installed in $INSTALL_DIR"
fi
echo "Open a new login session if needed, then run: resume-builder"
echo "To update: resume-builder update"
echo "To uninstall: resume-builder uninstall"
