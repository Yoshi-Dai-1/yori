# アーキテクチャ：モバイルアプリ

**向いている場面**：iOS / Android / クロスプラットフォーム（React Native / Flutter）アプリ
**採用パターン**：クリーンアーキテクチャ（Clean Architecture）の簡略版

---

## このファイルを使う前に確認すること

ARCHITECTURE.md を記入する前に、以下を project-definition.md で確認する：

```
確認1：ネイティブか・クロスプラットフォームか
  iOS のみ          → Swift / SwiftUI
  Android のみ      → Kotlin / Jetpack Compose
  両方              → React Native（JS/TS） / Flutter（Dart）
  → ARCHITECTURE.md の「言語・フレームワーク」欄に記録する

確認2：オフライン動作が必要か
  必要な場合        → ローカルDB（SQLite / Core Data / Room）を設計に含める
  不要な場合        → 通信エラー時の表示のみ考慮する

確認3：プッシュ通知が必要か
  必要な場合        → FCM（Firebase Cloud Messaging）を設計に含める
  不要な場合        → スキップする

確認4：ストア公開が必要か
  App Store / Google Play 公開 → セキュリティ要件Lv.3以上として扱う
  社内配布のみ                 → セキュリティ要件Lv.2として扱う
```

---

## ディレクトリ構成（クロスプラットフォーム / React Native を例に）

```
src/
  presentation/           画面・UI コンポーネント
    screens/              各画面（1機能 = 1ディレクトリ）
      home/
        HomeScreen.tsx
        HomeScreen.test.tsx
      auth/
        LoginScreen.tsx
        LoginScreen.test.tsx
    components/           再利用可能なUIパーツ
      Button/
      Card/
      ErrorBoundary/
    navigation/           画面遷移の定義
      AppNavigator.tsx
      AuthNavigator.tsx

  domain/                 ビジネスロジック（UI・外部依存ゼロ）
    entities/             データ構造の定義
      user.types.ts
      product.types.ts
    usecases/             ユースケース（1操作 = 1ファイル）
      loginUseCase.ts
      fetchProductsUseCase.ts
    repositories/         データアクセスのインターフェース（実装は infra/）
      IUserRepository.ts
      IProductRepository.ts

  infra/                  外部依存の実装
    api/                  HTTPクライアント・APIアダプター
      apiClient.ts        タイムアウト・リトライ設定はここに集約
      userApi.ts
      productApi.ts
    storage/              ローカルストレージ
      secureStorage.ts    認証トークン（Keychain / EncryptedSharedPreferences）
      localDb.ts          オフラインデータ（必要な場合のみ）
    notifications/        プッシュ通知（必要な場合のみ）
      pushNotification.ts

  shared/                 横断的関心事
    constants/            定数（タイムアウト値・リトライ回数・エンドポイント等）
      api.constants.ts
      storage.constants.ts
    errors/
      AppError.ts
    utils/
      formatDate.ts

  config/
    env.ts                環境変数の読み込み（本番・開発・ステージング）
```

---

## モバイル固有の設計原則

### 通信設計（network-resilience.md に加えてモバイル固有の考慮が必要）

```
原則1：電波不安定を前提にする
  モバイル通信は Wi-Fi・4G・5G を行き来する。
  一時的な通信断は「例外」ではなく「通常の動作」として設計する。
  → タイムアウトとリトライは「必ず」実装する（network-resilience.md の判断不要）
  → 通信中の画面操作をブロックしない（ローディング表示 + キャンセル可能な設計にする）

原則2：バックグラウンド通信の制約を考慮する
  iOS・Android はバックグラウンドでの通信を制限する。
  バックグラウンドでのデータ同期が必要な場合：
    iOS    → Background App Refresh の制約を確認してから設計する
    Android → WorkManager の制約を確認してから設計する
  → 実装前に「[プラットフォーム名] background fetch [現在年]」を検索する

原則3：オフライン状態の表示を必ず定義する
  通信エラー時に何を表示するか・どのデータをキャッシュするかを
  ARCHITECTURE.md の「オフライン設計」セクションに記録する
```

### 認証トークンの保管（security-implementation.md と連携）

```
機密情報（認証トークン・APIキー）の保管先：
  iOS    → Keychain（NSURLCredentialStorage ではない）
  Android → EncryptedSharedPreferences（SharedPreferences は使わない）
  React Native → react-native-keychain ライブラリを使う
  Flutter → flutter_secure_storage ライブラリを使う

AsyncStorage / SharedPreferences への認証トークン保管は禁止。
理由：暗号化されていないため、root化・脱獄端末で読み取り可能。
```

### アプリのビルドと環境分離

```
環境を3つ用意する：
  development  → ローカル開発
  staging      → テスト・QA
  production   → ストア公開版

環境変数の管理：
  .env.development / .env.staging / .env.production
  → APIエンドポイント・APIキーを環境ごとに切り替える
  → ビルド時に正しい環境が選択されているかを CI で確認する
```

---

## 信頼できる情報源（実装前に検索する）

URLは変更される可能性があるため、組織名・ドメインで判断する。

```
プラットフォーム公式：
  Apple Developer（developer.apple.com）→ iOS / SwiftUI 公式ドキュメント
  Android Developers（developer.android.com）→ Android / Jetpack 公式ドキュメント
  React Native（reactnative.dev）→ React Native 公式ドキュメント
  Flutter（flutter.dev）→ Flutter 公式ドキュメント

セキュリティ：
  OWASP Mobile Security Testing Guide（owasp.org）→ モバイル固有のセキュリティ要件
  OWASP Mobile Top 10（owasp.org）→ モバイルの主要な脆弱性
  → 「OWASP Mobile Top 10 [現在年]」で検索して最新版を確認する

バックグラウンド処理・通知：
  Apple Developer（developer.apple.com）→ Background Tasks / Push Notifications
  Android Developers（developer.android.com）→ WorkManager / FCM
  Firebase（firebase.google.com）→ Firebase Cloud Messaging
```

---

## ARCHITECTURE.md への追記セクション（モバイル固有）

```markdown
## モバイル固有設計

### プラットフォーム
- 対象OS：[iOS / Android / 両方]
- 開発方式：[ネイティブ / React Native / Flutter]
- 最低サポートOS：iOS [バージョン] / Android [バージョン]

### オフライン設計
- オフライン動作：[必要 / 不要]
- キャッシュするデータ：[記述 / なし]
- 通信エラー時の表示：[記述]

### プッシュ通知
- 必要：[あり / なし]
- 使用サービス：[FCM / APNs直接 / その他]

### ストア公開
- 公開先：[App Store / Google Play / 両方 / 社内配布]
- セキュリティ要件レベル：[Lv.2 / Lv.3]（security-requirements.md で判定）
```
