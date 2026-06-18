# CONTRIBUTING

## プロジェクト方針

「こおりやまの今」は、郡山市の公開情報をスマートフォンで読みやすくまとめる非公式サイトです。

秒単位の鮮度は追いません。表示の速さ、壊れにくさ、運用コストの低さを優先します。ユーザーがページを開いたときは外部 API を呼ばず、定期ビルドで作った JSON を読みます。

## アーキテクチャ

```txt
scheduled build
  -> scripts/fetch-data.ts
  -> Koriyama Open Data Hub API
  -> public/generated/*.json
  -> Vite build
  -> Cloudflare Workers Static Assets
  -> Browser
```

Cloudflare Workers は Static Assets の配信に使います。Worker API はありません。

```txt
Browser
  -> /generated/*.json
  -> static assets
```

Worker は [src/worker/index.ts](src/worker/index.ts) で `env.ASSETS.fetch(request)` を返すだけです。`/api/config`、KV、feature flag、動的な広告設定は使いません。

## 主要ディレクトリ

```txt
src/frontend/      React アプリ
src/shared/        生成スクリプトとフロントで共有する型、正規化処理
src/worker/        Cloudflare Workers Static Assets 用の最小 Worker
scripts/           生成データ作成・検証スクリプト
public/generated/  ビルド時に生成される JSON
```

## 生成データ

`npm run generate:data` は次のファイルを作ります。

```txt
public/generated/home.json
public/generated/news.json
public/generated/places.json
public/generated/places.geojson
public/generated/search-index.json
public/generated/build-meta.json
```

`changes.json` は作りません。施設情報の更新は、利用者向けには `news.json` の「施設の更新」カテゴリに入れます。

外部 API が失敗しても、既存の generated データがあればそれを残します。このとき `build-meta.json` は `status: "stale"` になります。

## 検索

検索は2層です。

- サイト内検索: `generated/search-index.json` を使うクライアント検索
- 公式サイト検索: Google Programmable Search Engine の Search Element

サイト内検索は、施設とお知らせの両方を対象にします。公式サイト検索は補助機能です。JSON API や API key は使いません。

`VITE_GOOGLE_PSE_CX` が未設定の場合、公式サイト検索タブは表示しません。

## 画面方針

- スマートフォンを最優先にする
- 下部固定ナビは「ホーム」「探す」「地図」「お知らせ」
- トップページは地図から始めない
- `/map` でだけ Leaflet と markercluster を読み込む
- 地点詳細では Google Maps で開くリンクを出す
- ホームの場所カードには Google Maps リンクを出さない
- 非公式サイトであることは Footer と About で示す
- API や内部実装名など、利用者に不要な情報は画面に出さない

## 広告

現在、広告表示は実装していません。広告枠コンポーネントや動的な広告設定もありません。

将来広告を入れる場合は、コンテンツと明確に分け、「広告」ラベルを出してください。地図上、検索フォーム直下、下部固定ナビ近くには置きません。

## セットアップ

```bash
npm install
npm run cf-typegen
npm run generate:data
```

## 開発サーバー

```bash
npm run dev
```

Worker を含めて確認する場合:

```bash
npm run preview
```

## よく使うコマンド

```bash
npm run generate:data
npm run typecheck
npm run build
```

## データ更新

`npm run generate:data` は Koriyama Open Data Hub API からデータを取得し、`public/generated/*.json` を作ります。

生成元 API を差し替える場合は、`UPSTREAM_API_BASE` を指定します。

```bash
UPSTREAM_API_BASE=https://example.com/api/v2 npm run generate:data
```

## CI/CD

GitHub Actions でビルドとデプロイを行います。定期更新のためだけに Worker の Cron Trigger や Deploy Hook は使いません。

`.github/workflows/deploy.yml` は次のタイミングで動きます。

- `master` への push
- 手動実行
- 3時間ごとの cron

処理内容は `npm ci`、`npm run build`、`npx wrangler deploy` です。ビルド時に generated データを作り直し、その成果物を Cloudflare Workers Static Assets にデプロイします。

GitHub Secrets には次を設定してください。

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Pull Request では `.github/workflows/ci.yml` が `npm run build` まで確認します。

## デプロイ

```bash
npm run deploy
```
