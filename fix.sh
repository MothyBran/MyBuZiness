#!/bin/bash
set -e

echo "🔧 Fix-Skript gestartet ..."

# 0) Sicher: Änderungen committen, damit nichts verloren geht
git add -A
git commit -m "WIP before case-fix" || true

# 1) Neue Branch (optional, kannst du auch direkt auf main mergen)
git switch -c fix/app-folder-case || git checkout -b fix/app-folder-case || true

# 2) Case-Änderung erzwingen (Linux ist case-sensitiv)
git mv app APP_TMP 2>/dev/null || true
git mv App APP_TMP 2>/dev/null || true
git commit -m "temp move to normalize case" || true
git mv APP_TMP app
git commit -m "fix: enforce lowercase app/ for Next App Router" || true

# 3) Prüfen, ob globals.css existiert
mkdir -p app
if [ ! -f app/globals.css ]; then
  cat > app/globals.css <<'CSS'
:root{--color-bg:#0b1220;--color-text:#e5e7eb;--color-primary:#111827;--radius:12px}
*{box-sizing:border-box}
html,body{margin:0;background:var(--color-bg);color:var(--color-text);font-family:system-ui, -apple-system, Segoe UI, Roboto}
.card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:var(--radius)}
CSS
  echo "➡️ globals.css wurde neu erstellt."
fi

# 4) Sicherstellen, dass layout.tsx globals.css importiert
if [ -f app/layout.tsx ]; then
  if ! grep -q 'import "./globals.css"' app/layout.tsx; then
    sed -i '1i import "./globals.css";' app/layout.tsx
    echo "➡️ Import in layout.tsx ergänzt."
  fi
fi

# 5) Anzeigen, ob nur 'app/' existiert
echo "➡️ Repo-Inhalt für app/:"
git ls-tree -r --name-only HEAD | egrep '^(app/|App/)' || true

# 6) Pushen
git push -u origin fix/app-folder-case

echo "✅ Fix abgeschlossen! Erstelle einen PR oder merge direkt in main."
