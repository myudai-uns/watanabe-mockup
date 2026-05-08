# 渡辺謄写堂 業務管理システム Bubble.io 実装指示書【完全版 v1.0】

_Source: Notion page `34ce3f5163568165b631d7e4650d527f`_

> 📘 本書は渡辺謄写堂 業務管理システム（Phase 1）をBubble.ioで実装するための完全な指示書です。データベース設計、Option Sets、Reusable Elements、各ページ設計、ワークフロー、API、Privacy、初期データ投入まで網羅。手を動かす順番通りに進めれば完成します。



- **前提資料: **要件定義書v0.1 / Bubble仕様書v0.1 / Functional Mockup v0.2
- **モックアップURL: **[https://myudai-uns.github.io/watanabe-mockup/](https://myudai-uns.github.io/watanabe-mockup/)
- **対象読者: **Bubble.io実装担当エンジニア
- **想定工数: **約80〜120時間（週1名フルタイムで2〜3週間）


# 第1部 プロジェクト初期セットアップ

## 1.1 Bubble プラン要件

> ⚠️ 最低でもGrowthプラン必須（API Workflows、Multiple Environments、カスタムドメインのため）。本番ではProfessional/Productionプランを推奨。

| **項目** | **要件** | **備考** |
| --- | --- | --- |
| プラン | Growth以上 | Backend Workflow、複数環境、Private APIキー |
| ワークフロー実行枠 | 月間50,000〜 | リマインド系スケジュール含む |
| カスタムドメイン | オプション | 例: system.toshado.jp |
| SSL | 自動 | Bubble標準 |

## 1.2 新規アプリ作成

1. Bubble Dashboard → 「New App」
1. App name: 「watanabe-toshado-system」
1. App type: Web app
1. Template: Blank
1. Plan: Growth
## 1.3 Settings初期設定

### 1.3.1 Settings → General

- App title: 渡辺謄写堂 業務管理システム
- App description: 印刷会社の受注・見積・工場進捗・納品を一元管理
- Favicon: 「謄」字オレンジ背景（後でアップロード）
- Default timezone: Asia/Tokyo (UTC+9)
- Page load experience: Standard
### 1.3.2 Settings → Languages

- Primary language: Japanese (ja)
- Additional languages: English (en) — 将来の拡張用
- All static text via App Text (日本語デフォルト値)
### 1.3.3 Settings → Domain/email

- Custom domain: system.toshado.jp（先方でDNS設定後）
- Redirect home page: /login
- Emails from name: 渡辺謄写堂
- Emails from address: noreply@toshado.jp
### 1.3.4 Settings → Privacy & Security

- SSL redirect: Yes（強制）
- Password complexity: Min 8 chars, mixed
- Prevent brute-force attacks: Yes
- Restrict editing to allowed emails: No（社外共有なし）
### 1.3.5 バージョン管理

- Development Version: 日常開発
- Test Version: 渡辺様UAT用
- Live Version: 本番（2026-09-01予定）
> 💡 毎週金曜18:00にDev→Testへデプロイ、隔週月曜Test→Liveが運用ルール案。

# 第2部 プラグインインストール

> 🔌 下記プラグインをすべてインストール。有料プラグインは☆で示す。

| **プラグイン名** | **用途** | **料金** | **優先度** |
| --- | --- | --- | --- |
| Air Date/Time Picker | 日付入力UI強化 | 無料 | 必須 |
| PDF Conjurer | 受注票・見積書のPDF生成 | ☆$9/mo | 必須 |
| SendGrid | メール送信（見積書添付・リマインド） | SendGrid APIキー要 | 必須 |
| Toolbox | Expression評価・カスタムJS | 無料 | 必須 |
| CSV Creator | 受注一覧・顧客一覧のエクスポート | 無料 | 必須 |
| 1T - CSV Uploader | 用紙マスタ・顧客マスタの一括インポート | ☆$5/mo | 必須 |
| File Downloader | PDF・JSONダウンロードトリガー | 無料 | 必須 |
| Rich Text Editor | メモ・備考欄の装飾 | 無料 | 推奨 |
| Ionic Icons / Font Awesome | アイコン一覧 | 無料 | 推奨 |
| Drag & Drop (MVP) | カンバンDnD | 無料 | 必須 |
| Multi Dropdown | 複数選択UI（加工オプション等） | 無料 | 推奨 |
| BDK Native | モバイル対応は不要なのでスキップ | — | 不要 |

## 2.1 SendGrid設定（必須）

1. SendGridアカウント作成（無料枠: 100通/日）
1. Domain Authentication を toshado.jp で完了
1. API Key発行（Full Access）
1. Bubble SendGrid plugin → API Key貼付
1. 送信元アドレス・名前を設定
## 2.2 PDF Conjurer設定

1. プラグイン導入後、設定で「Japanese font support: Yes」
1. Font: Noto Sans JP（Google Fonts経由で自動読込）
1. デフォルト用紙: A4、余白: 20mm
# 第3部 デザインシステム（Styles）

> 🎨 Styles → 新規追加で下記を登録。全UIで共通利用することでデザインの一貫性を保つ。

## 3.1 カラーパレット

| **Style名** | **HEX** | **用途** |
| --- | --- | --- |
| Color/Brand | #E87825 | 主ボタン・アクセント |
| Color/Brand-Dark | #B85D16 | ボタンhover |
| Color/Brand-Light | #FFF4EC | ボタン背景・サマリーカード |
| Color/OK | #3F9D5E | 成功・完成ステータス |
| Color/OK-Light | #E8F5EE | カード背景 |
| Color/Warning | #FBBF24 | 作業中ステータス |
| Color/Danger | #EF4444 | 削除ボタン・納期アラート |
| Color/Blue | #3B82F6 | 出荷待ち・情報 |
| Color/Ink-900 | #1A1A1A | 見出し・ヘッダー |
| Color/Ink-700 | #3A3A3A | サブヘッダー |
| Color/Ink-500 | #707070 | キャプション |
| Color/Ink-300 | #B5B5B5 | ボーダー |
| Color/BG | #F3F4F6 | ページ背景 |
| Color/Card | #FFFFFF | カード・フォーム背景 |

## 3.2 Text Styles

| **Style名** | **Font** | **Weight** | **Size** | **Line-height** | **Color** |
| --- | --- | --- | --- | --- | --- |
| Text/H1 | Noto Sans JP | 900 Black | 28px | 1.2 | Ink-900 |
| Text/H2 | Noto Sans JP | 700 Bold | 20px | 1.3 | Ink-900 |
| Text/H3 | Noto Sans JP | 700 Bold | 16px | 1.4 | Ink-900 |
| Text/Body | Noto Sans JP | 400 Regular | 14px | 1.6 | Ink-900 |
| Text/Body-Bold | Noto Sans JP | 700 Bold | 14px | 1.6 | Ink-900 |
| Text/Small | Noto Sans JP | 400 Regular | 12px | 1.4 | Ink-700 |
| Text/Caption | Noto Sans JP | 700 Bold | 11px | 1.3 | Ink-500 |
| Text/Mono | Roboto Mono | 400 Regular | 12px | 1.3 | Ink-900 |
| Text/Button | Noto Sans JP | 700 Bold | 14px | 1 | White |

## 3.3 Button Styles

| **Style名** | **背景** | **文字色** | **Border** | **Padding** | **Radius** |
| --- | --- | --- | --- | --- | --- |
| Btn/Primary | Brand | White | なし | 10px 20px | 6px |
| Btn/Primary-Hover | Brand-Dark | White | なし | 10px 20px | 6px |
| Btn/Secondary | White | Ink-900 | 1px Ink-300 | 10px 20px | 6px |
| Btn/Ghost | transparent | Ink-700 | なし | 8px 16px | 4px |
| Btn/Danger | White | Danger | 1px Ink-300 | 10px 20px | 6px |
| Btn/Success | OK | White | なし | 10px 20px | 6px |
| Btn/Sm | 継承 | 継承 | 継承 | 6px 12px | 4px |

## 3.4 Input Styles

- **Input/Default: **Border 1px Ink-300 / Radius 4px / Padding 8px / Font Body
- **Input/Focus: **Border 1px Brand / 外枠シャドウ Brand-Light
- **Input/Error: **Border 1px Danger
- **Dropdown: **Inputと同じ形状
- **Checkbox: **Brand色 when checked
## 3.5 Spacing / Sizing

- Gap-XS: 4px
- Gap-SM: 8px
- Gap-MD: 12px
- Gap-LG: 16px
- Gap-XL: 24px
- Page padding: 24px
- Card padding: 16px
- Header height: 96px（上段48px + ナビ48px）
- Sidebar width: 208px
- Container max-width: 1440px（中央寄せ）
# 第4部 データベース設計

> 🗄️ Data → Data Types で下記を定義。フィールド名は英語snake_case、Data Type名はPascalCase。

## 4.1 Data Types 一覧

| **Data Type** | **概要** | **件数想定（5年）** |
| --- | --- | --- |
| User | システム利用者 | 10名 |
| Customer | 顧客 | 500〜1000件 |
| Paper | 用紙マスタ | 100件 |
| Order | 受注（案件） | 5000件 |
| OrderItem | 受注明細 | 10000件 |
| Quote | 見積書 | 3000件 |
| FactoryRecord | 工場進捗記録（1 Order = 1 FR） | 5000件 |
| ChangeLog | 変更履歴 | 50000件（要古いデータ削除運用） |
| PriceRule | 定型品計算ルール | 30件 |

## 4.2 User（Bubble標準拡張）

| **Field** | **Type** | **Default** | **必須** | **備考** |
| --- | --- | --- | --- | --- |
| email | text |  | ◯ | Bubble標準 |
| name | text |  | ◯ | 氏名（例: 渡辺 修一） |
| role | UserRole (Option Set) | A_統括 | ◯ | 権限別動作の分岐に使用 |
| is_active | yes/no | yes | ◯ | 退職者はno |
| last_login_at | date | Current date/time (on login) |  |  |

## 4.3 Customer

| **Field** | **Type** | **Default** | **必須** | **備考** |
| --- | --- | --- | --- | --- |
| company_name | text |  |  | 法人の場合 |
| individual_name | text |  |  | 個人の場合（片方必須） |
| customer_type | CustomerType (Option Set) | 地域 | ◯ | お得意様/地域 |
| area | Area (Option Set) | 市街 | ◯ | 亀谷・元町等 |
| phone | text |  |  |  |
| fax | text |  |  |  |
| email | text |  |  |  |
| address | text |  |  |  |
| postal_code | text |  |  |  |
| notes | text (long) |  |  | 備考 |
| is_active | yes/no | yes | ◯ |  |
| created_by | User | Current User | ◯ |  |
| created_date | date | Current date/time | ◯ |  |

- **Display Name (表示用): **Expression: This Customer's company_name:defaulting to This Customer's individual_name
## 4.4 Paper

| **Field** | **Type** | **Default** | **必須** | **備考** |
| --- | --- | --- | --- | --- |
| paper_name | text |  | ◯ | 表示用 |
| quality | text |  | ◯ | コート/上質/フミス等 |
| color | text | 白 | ◯ |  |
| thickness_kg | number | 90 | ◯ | 135等 |
| paper_size | PaperSize (Option Set) | A4 | ◯ |  |
| unit_price | number | 0 | ◯ | 1枚あたり単価 |
| is_major | yes/no | no | ◯ | メジャー紙ドロップダウン先頭表示 |
| is_active | yes/no | yes | ◯ |  |
| display_order | number | 100 |  | 並び順 |

## 4.5 Order（受注）

| **Field** | **Type** | **Default** | **必須** | **備考** |
| --- | --- | --- | --- | --- |
| order_number | text | Backend WF生成 | ◯ | YYMMDD-NNN |
| customer | Customer |  | ◯ |  |
| received_date | date | Current date | ◯ | 受付日 |
| received_by | User | Current User | ◯ |  |
| reception_method | ReceptionMethod (OS) | 電話 | ◯ |  |
| delivery_type | DeliveryType (OS) | single | ◯ | single/range/asap |
| delivery_date_start | date |  | ◯※ | asap時は不要 |
| delivery_date_end | date |  |  | range時のみ |
| total_amount | number | 0 | ◯ | 税込合計（WF自動計算） |
| subtotal | number | 0 | ◯ | 税抜 |
| tax_amount | number | 0 | ◯ |  |
| status | OrderStatus (OS) | 受注 | ◯ |  |
| memo | text (long) |  |  | フリーメモ |
| items | List of OrderItem | empty list | ◯ | 明細（1件以上） |
| created_by | User | Current User | ◯ |  |
| created_date | date | Current date/time | ◯ |  |
| modified_date | date | Current date/time | ◯ | 更新のたびに上書き |
| is_deleted | yes/no | no | ◯ | 論理削除 |

## 4.6 OrderItem（受注明細）

| **Field** | **Type** | **Default** | **必須** | **備考** |
| --- | --- | --- | --- | --- |
| parent_order | Order |  | ◯ | 親への逆参照（検索用） |
| line_no | number | 1 | ◯ | 表示順 |
| paper | Paper |  |  | 未選択＝その他 |
| paper_other_memo | text |  |  | その他選択時 |
| quantity | number | 1 | ◯ | 部数 |
| ink_pattern | InkPattern (OS) | カラー両面 | ◯ |  |
| folding | FoldingType (OS) | なし | ◯ |  |
| mishin_count | number | 0 | ◯ | 0/1/2 |
| hole_position | HolePosition (OS) | なし | ◯ |  |
| print_direction | PrintDirection (OS) | 天乗 | ◯ |  |
| numbering_enabled | yes/no | no | ◯ |  |
| numbering_from | number |  |  |  |
| numbering_to | number |  |  |  |
| yacho_style | yes/no | no | ◯ | 野鳥式 |
| lamination | yes/no | no | ◯ |  |
| unit_price | number | 0 | ◯ | 算出 |
| subtotal | number | 0 | ◯ | 算出 |
| item_notes | text |  |  | 明細メモ |

## 4.7 Quote（見積書）

| **Field** | **Type** | **Default** | **必須** | **備考** |
| --- | --- | --- | --- | --- |
| quote_number | text | Backend WF生成 | ◯ | Q-YYMMDD-NNN |
| order | Order |  | ◯ | 1:1 |
| customer | Customer | order's customer | ◯ | 冗長保持（検索高速化） |
| issued_date | date | Current date | ◯ |  |
| valid_until | date | Current date+1 month月末 | ◯ |  |
| total_amount | number | order's total_amount | ◯ |  |
| send_method | SendMethod (OS) | メール | ◯ |  |
| pdf_file | file |  |  | 生成済PDF |
| status | QuoteStatus (OS) | 作成中 | ◯ |  |
| memo | text (long) | 振込先情報等 |  |  |
| sent_at | date |  |  | 送信時刻 |
| created_by | User | Current User | ◯ |  |

## 4.8 FactoryRecord（工場進捗）

| **Field** | **Type** | **Default** | **必須** | **備考** |
| --- | --- | --- | --- | --- |
| order | Order |  | ◯ | 1:1 |
| factory_status | FactoryStatus (OS) | 待機 | ◯ |  |
| started_at | date |  |  | 印刷開始 |
| completed_at | date |  |  | 完成 |
| actual_quantity | number |  |  | 実出来高 |
| factory_memo | text (long) |  |  |  |
| completed_by | User |  |  | C担当 |

## 4.9 ChangeLog（変更履歴）

| **Field** | **Type** | **Default** | **必須** | **備考** |
| --- | --- | --- | --- | --- |
| target_type | text |  | ◯ | Order/Quote/OrderItem等 |
| target_id | text |  | ◯ | Bubble unique id |
| target_order | Order |  |  | 検索高速化用 |
| changed_by | User | Current User | ◯ |  |
| changed_at | date | Current date/time | ◯ |  |
| change_summary | text |  | ◯ | 人間向け要約 |
| change_detail | text (long) |  |  | 詳細JSON（将来の差分表示用） |
| change_scope | ChangeScope (OS) | 全体 |  |  |

## 4.10 PriceRule（計算ルール）

| **Field** | **Type** | **Default** | **必須** | **備考** |
| --- | --- | --- | --- | --- |
| rule_name | text |  | ◯ | 例: 名刺カラー両面 |
| paper | Paper |  | ◯ |  |
| ink_pattern | InkPattern (OS) |  | ◯ |  |
| quantity_tier_1 | number | 100 | ◯ | 100枚基準 |
| tier_1_price | number |  | ◯ |  |
| quantity_tier_2 | number | 500 |  |  |
| tier_2_price | number |  |  |  |
| quantity_tier_3 | number | 1000 |  |  |
| tier_3_price | number |  |  |  |
| is_active | yes/no | yes | ◯ |  |

# 第5部 Option Sets

> 🎯 Data → Option Sets で下記を定義。Attribute付きでロジックを埋め込む。

## 5.1 UserRole

- **Attributes: **display_label (text), permission_level (number)
| **Option** | **display_label** | **permission_level** |
| --- | --- | --- |
| A_統括 | A - 統括 | 10 |
| B_製版 | B - 製版 | 5 |
| C_工場 | C - 工場 | 5 |
| 経理 | 経理 | 3 |

## 5.2 CustomerType

| **Option** | **display_label** | **badge_color** |
| --- | --- | --- |
| お得意様 | お得意様 | Brand |
| 地域 | 地域 | Ink-300 |

## 5.3 Area

- 亀谷 / 元町 / 東和 / 岩代 / 市街 / その他
> 📍 初期段階で6種類。後で渡辺様より正式リスト受領。Attribute不要のシンプルOption。

## 5.4 ReceptionMethod

- 電話 / 来客 / FAX / メール / LINE / その他
## 5.5 DeliveryType

| **Option** | **display_label** |
| --- | --- |
| single | 指定日 |
| range | 期間 |
| asap | 出次第 |

## 5.6 InkPattern ★重要

- **Attributes: **display_label (text), multiplier (number)
| **Option** | **display_label** | **multiplier** |
| --- | --- | --- |
| 4Cx4C | カラー両面（4C×4C） | 1.00 |
| 4Cx0 | カラー片面（4C×0） | 0.65 |
| 1Cx1C | モノクロ両面（1C×1C） | 0.45 |
| 1Cx0 | モノクロ片面（1C×0） | 0.30 |
| tokushoku_2m | 特色1色両面 | 0.55 |
| tokushoku_1m | 特色1色片面 | 0.38 |

> 🧮 multiplierは用紙単価に乗じて小計計算に使用。後で渡辺様から正式単価を受領して調整。

## 5.7 FoldingType / HolePosition / PrintDirection

- FoldingType: なし / 2つ折 / 3つ折
- HolePosition: なし / 天2ケ / 左2ケ / その他
- PrintDirection: 天乗 / 左乗
## 5.8 PaperSize

- A3 / A4 / A5 / B3 / B4 / B5 / 名刺 / 変形（その他）
## 5.9 OrderStatus

- **Attributes: **display_label (text), color_hex (text), order_sequence (number)
| **Option** | **display_label** | **color_hex** | **order_sequence** |
| --- | --- | --- | --- |
| 受注 | 受注 | #E5E7EB | 1 |
| 製版中 | 製版中 | #60A5FA | 2 |
| 印刷中 | 印刷中 | #FBBF24 | 3 |
| 完成 | 完成 | #3F9D5E | 4 |
| 納品済 | 納品済 | #1A1A1A | 5 |
| キャンセル | キャンセル | #EF4444 | 99 |

## 5.10 FactoryStatus

- 待機 / 作業中 / 完成 / 出荷待ち
## 5.11 QuoteStatus

- 作成中 / 発行済 / 受諾 / 失注
## 5.12 SendMethod

- 郵送 / メール / LINE / 直接手渡し
## 5.13 ChangeScope

- 全体 / 帳簿のみ / 受注票のみ
# 第6部 Privacy Rules（権限制御）

> 🔒 各Data Type → Privacy タブで設定。ログインユーザーのroleに応じた可視性を定義。

## 6.1 共通ロール定義

- 管理者 (A_統括): 全操作可
- 製版担当 (B_製版): 担当案件の閲覧・限定更新
- 工場担当 (C_工場): 担当案件の閲覧・FactoryRecord更新
- 経理: 閲覧のみ（Phase 1では限定的）
## 6.2 User

- Condition: Current User's role is A_統括 → すべて
- それ以外 → email/name/roleのみ閲覧可、is_activeで絞り込み
## 6.3 Customer

- すべてのログインユーザー → 全件閲覧可
- A_統括のみ → 変更・削除可
## 6.4 Order

- すべてのログインユーザー → 閲覧可
- A_統括 → すべての操作可
- B_製版 / C_工場 → status変更可能（限定ワークフロー経由）
- is_deleted=yesのレコードは非表示（管理者除く）
## 6.5 OrderItem / FactoryRecord / Quote / ChangeLog

- 親OrderのPrivacyに従う（Order閲覧権がある=子も閲覧可）
## 6.6 Paper / PriceRule

- すべてのログインユーザー → 閲覧可
- A_統括のみ → 変更可
> 💡 実装時: Option Set UserRole attributeのpermission_levelを使い、Current User's role's permission_level > X で判定するとシンプル。

# 第7部 Reusable Elements

> 🧩 Reusable Elements から下記を作成。全ページで使い回すことで一貫性を保つ。

## 7.1 Header（グローバルヘッダー）

- サイズ: 幅100% / 高さ48px
- 背景: Ink-900 / 文字: white
- 構成: 左（ロゴ+アプリ名）、中央（空）、右（ユーザ名+Menu+ログアウト）
- 要素:
-   - Image (logo): 36x36, Brand背景に「謄」文字
-   - Text: 「渡辺謄写堂」/「業務管理システム」（2段）
-   - Group/Dropdown (ユーザメニュー): Current User's name表示
-   - Button: 「ログアウト」→ Log the user out WF
## 7.2 NavBar（ページ遷移バー）

- サイズ: 幅100% / 高さ48px / Ink-700背景
- 要素: Link×6（①ダッシュボード、②受注一覧、③新規起票、⑥工場、⑦顧客、その他）
- Conditional: Current page is X → background: Brand, text: bold
- Link属性: destination = internal page
## 7.3 SideNav（左サイドバー）

- サイズ: 幅208px / 高さ100%（vh-96px）
- 背景: Color/Card
- 構成:
-   - セクション1: ダッシュボード / 受注 / 新規受注 / 顧客 / 工場
-   - 区切り線
-   - セクション2: 用紙マスタ / 設定（Ink-500表示）
-   - ヘルプカード: Brand-Light背景
## 7.4 StatusBadge（ステータスバッジ）

- **入力: **Option Set（OrderStatus or FactoryStatus）
- **サイズ: **Auto-fit / Padding 2px 8px / Radius 4px
- **背景色: **Conditional: Text's status is X → background: status's color_hex
- 表示: Option Set's display_label
## 7.5 OrderFormGroup（受注票入力フォーム）

- 新規作成(/order_new) と 編集(/order?id=X) で共用
- Custom States:
-   - draft_customer (Customer)
-   - draft_items (List of OrderItem)
-   - editing_order (Order) — 編集時のみ
- 構成ブロック:
-   ① 受付情報ヘッダー+入力4項目（顧客/受付日/受付者/受付方法）
-   ② 納期選択（Radio + Date Picker）
-   ③ 明細リスト（Repeating Group → OrderItemRow）
-   ④ 「+ 明細を追加」ボタン
-   ⑤ フリーメモ（MultilineInput）
## 7.6 OrderItemRow（明細行）

- 親Groupのdraft_items[this row's index]を編集
- 要素:
-   - Dropdown (用紙): Major papers → Others を optgroup風に
-   - Input number (数量)
-   - Dropdown (インク): InkPattern
-   - Text (小計): 算出値表示
-   - 加工オプショングループ（Checkbox×6 + Dropdown × 数個）
-   - Input (明細メモ)
-   - 削除ボタン（index > 0のみ表示）
## 7.7 PaperSelector（用紙選択UI）

- Dropdown: Do a search for Papers（is_active=yes、sort: is_major desc, display_order asc）
- Display: paper_name + ' @¥' + unit_price + '/枚'
- 「その他（自由入力）」オプション追加 → 選択時、下にText Input表示
## 7.8 CustomerSelector（顧客選択UI）

- Dropdown + 「+ 新規」ボタン
- 新規クリック → CustomerRegisterModal起動
- 登録完了時のCustom event → draft_customerに設定
## 7.9 CustomerRegisterModal

- Popup / 幅560px / 中央表示
- 入力: 会社名、個人名、種別、地域、電話、住所、メモ
- Validation: 会社名か個人名のどちらか必須
- Save WF: Create Customer → Custom event「customer_created」をtrigger
## 7.10 KanbanCard（工場カンバンカード）

- Draggable=yes, data-order-id保持
- 構成: 受注番号 / 顧客名 / 数量 / 納期 / ステータスバッジ
- Conditional: 納期 <= Today+1 → 赤字「本日/明日納期」
- Border-left: 4px ステータス色
## 7.11 ConfirmModal

- 汎用確認ダイアログ
- Custom States: message (text), callback_event (text)
- 使い方: ConfirmModal A's message = '削除しますか？' → Show → OKボタンclickでcallback_eventをtrigger
## 7.12 ToastNotification

- 画面右下フロート / 3秒自動消去
- Custom States: message, type (ok/err/info)
- Background Workflow: Schedule custom event after 3s → Hide
# 第8部 ページ設計

> 📄 各ページのURL、パラメータ、要素配置、ワークフローを個別に定義。

## 8.1 /login

### ページ設定

- URL: /login
- Exposed in URL: なし
- Page is removed if URL is accessed when logged in: Yes → /index へリダイレクト
### 要素配置

- 中央カード（幅420px）
-   - ロゴ（謄） 80x80
-   - Title: 渡辺謄写堂 業務管理システム
-   - Input/Email
-   - Input/Password
-   - Checkbox: ログイン状態を保持
-   - Button/Primary: ログイン
-   - Link: パスワードを忘れた方
### ワークフロー

- ログインボタンclick → Log the user in → Go to page /index
- エラー時 → Alert表示
## 8.2 /index（ダッシュボード）

### ページ設定

- URL: / （ホーム）
- Page is not accessible when user is not logged in: Yes → /login へ
### 要素配置

- Header (reusable)
- NavBar (reusable)
- Group/main（sidebar + content）
-   SideNav (reusable)
-   Group/content:
-     ┣ Group/KPI-Cards（4枚並列）
-     ┃   - 本日納品予定: Do a search for Orders (delivery_date_start=Current date and status≠納品済,キャンセル) :count
-     ┃   - 進行中: status is 受注 or 製版中 or 印刷中 :count
-     ┃   - 納期3日以内: delivery_date_start <= Current date+3days AND ≠納品済,キャンセル :count
-     ┃   - 今月売上: received_date's month = Current date's month の total_amount :sum
-     ┗ Group/main-area（2カラム）
-       ┣ RG/TodayDeliveries: Orders where delivery_date_start = Today
-       ┗ RG/RecentLogs: ChangeLog sorted by changed_at desc :items until #10
## 8.3 /orders（受注一覧）

### ページ設定

- URL: /orders
- URL Parameters (Exposed): q (text), status (text), from (date), to (date)
### 要素配置

- Header / NavBar / SideNav
- Group/content:
-   ┣ Row/Title（タイトル + 「新規受注起票」ボタン）
-   ┣ Group/Filter（6カラム検索バー）
-   ┗ Group/List:
-       ┣ Row/ListHeader（件数表示）
-       ┗ RG/Orders (type: Order)
### Repeating Group データソース

```plain text
Do a search for Orders
  WHERE
    is_deleted is no
    (Input/q is empty OR order_number contains Input/q OR customer's company_name contains Input/q OR memo contains Input/q)
    (Dropdown/status value is empty OR status is Dropdown/status value)
    (Input/from is empty OR received_date >= Input/from)
    (Input/to is empty OR received_date <= Input/to)
  SORTED BY received_date DESCENDING
```

### ワークフロー

- Filter入力 → URL更新（page push） + RG再検索
- 行クリック → Go to page order, order=Current cell's Order
- 新規起票ボタン → Go to page order_new
## 8.4 /order_new（新規受注起票）

### ページ設定

- URL: /order_new
- URL Parameters: customer_id (text, optional) — 顧客詳細から遷移時
### 要素配置

- 2カラムレイアウト:
-   左8/12: OrderFormGroup (reusable)
-   右4/12:
-     ┣ SummaryCard（見積サマリー: 明細合計/消費税/総額）
-     ┗ PastOrdersCard（顧客の過去発注リスト - RG）
### ワークフロー

- Page load時: URL param customer_id が存在 → OrderFormGroup's draft_customer に Customer:findById
- Save button click →
1. Validation: draft_customer is not empty, draft_items count >= 1, delivery_date_start is filled (unless asap)
1. Schedule Backend WF 'create_order_with_items' → parameters
1. Go to page order, order=resulting order
## 8.5 /order（受注詳細・編集）

### ページ設定

- URL: /order
- Type of content: Order
- URL Parameters: order (this page's Order automatically)
### 要素配置

- ヘッダー部: 受注番号 + ステータスバッジ + アクションボタン群
- タブバー: 受注情報 / C管理 / 見積書 / 納品（Phase3）
- タブ切替: Custom State 'active_tab' で切替、Groupのvisibility
- 2カラムレイアウト:
-   左8/12:
-     ┣ 基本情報カード
-     ┣ 明細テーブル（RG）
-     ┗ 工場進捗カード
-   右4/12:
-     ┣ ステータス操作ボタン列
-     ┣ 工場ステータスボタン列
-     ┗ 変更履歴RG
### 主要ワークフロー

- ステータス変更ボタン click → Schedule WF 'update_order_status'
- 「見積書作成」click → Schedule WF 'create_or_open_quote' → Go to page quote
- 「印刷ビュー」click → Open in new tab /print_order?id=This Order's unique id
- 「削除」click → ConfirmModal → OK → Schedule WF 'soft_delete_order' → Go to /orders
## 8.6 /quote（見積書）

### ページ設定

- URL: /quote
- Type of content: Quote
### 要素配置

- 2カラム:
-   左: 入力フォーム（宛先固定・見積日・有効期限・送付方法・状態・備考）
-   右: PDFプレビューカード
-     - 見積書ヘッダー（タイトル+番号+日付）
-     - 宛先
-     - 合計金額 + 会社情報印
-     - 明細テーブル
-     - 備考
### ワークフロー

- 各Input change → Update Quote（即時保存）
- 「PDF出力」click → Plugin PDF Conjurer で右カード要素をPDF化 → Quote's pdf_file = 保存
- 「メール送信」click → SendGrid経由でPDF添付送信 → Quote's status = 発行済、sent_at = now
- 「発行済にする」click → Quote's status = 発行済
## 8.7 /factory（工場カンバン）

### ページ設定

- URL: /factory
### 要素配置

- 4カラム Group（待機/作業中/完成/出荷待ち）
- 各カラム:
-   ┣ ヘッダー（ラベル+件数バッジ）
-   ┗ RG/Cards (type: Order, data source: FactoryStatus別)
- KanbanCard (reusable) 使用
### ドラッグ&ドロップ実装

- Drag & Drop plugin を各RG上に配置
- Dropped event → Schedule WF 'move_kanban_card'
-   - parameters: order (Dragged cell's Order), new_status (FactoryStatus)
-   - Update FactoryRecord's factory_status + 関連Order.statusも自動同期
-   - Log ChangeLog
## 8.8 /customers（顧客一覧）

### 要素配置

- 検索Input + 新規顧客ボタン
- RG/Customers（顧客名/種別/地域/電話/累計発注/累計売上）
- 累計計算: Do a search for Orders where customer = Current cell's Customer :count / :total_amount sum
- 行クリック → /customer?customer=X
## 8.9 /customer（顧客詳細）

### ページ設定

- URL: /customer
- Type of content: Customer
### 要素配置

- ヘッダー: 顧客名 + 種別 + 「この顧客で新規受注」ボタン
- KPIパネル（4タイル）: 累計受注/売上/初回/最終
- 過去発注RG
- 各行に「この仕様でコピー」ボタン → /order_new に遷移、CustomState経由で明細プリセット
## 8.10 /print_order（受注票印刷）

### ページ設定

- URL: /print_order
- Type of content: Order
- Layout: Fixed width 297mm（A4横）
- CSS（Settings → SEO/metatags → Advanced settings）で @media print 設定
### 要素配置

- ヘッダー: 受注票タイトル+番号
- 基本情報テーブル
- 明細テーブル（加工オプションは☑/☐で表示）
- サインボックス×3（製版/印刷/納品会計）
- 印刷ボタン（no-print クラス）: JavaScript window.print() をtoolbox pluginで実行
## 8.11 /papers（用紙マスタ管理）

- A_統括のみアクセス可（Privacy）
- RG/Papers表示 + 編集ポップアップ
- CSVインポートボタン → 1T - CSV Uploader
## 8.12 /settings

- JSON書出（Data API経由で全データエクスポート）
- 初期化ボタン → ConfirmModal → 全レコード削除 → SEED投入
# 第9部 ワークフロー詳細

> ⚙️ Workflowタブ で定義する全ワークフロー。イベント種別・条件・ステップを網羅。

## 9.1 ページワークフロー一覧

| **Page** | **Trigger** | **Actions** | **Conditions** |
| --- | --- | --- | --- |
| login | Login button click | Log the user in / Go to /index | — |
| index | Page load | （特になし、RG自動） | — |
| orders | Input q input | （RGの自動再検索） | — |
| orders | クリアボタン click | Reset filter inputs + URL params clear | — |
| orders | RG行 click | Go to page order, order=Current cell | — |
| order_new | Save button click | Validate → Schedule BWF create_order_with_items → Go to order | 顧客・明細必須 |
| order_new | Add item button click | Add new OrderItemRow to draft_items | — |
| order_new | 顧客新規+ click | Show CustomerRegisterModal | — |
| order_new | customer_created (custom event) | Set OrderFormGroup's draft_customer = created customer | — |
| order | Status button click | Schedule BWF update_order_status | — |
| order | Quote button click | Schedule BWF create_or_open_quote → Go to quote | — |
| order | Delete button click | Show ConfirmModal → on confirm: Schedule BWF soft_delete_order | A_統括のみ |
| quote | Input change (issued_date/valid_until/memo/...) | Make changes to Quote (auto-save) | — |
| quote | PDF出力 click | Run action: Generate PDF from element quote-preview → Save to Quote's pdf_file | — |
| quote | Send email click | Schedule BWF send_quote_email | — |
| factory | Drop event on column | Schedule BWF move_kanban_card | — |
| customer | 新規受注click | Go to order_new, customer=this Customer | — |
| customer | 仕様コピーclick | Go to order_new, source_order=Current cell | — |
| print_order | 印刷 click | Run JavaScript: window.print() | — |

## 9.2 Backend Workflows（API Workflows）

### 9.2.1 create_order_with_items

- **Parameters: **customer(Customer), received_date(date), received_by(User), reception_method(text), delivery_type(text), delivery_date_start(date), delivery_date_end(date), items_json(text), memo(text)
- Steps:
1. Run javascript: items_json をパースして Option Set変換 → Custom State
1. Create a new Order: order_number = result of generate_order_number
1. Create a new OrderItemの繰り返し (Make changes to 'Create' で List作成、parent_order=新Order)
1. Modify Order's items = Result of step 3 (list)
1. Calculate total: sum of items' subtotal
1. Modify Order's subtotal, tax_amount, total_amount
1. Create a new FactoryRecord: order=newOrder, status=待機
1. Schedule WF log_change: target=Order, summary='新規起票 (order_number)'
1. Return the new Order
### 9.2.2 update_order_status

- Parameters: order (Order), new_status (OrderStatus)
- Steps:
1. Make changes to order: status=new_status, modified_date=Current date/time
1. If new_status ∈ {製版中,印刷中,完成}, Make changes to order's FactoryRecord: factory_status 自動同期
1. Schedule log_change: target=Order, summary='ステータス変更: oldStatus→newStatus'
### 9.2.3 create_or_open_quote

- Parameters: order (Order)
- Steps:
1. Search Quote where order=order
1. If exists, return existing Quote
1. If not, Create a new Quote:
1.   quote_number = result of generate_quote_number
1.   issued_date=Current date, valid_until=Current date+1month月末
1.   total_amount=order's total_amount, status=作成中
1.   memo='振込先: 二本松信金 本店 普通 1234567 ワタナベトウシャドウ'
1. Schedule log_change
1. Return Quote
### 9.2.4 generate_order_number

- Parameters: なし
- Steps:
1. Set prefix = Current date :formatted as YYMMDD
1. Search Orders where order_number :starts_with prefix, :count
1. Return prefix + '-' + (count + 1):formatted as 000
### 9.2.5 generate_quote_number

- 同様。プレフィックス 'Q-' + YYMMDD
### 9.2.6 move_kanban_card

- Parameters: order (Order), new_factory_status (FactoryStatus)
- Steps:
1. Modify order's FactoryRecord: factory_status = new_factory_status
1. If new=作業中 AND started_at is empty → started_at = now
1. If new=完成 → completed_at = now, completed_by = Current User
1. Sync Order.status:
1.   待機 → 受注 / 作業中 → 製版中 or 印刷中（前が受注なら製版中、それ以外印刷中）
1.   完成 → 完成 / 出荷待ち → 完成
1. Schedule log_change
### 9.2.7 soft_delete_order

- Parameters: order (Order)
- Steps:
1. Make changes to order: is_deleted=yes
1. Log: 'Order削除 (順番号)'
### 9.2.8 log_change

- Parameters: target_type(text), target(text), summary(text), scope(ChangeScope), target_order(Order)
- Steps:
1. Create a new ChangeLog: all fields set
> 📌 このWFは全ての変更系WFからSchedule呼び出しする共通ログ記録機。

### 9.2.9 send_quote_email

- Parameters: quote (Quote)
- Steps:
1. If pdf_file is empty → Schedule generate_quote_pdf and wait
1. SendGrid plugin: Send Email action
1.   to: quote's customer's email
1.   from: noreply@toshado.jp / 渡辺謄写堂
1.   subject: '御見積書: ' + quote_number
1.   body: テンプレート（customer name + 本文）
1.   attachment: quote's pdf_file
1. Modify quote: status=発行済, sent_at=now
1. Log
### 9.2.10 generate_quote_pdf

- Parameters: quote (Quote)
- Steps:
1. PDF Conjurer: Convert HTML to PDF
1.   template: 見積書テンプレートHTML（Expression埋め込み）
1.   format: A4, portrait, margin 20mm, font 'Noto Sans JP'
1. Modify quote's pdf_file = Result
### 9.2.11 import_papers_csv

- Parameters: csv_file (file)
- Steps:
1. 1T CSV Uploader → Upload
1. For each row: Upsert Paper by paper_name
## 9.3 Scheduled API Workflows（定期実行）

| **名前** | **実行頻度** | **処理** |
| --- | --- | --- |
| daily_delivery_reminder | 毎朝8:00 JST | 本日納期のOrderをA_統括にメール通知 |
| daily_urgent_reminder | 毎朝8:00 JST | 納期3日以内の未完成Orderリストを通知 |
| weekly_past_due_report | 毎週月曜9:00 | 納期超過の未完成Orderリストをメール |
| monthly_changelog_archive | 毎月1日3:00 | 6ヶ月以上古いChangeLogを外部ストレージにアーカイブ→削除 |

- 実装: Settings → Scheduler → Add scheduled WF
## 9.4 Custom Events（再利用ロジック）

- customer_created: 新規顧客登録後にトリガー、受注票フォームのdraft_customerにセット
- item_added: 明細追加後、右サマリー再計算
- item_removed: 同上
- item_changed: 数量/紙/インク変更時、subtotalとOrder合計を再計算
- draft_cleared: 受注票の下書きクリア（キャンセル時）
# 第10部 計算ロジック（価格計算）

## 10.1 明細単価の計算

```plain text
# Pseudo code
base_unit_price = paper.unit_price × ink_pattern.multiplier
unit_price = round(base_unit_price)

# 加工オプション加算
extra = 0
if mishin_count > 0: extra += 500 × mishin_count
if folding ≠ 'なし': extra += 800
if hole_position ≠ 'なし': extra += 300
if numbering_enabled: extra += 1500
if yacho_style: extra += 1200
if lamination: extra += 2000

subtotal = round(base_unit_price × quantity + extra)
```

## 10.2 Bubbleでの式

```plain text
# OrderItem's unit_price
(This OrderItem's paper's unit_price) × (This OrderItem's ink_pattern's multiplier):rounded to 0

# OrderItem's subtotal
(上のunit_price × This OrderItem's quantity)
  + (This OrderItem's mishin_count × 500)
  + (This OrderItem's folding is not なし) formatted as 800/0
  + (This OrderItem's hole_position is not なし) formatted as 300/0
  + (This OrderItem's numbering_enabled) formatted as 1500/0
  + (This OrderItem's yacho_style) formatted as 1200/0
  + (This OrderItem's lamination) formatted as 2000/0
```

## 10.3 Order合計

- subtotal = sum of items' subtotal
- tax_amount = round(subtotal × 0.10)
- total_amount = subtotal + tax_amount
> 💰 価格変動時は PriceRule テーブルを参照する方式も可能。Phase 1では単純な係数方式で運用、年度途中で変更。

## 10.4 Backend WF での再計算トリガー

- OrderItem作成/更新後 → parent_orderの合計を再計算して保存
- Quote作成時 → Orderの合計をコピー
- Paper.unit_price変更時 → 関連Orderは再計算しない（履歴保全）
# 第11部 検索クエリ実装

> 🔍 Bubble の Do a search for 式を各シーンで使い分ける。

## 11.1 ダッシュボードKPI

```plain text
# 本日納品
Do a search for Orders:count
  delivery_date_start = Current date's date
  status is not 納品済
  status is not キャンセル
  is_deleted is no

# 進行中
Do a search for Orders:count
  (status is 受注 or status is 製版中 or status is 印刷中)
  is_deleted is no

# 納期3日以内
Do a search for Orders:count
  delivery_date_start <= Current date/time:+(days) 3
  delivery_date_start >= Current date/time
  status is not 納品済,キャンセル
  is_deleted is no

# 今月売上
Do a search for Orders:each item's total_amount:sum
  received_date >= Current date/time's date:start of Month
  received_date < Current date/time's date:+(months) 1:start of Month
  is_deleted is no
```

## 11.2 受注一覧フィルタ

```plain text
Do a search for Orders
  is_deleted is no
  order_number contains Input Q's value (conditional: Input Q is not empty)
  customer is Dropdown Customer's value (conditional: dropdown is filled)
  status is Dropdown Status's value (conditional)
  received_date >= Input From's value (conditional)
  received_date <= Input To's value (conditional)
:sorted by received_date descending
```

> 💡 Bubbleでは条件付き絞り込みは「Input is empty :or conditional match」で実装。より複雑な場合はConditional actionsで動的に検索式を切替。

## 11.3 顧客の過去発注

```plain text
Do a search for Orders
  customer is This Customer
  is_deleted is no
  status is not キャンセル
:sorted by received_date descending
:items until #20
```

## 11.4 工場カンバン

```plain text
# 各列の RG データソース
Do a search for Orders
  is_deleted is no
  status is not 納品済, キャンセル
  FactoryRecord's factory_status is [列のステータス]
```

> ⚠️ Order → FactoryRecord の逆参照を検索するのは Bubble で高コスト。FactoryRecord テーブルから Order を引く方向にする、または Order に factory_status_cache フィールドを持たせる方法も検討。

## 11.5 ChangeLog最新

```plain text
Do a search for ChangeLogs
:sorted by changed_at descending
:items until #10
```

# 第12部 認証・セキュリティ

## 12.1 認証フロー

1. 初回: A_統括ユーザ1名を管理画面から手動作成
1. A_統括が他ユーザを招待（Signup link + role指定）
1. ログイン: email + password / ログイン状態保持オプション
1. パスワードリセット: Password reset emailデフォルト
1. セッション: 30日保持（Bubble設定）
## 12.2 ユーザー招待ワークフロー

- A_統括のみ「ユーザ招待」ページにアクセス可
- 入力: email, name, role
- WF: Sign the user up (using password generated) → Send password reset email
- 招待メールテンプレ: SendGrid Dynamic Template
## 12.3 Privacy Rulesの再確認

- User: 自分 + 管理者のみfull read. email/name/roleのみ一般read
- Customer: 全ログインユーザread. Create/Modify = A_統括
- Order: 全ログインユーザread. Create = A_統括 / Modify = A_統括 or (B_製版 if status=製版中) or (C_工場 if status=印刷中)
- OrderItem / FactoryRecord / Quote: parent Order依存
- Paper / PriceRule: 全ログインread. Modify = A_統括
- ChangeLog: 全ログインread. Create only through backend WF
## 12.4 XSS / Injection対策

- Bubble標準でHTMLエスケープ済み。Rich Text Editor利用時のみ注意
- Memo欄にscript埋込 → Bubbleは安全処理
## 12.5 バックアップ

- Bubble標準: 日次データベーススナップショット
- 追加: 毎週月曜 3:00 AM に JSON全データを社内Google Drive自動バックアップ（Google Drive API plugin）
# 第13部 初期データ投入

## 13.1 管理者ユーザ作成

1. Data → App data → User → New entry
1. email: watanabe@toshado.jp / name: 渡辺 修一 / role: A_統括 / is_active: yes
1. パスワードは「Reset password」から設定
## 13.2 用紙マスタインポート

- CSV Template:
```plain text
paper_name,quality,color,thickness_kg,paper_size,unit_price,is_major
コート135kg 白 A4,コート,白,135,A4,30,yes
コート135kg 白 B4,コート,白,135,B4,45,yes
上質90kg 白 A4,上質,白,90,A4,15,yes
上質90kg 白 B5,上質,白,90,B5,10,yes
フミス200kg 白 名刺,フミス,白,200,名刺,10,yes
フミス200kg クリーム 名刺,フミス,クリーム,200,名刺,12,yes
NT書籍80kg 白 A4,NT書籍,白,80,A4,12,no
色上質厚口 青 A4,色上質,青,90,A4,20,no
クラフト紙 茶 A4,クラフト,茶,100,A4,18,no
再生紙 白 A4,再生紙,白,80,A4,10,no
(渡辺様より全紙種データを受領後、追加)
```

- 1T CSV Uploader → Papers テーブルにUpsert
## 13.3 顧客マスタインポート

- CSV Template: 同様のフォーマット
- 渡辺様より既存顧客リストを受領予定
> 📋 Phase 1では主要顧客20〜50社程度で運用開始。新規顧客は業務中にシステム上で追加する運用。

## 13.4 PriceRule登録

- 手動 or CSVで定型品ルール投入
- 最低限: 名刺カラー両面/モノクロ両面、チラシA4、封筒
## 13.5 既存受注データの移行

- 対象期間: 直近1年分（約500件想定）
- 渡辺様のCSエクセルから変換 → CSV→Orders + OrderItemsを個別インポート
- 技術: Backend WF 'migrate_legacy_orders' をカスタム実装
# 第14部 テスト計画

## 14.1 単体テスト項目

- **🧪 認証**
  - [ ] ログイン成功 → /index
  - [ ] パスワード誤り → エラー表示
  - [ ] ログイン状態保持チェック
  - [ ] ログアウト → /login
  - [ ] 未ログインで保護ページ → /login へリダイレクト
- **🧪 受注起票**
  - [ ] 顧客選択・新規作成
  - [ ] 明細1行で起票成功
  - [ ] 明細複数行で小計・合計の正確性
  - [ ] 加工オプション全種類の単価反映
  - [ ] 用紙「その他」自由入力
  - [ ] 納期3種類（指定日/期間/出次第）
  - [ ] 顧客未選択でバリデーションエラー
  - [ ] 明細0件でエラー
  - [ ] 採番の連番性（同日2件目→001, 002）
  - [ ] ChangeLog記録
- **🧪 受注詳細・編集**
  - [ ] 基本情報表示
  - [ ] 明細テーブル加工欄表示
  - [ ] ステータス変更 → FactoryRecord自動同期
  - [ ] 工場ステータス変更 → Orderステータス自動同期
  - [ ] 変更履歴表示（最新順）
  - [ ] 削除 → 一覧から消える
- **🧪 見積書**
  - [ ] 受注から見積書自動生成（番号採番）
  - [ ] 有効期限デフォルト（翌月末）
  - [ ] 入力変更の自動保存
  - [ ] PDF生成（日本語文字化けなし）
  - [ ] メール送信（添付あり）
- **🧪 工場カンバン**
  - [ ] 4列表示
  - [ ] カードドラッグ&ドロップ
  - [ ] ステータス変更後、Order.status同期
  - [ ] 納期アラート表示
- **🧪 検索・フィルタ**
  - [ ] 受注一覧の部分一致検索
  - [ ] 日付範囲検索
  - [ ] 複数条件の組み合わせ
  - [ ] クリアボタンで初期化
- **🧪 権限（Privacy）**
  - [ ] B_製版で顧客マスタ編集不可
  - [ ] C_工場で受注削除不可
  - [ ] 経理で編集不可・閲覧のみ
## 14.2 UAT（渡辺様確認）

- 実データ10件入力 → 通常業務フロー再現
- 受注→製版→印刷→納品→帳簿 の1週間分を入力
- カンバン操作の日常運用イメージ
- 紙出力が現行クリアファイル運用と遜色ないか
- 検索が早く目的の案件に辿り着けるか
## 14.3 パフォーマンステスト

- Orders 1000件で一覧表示が3秒以内
- 検索応答2秒以内
- PDF生成5秒以内
# 第15部 デプロイ・運用

## 15.1 Live環境デプロイ手順

1. Dev → Test デプロイ（渡辺様UAT）
1. UAT完了・承認
1. Test → Live デプロイ（管理者ボタン）
1. Live環境で本番Admin1人登録
1. 用紙マスタ・顧客マスタをLiveに投入
1. Live環境で1件テスト起票 → 削除
1. 運用開始
## 15.2 本番運用チェックリスト

- [ ] 全ユーザ招待完了（4名）
- [ ] 用紙マスタ全件登録
- [ ] 顧客マスタ主要顧客登録
- [ ] 見積書テンプレート（会社ロゴ・住所）登録
- [ ] SendGrid Domain Auth済
- [ ] カスタムドメイン稼働
- [ ] 初回バックアップ取得
- [ ] 操作マニュアル（利用者向け）配布
## 15.3 日次運用

- 毎朝8時: daily_delivery_reminder 実行確認
- 渡辺様: ダッシュボードで本日の進捗確認
- C担当: 工場カンバンでステータス管理
- 全員: 変更履歴で情報同期
## 15.4 週次運用

- 月曜9時: weekly_past_due_report メール確認
- 週末: JSON書出によるローカルバックアップ（手動）
## 15.5 トラブルシューティング

| **症状** | **原因候補** | **対応** |
| --- | --- | --- |
| ログインできない | パスワード失念/Active=no | 管理者がパスワードリセット送信 |
| 検索が遅い | レコード件数増加 | インデックス追加、Cached fields活用 |
| PDF日本語化け | Noto Sans JP未読込 | PDF Conjurer設定再確認 |
| メール届かない | SendGrid送信枠/Spam | SPF/DKIM確認、送信ログ確認 |
| カンバンDnD効かない | ブラウザ・Drag plugin互換 | Chrome最新版推奨 |
| 変更履歴膨張 | 6ヶ月分蓄積 | monthly_changelog_archive実行 |

## 15.6 モニタリング

- Bubble Logs → Server logs で ERROR件数監視
- Scheduled WFの実行ログチェック（毎朝）
- SendGrid メール送信ログ（週次）
## 15.7 バージョン更新方針

- Phase 1.1: UAT修正反映（想定2週間）
- Phase 2: B製版管理統合（2026-08）
- Phase 3: 帳簿・納品書・請求書（2026-09）
- 各バージョンは Dev → Test → Live の3段階デプロイ厳守
# 第16部 別紙: モックアップ ↔ Bubble 対応表

> 🔗 Functional Mockup v0.2 の各画面・要素がBubbleでどう実装されるかの対応表。

## 16.1 画面対応表

| **Mockup Screen** | **Mockup URL hash** | **Bubble Page** | **主要差分** |
| --- | --- | --- | --- |
| ダッシュボード | #dashboard | /index | なし |
| 受注一覧 | #orders | /orders | なし |
| 受注新規起票 | #order/new | /order_new | なし |
| 受注詳細 | #order/:id | /order?order=X | URLパラメータ構造 |
| 見積書 | #quote/:id | /quote?quote=X | 同上 |
| 工場カンバン | #factory | /factory | なし |
| 顧客一覧 | #customers | /customers | なし |
| 顧客詳細 | #customer/:id | /customer?customer=X | 同上 |
| 受注票印刷 | #print/:id | /print_order?order=X | 同上 |
| 用紙マスタ | #papers | /papers | A_統括のみアクセス |
| 設定 | #settings | /settings | JSON書出はAdmin APIに変更 |

## 16.2 データ保存方式の変更

- **Mockup: **localStorage（ブラウザローカル）
- **Bubble: **クラウドDB（マルチユーザ同期）
## 16.3 失われない機能

- UIレイアウト・色使い・情報密度
- 明細複数行・過去発注コピー
- カンバンDnD
- 受注票A4印刷
- 変更履歴自動記録
## 16.4 追加される機能（Bubble版）

- マルチユーザ認証・権限制御
- メール送信（見積書・リマインド）
- Scheduled WF（日次/週次/月次）
- バックアップ自動化
- CSVインポート/エクスポート
---

## 改訂履歴

- v1.0 (2026-04-24): Bubble.io実装完全指示書 初版


> 📮 本書に関する質問・追加仕様は、Unsee担当者まで。次回レビュー時に反映します。
