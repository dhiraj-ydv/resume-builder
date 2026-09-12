{
  description = "Resume Builder - local-first desktop resume editor";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      eachSystem = nixpkgs.lib.genAttrs systems;
      packageJson = builtins.fromJSON (builtins.readFile ./package.json);
    in
    {
      packages = eachSystem (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        rec {
          default = resume-builder;

          resume-builder = pkgs.rustPlatform.buildRustPackage {
            pname = "resume-builder";
            inherit (packageJson) version;
            src = self;

            cargoRoot = "src-tauri";
            cargoLock.lockFile = ./src-tauri/Cargo.lock;

            npmDeps = pkgs.importNpmLock {
              npmRoot = ./.;
            };

            nativeBuildInputs = with pkgs; [
              importNpmLock.npmConfigHook
              nodejs_22
              pkg-config
              writableTmpDirAsHomeHook
              wrapGAppsHook3
            ];

            buildInputs = with pkgs; [
              glib
              glib-networking
              gtk3
              libayatana-appindicator
              librsvg
              libsoup_3
              libxdo
              openssl
              webkitgtk_4_1
            ];

            buildPhase = ''
              runHook preBuild
              npm run desktop:prepare
              npm run tauri -- build --no-bundle
              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall

              install -Dm755 src-tauri/target/release/resume-builder \
                "$out/bin/resume-builder"
              mkdir -p "$out/lib/resume-builder"
              cp -R src-tauri/target/release/app "$out/lib/resume-builder/app"
              cp -R src-tauri/target/release/runtime "$out/lib/resume-builder/runtime"
              install -Dm644 src-tauri/icons/128x128@2x.png \
                "$out/share/icons/hicolor/256x256/apps/resume-builder.png"

              mkdir -p "$out/share/applications"
              substitute ${./nix/resume-builder.desktop} \
                "$out/share/applications/resume-builder.desktop" \
                --replace-fail "@out@" "$out"

              runHook postInstall
            '';

            preFixup = ''
              gappsWrapperArgs+=(
                --set RESUME_BUILDER_NODE "$out/lib/resume-builder/runtime/node"
                --set RESUME_BUILDER_CLI "$out/lib/resume-builder/app/bin/resume-builder.mjs"
              )
            '';

            doCheck = false;

            meta = with pkgs.lib; {
              description = packageJson.description;
              homepage = "https://github.com/exolithelabs/resume-builder";
              license = licenses.asl20;
              mainProgram = "resume-builder";
              platforms = systems;
            };
          };
        }
      );

      apps = eachSystem (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/resume-builder";
        };
      });

      formatter = eachSystem (system: nixpkgs.legacyPackages.${system}.nixfmt-rfc-style);
    };
}
