# Android開発ベストプラクティス

## Kotlin + Jetpack Compose パターン

### 1. アーキテクチャ・状態管理

1. UIアーキテクチャには単方向データフロー(UDF)を採用する
2. 状態のホイスティング(State Hoisting)を行い、UIとロジックを分離する
3. Composable関数内で副作用を直接実行せず、Effect APIを利用する
4. ViewModelでは状態を `StateFlow` として公開し、UIから購読する
5. ライフサイクルを意識した状態購読には `collectAsStateWithLifecycle` を使用する
6. 画面回転などによる状態喪失を防ぐため `rememberSaveable` を適切に使用する
7. UIの状態は複数の変数ではなく、1つの `sealed class` または `data class` にまとめる
8. Hiltなどの依存性注入(DI)を利用して、ViewModelの生成と依存関係を管理する
9. Navigation Composeを使用し、画面遷移はType-safeに実装する
10. Repositoryパターンを採用し、データソース(Local/Remote)を隠蔽する

### 2. Compose UI設計・実装

1. Modifierは引数の最後に配置し、デフォルト値 `Modifier = Modifier` を持たせる
2. Modifierの適用順序はレイアウトに影響するため、順序（paddingとbackgroundなど）を正しく設定する
3. 再利用性を高めるため、状態を持たない(Stateless) Composableと状態を持つ(Stateful) Composableを分ける
4. 大量のリスト表示には `Column` ではなく `LazyColumn` / `LazyRow` を使用する
5. リストアイテムの不要な再コンポーズを防ぐため、`LazyColumn` には一意の `key` を指定する
6. Composable関数の引数には、変更不可能な(Immutable)データ型を渡す
7. 色やサイズをハードコードせず、MaterialThemeなどのテーマを使用する
8. 深い階層へのデータ受け渡しには `CompositionLocal` を活用する
9. 制約が複雑なレイアウトでは、ネストを避けるため `ConstraintLayout` (Compose版)を使用する
10. `Scaffold` を使用して、TopAppBarやBottomNavigationの配置を標準化する

### 3. パフォーマンス最適化

1. 再コンポーズの範囲を最小限に抑えるようコンポーネントを細分化する
2. 頻繁に変化する状態（スクロール位置など）には `derivedStateOf` を使用して再コンポーズを抑制する
3. アニメーションなどによる重い処理は、非同期やバックグラウンドで処理する
4. Compose Compiler Metricsを有効にし、Skippable/Restartableな関数を確認する
5. Baseline Profilesを導入し、アプリの起動速度とスクロール性能を向上させる
6. R8/ProGuardを有効にして、不要なコードやリソースを削減する
7. リストのスクロール状態の監視には `snapshotFlow` を使用する
8. `reportFullyDrawn` を活用して、初期描画の完了をシステムに通知する
9. UIスレッドでI/O操作（ファイル読み書き、DBアクセス）を絶対に実行しない
10. コレクション操作において、無駄な中間リストの生成を避ける（`Sequence` の活用など）

### 4. コルーチン (Coroutines & Flow)

1. 非同期処理にはRxJavaではなくKotlin Coroutinesを標準とする
2. `GlobalScope` は使用せず、`viewModelScope` や `lifecycleScope` を使用する
3. スレッドプールの切り替えには `Dispatchers.IO` や `Dispatchers.Default` を明示する
4. コルーチン内で例外が発生した場合は `try-catch` または `CoroutineExceptionHandler` で適切に処理する
5. 複数のAPIリクエストを並列処理する場合は `async` / `awaitAll` を使用する
6. Flowの変換処理では `map`, `filter`, `combine` などのオペレータを活用する
7. UI層へFlowを渡す際は、`SharingStarted.WhileSubscribed` を使ってリソースを節約する
8. StateFlowの初期値には、ローディング状態など安全な初期値を設定する
9. 構造化された並行性(Structured Concurrency)の原則を順守する
10. 一度限りのイベント（トーストやスナックバー）には `SharedFlow` ではなく、Channelを活用したEventラッパーを検討する

### 5. Kotlin言語の活用

1. `!!` 演算子によるNull強制アンラップは使用せず、`?.let` やエルビス演算子 `?:` を使用する
2. `var` ではなく可能な限り `val` を使用し、不変性を保つ
3. 拡張関数(Extension Functions)を利用して、既存クラスの機能を簡潔に拡張する
4. 型チェックやスマートキャストを活用し、冗長なキャストを減らす
5. 初期化が遅れる変数には `lateinit` や `lazy` デリゲートを使用する
6. 関連する定数は、単なる定数ではなく `enum class` や `sealed class` で型安全にする
7. オブジェクトの生成・操作にはスコープ関数 (`apply`, `let`, `run`, `with`, `also`) を目的に応じて使い分ける
8. オーバーヘッドを減らすため、高階関数には `inline` 修飾子を使用する
9. 型消去を回避する必要がある場合は `reified` 型パラメータを使用する
10. パフォーマンス向上のため、プリミティブ型のラッパーには `value class` を検討する

