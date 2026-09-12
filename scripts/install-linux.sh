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

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." 2>/dev/null && pwd || true)
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

case "$INSTALL_DIR" in
  "$HOME/.local/lib/resume-builder") ;;
  *) echo "Refusing unexpected installation path: $INSTALL_DIR" >&2; exit 1 ;;
esac

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
    exit 0
  fi
  rm -f -- "$COMMAND_FILE"
  rm -f -- "$DESKTOP_FILE" "$ICON_FILE"
  rm -rf -- "$INSTALL_DIR"
  remove_path_block
  refresh_desktop_database
  echo "Resume Builder was removed. Resume workspaces were not deleted."
}

if [ "${1:-}" = "--uninstall" ]; then
  uninstall_app
  exit 0
fi

if [ "$#" -ne 0 ]; then
  echo "Usage: bash scripts/install-linux.sh [--uninstall]" >&2
  exit 1
fi

for command_name in npm cargo; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

if [ ! -f "$REPO_ROOT/package.json" ] || [ ! -f "$REPO_ROOT/src-tauri/Cargo.toml" ]; then
  echo "Run this installer from a Resume Builder source checkout." >&2
  exit 1
fi

echo "Building Resume Builder from source..."
cd "$REPO_ROOT"
npm ci
npm run desktop:prepare
npm run tauri -- build --no-bundle

BUILD_DIR="$REPO_ROOT/src-tauri/target/release"
BUILD_BINARY="$BUILD_DIR/resume-builder"
if [ ! -x "$BUILD_BINARY" ] || [ ! -d "$BUILD_DIR/app" ] || [ ! -d "$BUILD_DIR/runtime" ]; then
  echo "The Linux build did not produce the expected executable and bundled resources." >&2
  exit 1
fi

install -d "$LOCAL_ROOT/lib" "$BIN_DIR" "$APPLICATIONS_DIR" "$ICON_DIR"

if { [ -e "$COMMAND_FILE" ] || [ -e "$INSTALL_DIR" ]; } && [ ! -f "$INSTALL_MARKER" ]; then
  echo "An unmanaged Resume Builder path already exists; refusing to replace it." >&2
  exit 1
fi

STAGING_DIR=$(mktemp -d "$LOCAL_ROOT/lib/.resume-builder-install.XXXXXX")
BINARY_TEMP=$(mktemp "$BIN_DIR/.resume-builder.XXXXXX")
trap 'rm -rf -- "$STAGING_DIR"; rm -f -- "$BINARY_TEMP"' EXIT HUP INT TERM
install -m 755 "$BUILD_BINARY" "$BINARY_TEMP"
cp -R "$BUILD_DIR/app" "$STAGING_DIR/app"
cp -R "$BUILD_DIR/runtime" "$STAGING_DIR/runtime"
install -m 755 "$REPO_ROOT/scripts/install-linux.sh" "$STAGING_DIR/install-linux.sh"
touch "$STAGING_DIR/.resume-builder-install"

rm -rf -- "$INSTALL_DIR"
mv "$STAGING_DIR" "$INSTALL_DIR"
mv "$BINARY_TEMP" "$COMMAND_FILE"
trap - EXIT HUP INT TERM
install -m 644 "$REPO_ROOT/src-tauri/icons/128x128@2x.png" "$ICON_FILE"

DESKTOP_TEMP=$(mktemp "$APPLICATIONS_DIR/.resume-builder.desktop.XXXXXX")
trap 'rm -f -- "$DESKTOP_TEMP"' EXIT HUP INT TERM
{
  printf '%s\n' '[Desktop Entry]'
  printf '%s\n' 'Type=Application'
  printf '%s\n' 'Name=Resume Builder'
  printf 'Exec="%s"\n' "$COMMAND_FILE"
  printf '%s\n' 'Icon=resume-builder'
  printf '%s\n' 'Terminal=false'
  printf '%s\n' 'Categories=Office;Utility;'
  printf '%s\n' 'StartupNotify=true'
} > "$DESKTOP_TEMP"
chmod 644 "$DESKTOP_TEMP"
mv "$DESKTOP_TEMP" "$DESKTOP_FILE"
trap - EXIT HUP INT TERM

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
echo "Resume Builder installed in $INSTALL_DIR"
echo "Open a new login session, then run: resume-builder"
echo "To uninstall: resume-builder uninstall"
