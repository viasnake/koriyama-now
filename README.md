# Civic Koriyama

郡山市の公開情報を、スマートフォンで読みやすくまとめる地域データメディアです。定期ビルドでデータを取得し、生成済み JSON と React アプリを Cloudflare Workers Static Assets で配信します。

## 構成

- Frontend: Vite + React + TypeScript
- Generated data: `public/generated/*.json`
- Worker API: なし
- Runtime: Cloudflare Workers Static Assets
- Upstream API: `https://civic-koriyama-data.alflag.org/api/v2`

ユーザーがページを開いたとき、フロントエンドは外部 API を呼びません。検索、地図、一覧は `/generated/*.json` を読みます。

開発手順は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。