### 6. 開発ツール・エコシステム

1. KAPTの代わりにKSP(Kotlin Symbol Processing)を使用してビルドを高速化する
2. ビルドスクリプトはGroovyではなく `build.gradle.kts` (Kotlin DSL)で記述する
3. 依存関係のバージョン管理には Version Catalogs (`libs.versions.toml`) を使用する
4. UIのプレビューには `@Preview` アノテーションを多用し、異なる画面サイズやダークモードを確認する
5. プレビュー用のダミーデータ注入には `PreviewParameterProvider` を活用する
6. 画像の読み込みには Coil ライブラリを使用する
7. ネットワーク通信には Retrofit と Coroutine アダプタを使用する
8. ローカルDBには Room を使用し、Flowでデータを監視する
9. 複雑な環境設定の保存には SharedPreferences ではなく DataStore を使用する
10. CI/CD環境を構築し、ビルドとテストを自動化する

### 7. アクセシビリティ・UIUX

1. アイコンや画像には意味のある `contentDescription` を必ず設定する
2. タップ可能な領域は48x48dp以上を確保する
3. コントラスト比を適切に保ち、視認性の高い配色にする
4. Dynamic Color (Material 3) に対応し、ユーザーのテーマ設定を尊重する
5. Edge-to-Edgeデザインを適用し、システムバーの領域まで描画する
6. ウィンドウインセット (`WindowInsets`) を適切に処理し、キーボードやノッチとの被りを防ぐ
7. システムのフォントサイズ変更(スケーリング)に追従するため、sp単位を使用する
8. ダークモードとライトモードの両方のテーマ定義を適切に提供する
9. 状態変化をユーザーに伝えるため、適切なアニメーション(`AnimatedVisibility`など)を付与する
10. ハプティックフィードバックを活用して、操作感を向上させる

### 8. テスト

1. JUnit5 / MockK を使用して、ViewModelとRepositoryの単体テストを記述する
2. Flowのテストには Turbine ライブラリを使用してイベントストリームを検証する
3. Compose UIテストでは `createComposeRule` を使用し、UI要素を検証する
4. `TestCoroutineScheduler` や `StandardTestDispatcher` を使い、非同期処理を同期的にテストする
5. テスト対象のクラスにはインターフェースを定義し、DI経由でモックを差し込めるようにする
6. UIの表示崩れを防ぐため、Robolectricを活用したスクリーンショットテストを導入する
7. `Modifier.testTag` を使用して、UIテスト時に要素を特定しやすくする
8. E2Eテストには UI Automator や Macrobenchmark を活用する
9. テストカバレッジツール(Jacocoなど)を導入し、品質の指標とする
10. バグの再現テストを自動化し、リグレッションを防ぐ

### 9. その他のベストプラクティス

1. セキュリティ対策として、APIキーやシークレット情報をソースコードにハードコードしない
2. 難読化(ProGuard/R8)のルールを適切に設定し、リフレクションを使用するライブラリを保護する
3. アプリケーションのクラッシュレポート(Firebase Crashlyticsなど)を導入する
4. Detekt や ktlint を導入し、静的解析によるコードフォーマットの統一と品質を担保する
5. LeakCanaryをデバッグビルドに導入し、メモリリークを早期に発見する
6. `Parcelize` プラグインを使用して、Parcelableの実装を自動化する
7. 古いOSバージョン向けにJava 8+ APIを利用できるようDesugaringを有効にする
8. Enumの網羅性チェックを活かし、`when` 式で `else` を使わず全パターンを記述する
9. APIのレスポンスモデルとUIで表示するドメインモデルは分けてマッピングを行う
10. Clean Architectureを採用し、機能ごとにマルチモジュール化(`feature` モジュール)を検討する
11. カスタムModifierを作成し、複雑なUIロジックを再利用可能にする
12. `rememberUpdatedState` を使って、長時間実行されるEffect内で最新の状態を参照する
13. `DisposableEffect` を使用して、ライフサイクルに合わせたリソースの解放を行う
14. 外部の非Compose状態をComposeに統合する場合は `produceState` を使用する
15. ジェスチャー処理(Swipe, Drag, Zoom)は標準の `pointerInput` 修飾子で実装する
16. `Animatable` を利用して、連続的で物理ベースのカスタムアニメーションを作成する
17. アプリの言語設定を動的に変更できるよう、`LocaleManager` や標準APIを活用する
18. プラットフォーム固有のAPI呼び出しはインターフェースで抽象化する
19. ComposeのRecompositionカウントをAndroid StudioのLayout Inspectorで監視する
20. AndroidXとComposeのライブラリは常に最新の安定版に追従し、非推奨APIを避ける
