# SSOT（Single Source of Truth）と定数管理

---

## SSOTとは

「同じ情報が複数箇所に存在しない」状態のこと。
1つの情報は1箇所にだけ定義し、他の場所はそこを参照する。

変更するとき、1箇所だけ直せばよい状態がSSOTが達成されている証拠。

---

## SSOTが崩れやすい場所と対策

### 型定義

```typescript
// 禁止：同じ型を複数ファイルにコピー
// features/auth/auth.types.ts
type User = { id: string; name: string; email: string };

// features/profile/profile.types.ts
type User = { id: string; name: string; email: string }; // コピー ← 禁止

// 正しい：共有型は1箇所に定義
// src/types/domain.types.ts
export type User = { id: string; name: string; email: string };

// 各featureからimport
import type { User } from '@/types/domain.types';
```

### APIエンドポイント

```typescript
// 禁止：エンドポイントを各ファイルに直書き
// services/stockService.ts
const url = 'https://api.example.com/v1/stocks'; // ← 直書き禁止

// 正しい：定数ファイルで一元管理
// constants/api.constants.ts
export const API_BASE_URL = 'https://api.example.com';
export const API_VERSION = 'v1';
export const ENDPOINTS = {
  stocks: `${API_BASE_URL}/${API_VERSION}/stocks`,
  earnings: `${API_BASE_URL}/${API_VERSION}/earnings`,
} as const;
```

### 設定値・閾値

```typescript
// 禁止：マジックナンバーをコード内に散在させる
if (marketCap > 300000000000) { ... }     // 何の数字か分からない
if (per > 15 && per < 25) { ... }         // 業種標準PERが何度も出てくる

// 正しい：定数ファイルで意味を与える
// constants/domain.constants.ts
export const MARKET_CAP = {
  LARGE_CAP_THRESHOLD: 300_000_000_000,
  MID_CAP_THRESHOLD: 100_000_000_000,
} as const;

export const VALUATION = {
  PER_STANDARD_MIN: 15,
  PER_STANDARD_MAX: 25,
} as const;
```

---

## 定数ファイルの構成

```
src/constants/
  api.constants.ts       APIエンドポイント・タイムアウト・リトライ回数
  domain.constants.ts    ビジネスルールの数値・閾値
  ui.constants.ts        アニメーション時間・ページサイズ・表示件数
  routes.constants.ts    URLルーティングのパス定義
```

---

## 環境変数のSSOT

`.env.example` がSSOTとして機能する。

```bash
# .env.example（コミットする）
# 実際の値は書かない。変数名と説明だけ書く。
API_BASE_URL=            # バックエンドAPIのベースURL
API_KEY=                 # 外部APIキー（本番はCI/CDシークレットで管理）
DATABASE_URL=            # DB接続文字列
NODE_ENV=development     # development / production / test
```

新メンバーが `.env.example` をコピーして `.env` を作り、値を埋める運用にする。

---

## ドキュメントのSSOT

同じ情報がREADME.mdとARCHITECTURE.mdと別のドキュメントに重複して書かれている状態を禁止する。

```
README.md           セットアップ手順・概要
ARCHITECTURE.md     設計思想・層のルール・制約
decisions/          個別の判断記録（ADR）

# 禁止：同じルールをREADMEとARCHITECTUREの両方に書く
```

---

## SSOTチェックリスト

プロジェクト開始時・レビュー時に確認する。

- [ ] 型定義が複数ファイルにコピーされていないか
- [ ] APIエンドポイントが定数ファイルにまとまっているか
- [ ] コード中にマジックナンバーが残っていないか
- [ ] `.env.example` が最新の状態か
- [ ] 同じ説明がドキュメントの複数箇所に書かれていないか
