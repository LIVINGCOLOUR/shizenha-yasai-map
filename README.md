# 自然派やさいマップ

地域で買える自然派野菜と、自然に向き合う農家・販売店・たねをつなぐWebデモです。

自然派やさいマップは、地域で自然派の野菜を買える場所を入口に、農家・販売店・飲食店・たね・自治体をゆるやかにつなぐ構想デモです。

表向きには、一般ユーザーが「地域で自然派の野菜を買える場所を探す地図」。
裏側では、地産地消を促進し、農薬や化学肥料に頼りすぎない農家を応援する地域農業の関係性マップを目指しています。

## デモで見られるもの

- 地域の販売店ページ
- 農家一覧・農家詳細ページ
- たねを見るページ
- 茨城県の在来種・固定種・地域品種の概略マップ
- 農家向けAI機能の将来構想
- 販売店・飲食店向けAI機能の将来構想
- 地域やさいポイントの将来構想

## AI機能について

現在のAI機能は、すべて構想デモです。
実際のAI API連携、チャット、音声入力、フォーム送信、DB保存、QR読み取り、ポイント付与、決済連携はまだ実装していません。

将来的には、以下を想定しています。

- AI聞き取りモード
- AI表現チェック
- AI価値観タグ付け
- AI売り場POP・商品紹介文生成
- AI農家紹介素材生成
- AI仕入れ相談メモ生成
- AI地域農業レーダー
- AI掲載候補ボード

## 注意

掲載している農家・販売店・たね情報には、デモ用・本人確認前・出典確認前の情報が含まれます。
実運用前には、農家本人・店舗・出典元の確認が必要です。

## ローカルでの起動

```powershell
cd C:\Users\HOME\taneto-hatake-map
python -m http.server 8000
```

ブラウザで以下を開きます。

```text
http://localhost:8000/
```

## QA

```powershell
python -m py_compile tools/qa_check.py
python tools/qa_check.py
```

## BootCamp用資料

- [docs/bootcamp_demo_script.md](docs/bootcamp_demo_script.md)
- [reports/final_check_report.md](reports/final_check_report.md)
- [reports/qa_report.md](reports/qa_report.md)
