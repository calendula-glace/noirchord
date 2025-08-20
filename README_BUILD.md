# NoirChord データパック v1.0

このフォルダには「NoirChord」の**データ（画像除く）**が一式入っています。

## 配置するだけのもの
- `public/manifest.webmanifest` / `public/service-worker.js` / `public/index.html`
- `data/` 以下の JSON
- 画像（ご用意済み）を以下に配置：
  - `public/icons/icon-192.png`、`public/icons/icon-512.png`
  - `public/mascot/normal.png`、`smile.png`、`idea.png`、`sweat.png`、`sad.png`（すべて128×128）

## GitHub Pages で公開（静的）
1. GitHubで空のリポジトリを作成（例 `noirchord`）。
2. このフォルダの中身をすべてリポジトリ直下にコピーして `main` にコミット。
3. GitHubの Settings → Pages → Branch: `gh-pages`（初回は Actions が作成します）。
   - 同梱の `.github/workflows/gh-pages.yml` が `public/` を公開します。

## 本番アプリと結合
- 後日、React/TS のアプリ本体を `src/` に配置し、Vite ビルドした `dist/` を Pages に公開します。
- その際も `data/` と `public/manifest.webmanifest` はそのまま利用します。
