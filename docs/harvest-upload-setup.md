# 収穫動画の登録・公開セットアップ

QR（ガシャッパ通信）から開く収穫動画と、農園プロフィールの「最近の収穫動画」は、
同じ公開ソースから配信されます。動画は管理ページ（`harvest-admin.html`）から
アップロードし、Cloudflare R2 に保存されます。

## 全体の流れ

```
harvest-admin.html（公開）
  → POST /api/harvest-upload
    → R2 に動画を保存し、harvest/records.json を更新
QR → harvest-video.html?farmer=yamada-nouen
  → GET /api/harvest-records（無ければ static の data/harvest-records.json）
    → 動画URL /api/harvest-media/... を再生
    → 再生後に農園プロフィールへ遷移
```

## 必要なファイル（実装済み）

- `functions/api/harvest-upload.js` … 動画アップロード＋記録更新
- `functions/api/harvest-records.js` … 記録一覧の取得
- `functions/api/harvest-media/[[path]].js` … R2 からの動画/画像配信（Range対応）
- `wrangler.toml` … R2 バインディング `HARVEST_BUCKET`

## Cloudflare 側の設定

1. R2 バケットを作成する
   ```
   npx wrangler r2 bucket create shizenha-yasai-harvest
   ```
   （バケット名を変える場合は `wrangler.toml` の `bucket_name` も合わせる）

2. Pages プロジェクトに R2 バインディングを設定する
   - Cloudflare ダッシュボード → Pages → 対象プロジェクト → Settings → Functions → R2 bindings
   - Variable name: `HARVEST_BUCKET`
   - R2 bucket: `shizenha-yasai-harvest`
   - 本番(Production)とプレビュー(Preview)の両方に追加する

3. デプロイする（このリポジトリを Pages に接続している場合は push で自動デプロイ）

## ローカルでの動作確認（Functions込み）

ローカルの `python -m http.server` では Functions（/api/...）は動きません。
Functions を含めて確認するには Wrangler を使います。

```
npx wrangler pages dev . --r2 HARVEST_BUCKET
```

- これで `http://localhost:8788/harvest-admin.html` から公開を試せます。
- R2 はローカルにエミュレートされます（ローカル専用の保存）。

## 使い方（公開）

1. `harvest-admin.html` を開く
2. 投稿日・収穫動画（必要ならポスター画像・ひとこと）を選ぶ
3. 「この内容を公開する」を押す
4. QRページ（`harvest-video.html?farmer=yamada-nouen`）と
   農園プロフィールの「最近の収穫動画」に反映される

同じ農家・同じ日付で公開し直すと、その日の動画は新しいものに置き換わります。

## QRコード

- 印刷用: `assets/qr/harvest-yamada.png`
- 宛先URL: `https://shizenha-yasai-map.pages.dev/harvest-video.html?farmer=yamada-nouen`
- 日付を指定しない場合、その農家の最新の公開動画を再生します。
  特定日に固定したい場合は `&date=2025-06-16` のように付与します。

## 注意

- ログイン・権限管理は未実装です（公開URLを知っていれば誰でも投稿可能）。
  本番運用前に認証を追加してください。
- 動画は最大200MB。再生の安定する mp4 形式を推奨します。
- 静的な `data/harvest-records.json` は、クラウド未設定時のフォールバック（種データ）です。
