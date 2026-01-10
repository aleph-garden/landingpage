{
  description = "Aleph.wiki MCP Server";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "aleph-wiki-mcp-server";
          version = "0.1.0";

          src = ./.;

          nativeBuildInputs = [ pkgs.bun ];

          buildPhase = ''
            # Install dependencies
            bun install --frozen-lockfile

            # Build TypeScript
            bun build src/index.ts --outdir dist --target node
          '';

          installPhase = ''
            mkdir -p $out/bin $out/lib
            cp -r dist/* $out/lib/
            cp -r node_modules $out/lib/

            # Create wrapper script
            cat > $out/bin/aleph-wiki-mcp-server <<EOF
            #!${pkgs.bash}/bin/bash
            exec ${pkgs.bun}/bin/bun $out/lib/index.js "\$@"
            EOF
            chmod +x $out/bin/aleph-wiki-mcp-server
          '';
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            nodejs
          ];
        };
      }
    );
}
