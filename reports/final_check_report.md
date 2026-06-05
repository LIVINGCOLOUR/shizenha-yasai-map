# Final Check Report

## 実施した確認

- 全HTMLページの存在確認
- 全HTMLページの共通ナビゲーション順確認
- HTML内のローカル `href` / `src` 参照ファイル存在確認
- `data/farmers.json` / `data/places.json` / `data/seeds.json` の構文確認
- データ件数確認
  - 農家: 2件
  - 販売店: 3件
  - たね: 9件
- `seeds.json` の `lat` / `lng` 欠落確認
- 表記ゆれ・危険寄り表現の静的検索
- `farmer.html?id=model-nouen` の互換表示確認
- Chromeでのローカルサーバー経由表示確認
- Consoleエラー確認
- PC表示での横崩れ確認
- 390px幅での簡易確認
- 構想デモ・AIデモ・農家詳細アクションのモーダル確認

## 修正したファイル

- `js/main.js`
  - `farmer.html?id=model-nouen` でも匿名モデル農家詳細が表示されるよう、IDエイリアスを追加。
- `seeds.html`
  - BootCampデモ順に沿って、農家さん向けページへの控えめな導線を追加。
- `for-farmers.html`
  - 販売店・飲食店向けページへの控えめな導線を追加。
- `business.html`
  - マイページの地域やさいポイント構想への控えめな導線を追加。
- `mypage.html`
  - この活動についてページへの控えめな導線を追加。

## 作成したファイル

- `tools/qa_check.py`
  - 標準ライブラリだけで動く静的QAスクリプト。
- `reports/qa_report.md`
  - `python tools/qa_check.py` の実行結果。
- `docs/bootcamp_demo_script.md`
  - BootCamp用デモ手順書。
- `reports/final_check_report.md`
  - この最終確認レポート。

## QA結果

- `python -m py_compile tools/qa_check.py`: OK
- `python tools/qa_check.py`: OK
- QAエラー: 0
- QA警告: 0
- Chrome Consoleエラー: 0
- ローカルリンク切れ: なし

## Chrome確認結果

ローカル静的サーバー経由で以下を確認しました。

- `http://localhost:8000/`
- `http://localhost:8000/places.html`
- `http://localhost:8000/farmers.html`
- `http://localhost:8000/farmer.html?id=yamada-nouen`
- `http://localhost:8000/farmer.html?id=model-nouen`
- `http://localhost:8000/seeds.html`
- `http://localhost:8000/for-farmers.html`
- `http://localhost:8000/business.html`
- `http://localhost:8000/municipality.html`
- `http://localhost:8000/farmer-network.html`
- `http://localhost:8000/mypage.html`
- `http://localhost:8000/about.html`
- `http://localhost:8000/map.html`

確認結果:

- 販売店カード3件: OK
- 農家カード2件: OK
- やまだ農園詳細: OK
- 匿名モデル農家詳細: OK
- たねカード9件: OK
- 地図ピン9件: OK
- 構想デモモーダル: OK
- AIプロフィール下書きデモモーダル: OK
- 農家詳細アクションモーダル: OK
- PC表示の横崩れ: なし
- 390px幅の大きな横崩れ: なし

## 残課題

- `map.html` は旧来の地域マップとして残っています。リンク切れではないため削除していませんが、BootCamp後に役割整理してもよいです。
- `seeds.html` の地図は外部地図ライブラリではなく、茨城県全域の概略座標表示です。Leafletや国土地理院タイル連携は将来対応です。
- AI機能、地域やさいポイント、QR、ログイン、DB保存、問い合わせ送信、決済連携はすべて未実装です。
- 農家・販売店・たね情報はデモ用/本人確認前のものを含みます。実運用前に本人確認と出典確認が必要です。

## BootCamp前に人間が目視確認すべき点

- トップページの第一印象が「地域で買える野菜を探す入口」として伝わるか。
- 販売店ページが一般ユーザーにとって入りやすいか。
- 農家詳細の本人確認前・デモ表示ラベルが十分に伝わるか。
- たねページがマニアックすぎず、差別化要素として自然に見えるか。
- AI構想が「動いている機能」ではなく「将来構想」として伝わるか。
- 地域やさいポイントが実際に付与されるように見えないか。
- BootCamp会場のPC画面サイズで見出しやカードの余白が自然か。

## Netlifyデプロイ前の注意点

- 静的HTML/CSS/JavaScriptのみなので、基本的にはそのまま配信可能です。
- `file://` 直開きではJSON fetchが失敗するため、NetlifyなどのHTTP配信環境で確認してください。
- 外部リンクは出典元のURL変更・公開状態を再確認してください。
- 画像ファイルが大きめなので、公開前に必要に応じて圧縮を検討してください。
- AI、ポイント、QR、ログイン、DB保存、問い合わせ送信、決済連携は未実装であることを説明文に残してください。
