# iOSアプリ開発ベストプラクティス

## 1. アーキテクチャ・状態管理

1. `@State` はView内部のプライベートな状態にのみ使用し、必ず `private` を付ける。
2. 親から渡される読み取り専用のデータには `let` を使用し、変更可能な参照の受け渡しには `@Binding` を使用する。
3. 参照型の状態管理には、`ObservableObject` (iOS 16以前) ではなく、Swift 5.9+ の `@Observable` マクロ (iOS 17+) を標準とする。
4. `@Observable` を適用したクラスをView内で保持する場合は、`@State` を使用する。
5. アプリ全体で共有する状態は `Environment` を使用して依存性注入(DI)を行う。
6. UIの表示ロジックとビジネスロジックを分離するため、MVVMパターンまたはそれに準ずる設計を採用する。
7. ただし、過度なViewModelの作成は避け、シンプルな状態はView内で完結させる（要件に応じてTCA等の導入も検討）。
8. 複数のプレビューやテストで使い回すため、依存関係はプロトコル(Protocol)として定義しモックを注入可能にする。
9. 環境値の未注入によるクラッシュを防ぐため、独自の状態にはデフォルト値を持つ `EnvironmentKey` を定義する。
10. 状態変数の数は最小限に抑え、計算プロパティ(Computed Property)で導出可能な値は状態(`@State`)として持たない。
11. データの流れは単方向データフロー(Unidirectional Data Flow)になるよう意識する。
12. 大規模なアプリでは、Feature(機能)ごとにモジュールを分割する(Swift Package Managerの活用)。
13. 複雑な状態遷移にはステートマシンを導入し、予期せぬ状態(Invalid State)を型レベルで排除する。
14. ドメインモデルのデータ構造には参照型(`class`)ではなく、値型(`struct`)を優先して使用する。
15. `@AppStorage` は軽量な設定値の保存のみに使用し、セキュアな情報や巨大なデータは保存しない。

## 2. UI設計・View構成

1. 巨大なView(Fat View)は作成せず、意味のある小さなViewに細分化して再利用性と可読性を高める。
2. Viewの分割は関数化するのではなく、独自の `View` 構造体(Struct)に切り出す（パフォーマンス向上のため）。
3. Modifierの順序がレイアウトに与える影響（`padding` → `background` とその逆の違いなど）を正しく理解して記述する。
4. 条件分岐で異なるViewを返す場合は `@ViewBuilder` を活用する。
5. `AnyView` の使用はパフォーマンス低下と構造破壊を招くため、極力避ける（代わりに `some View` を使う）。
6. 大量のリスト表示には `VStack` + `ForEach` ではなく、メモリ効率の良い `List` または `LazyVStack` / `LazyHStack` を使用する。
7. `ForEach` の `id` には `\ .self` を避け、`Identifiable` プロトコルに準拠した一意のプロパティを指定する。
8. カスタムModifier (`ViewModifier`) を作成し、複数のViewで繰り返されるスタイリングを共通化する。
9. `GeometryReader` はレイアウトの再計算が頻発するため、他の手段で実現できない場合のみ使用し乱用しない。
10. 2次元グリッドレイアウトにはiOS 16+の `Grid`, `GridRow` や `LazyVGrid` を適切に使い分ける。
11. Viewの背景色や角丸などはハードコードせず、Asset Catalogやテーマ用の共通構造体から参照する。
12. スペースの調整には固定値ではなく、`Spacer` を活用してデバイスサイズに柔軟なレイアウトを構築する。
13. SafeAreaの無視(`.ignoresSafeArea()`)は、背景画像や地図など、本当に必要なコンポーネントにのみ適用する。
14. `ZStack` を使用する際は、要素の重なり順（Zインデックス）を意識し、必要に応じて `.zIndex()` を明示する。
15. `Group` を使用して、Modifierを複数のViewに一括適用したり、ViewBuilderの要素数制限(10個まで)を回避する。

## 3. ナビゲーション・ルーティング

1. 画面遷移には非推奨の `NavigationView` ではなく、iOS 16+ の `NavigationStack` または `NavigationSplitView` を使用する。
2. ディープリンクやプログラムからの遷移に対応するため、`NavigationPath` を用いた型安全なルーティングを実装する。
3. 遷移先のViewに直接依存関係を渡すのではなく、ルーターやコーディネーターの役割を持つコンポーネントの導入を検討する。
4. シート(`.sheet`)やフルスクリーンカバー(`.fullScreenCover`)は、状態(`isPresented` や `item`)にバインドして制御する。
5. タブナビゲーションには `TabView` を使用し、各タブの選択状態(Selection)をEnumで管理する。
6. 戻るボタンのカスタマイズには `.navigationBarBackButtonHidden(true)` とカスタムの `ToolbarItem` を組み合わせる。
7. アラート(`.alert`)やダイアログ(`.confirmationDialog`)も状態変数とバインドして宣言的に記述する。
8. 画面遷移のアニメーションは、ユーザーの操作を阻害しないよう、標準のトランジションを優先する。
9. URLスキームやUniversal Linksからの起動処理は `.onOpenURL` modifierを使用してView階層の適切な場所で捕捉する。
10. `NavigationLink` はリスト内での動作を最適化するため、値ベースの遷移(`NavigationLink(value:)`)と `navigationDestination` を使用する。

## 4. 非同期処理 (Swift Concurrency)

1. 非同期処理にはGCD(`DispatchQueue`)やCombine(Future/Promise)ではなく、Swift Concurrency (`async/await`) を標準とする。
2. Viewの表示と同時に非同期処理を開始する場合は `.onAppear` ではなく `.task` 修飾子を使用する。
3. `.task` 修飾子の「Viewが破棄された際に自動的にタスクがキャンセルされる」という利点を活かす。
4. データ競合(Data Race)を防ぐため、Mainスレッドで更新すべき状態を持つクラス(ViewModel等)には `@MainActor` を付与する。
5. 複数の独立した非同期処理を並行実行する場合は `async let` または `TaskGroup` を使用する。
6. キャンセル処理(Cancellation)を適切にハンドリングし、不要になったネットワークリクエストなどを中断する (`Task.checkCancellation()`)。
7. `actor` を利用して、共有される可変状態へのアクセスをスレッドセーフに保護する。
8. 長時間実行されるタスクは `Task.detached` ではなく、構造化された並行性(Structured Concurrency)の範囲内(`Task { }`)で実行する。
9. 非同期ストリーム(`AsyncStream`, `AsyncSequence`)を活用し、時間経過に伴う複数の値を受信する処理をシンプルに記述する。
10. レガシーなコールバックAPI(`completionHandler`)は `withCheckedContinuation` を使って `async/await` にラップする。
11. ネットワークリクエストのタイムアウトやリトライロジックは、専用の非同期関数またはライブラリで抽象化する。
12. UIの更新は必ずMain Actor上で行われることを保証する(Swift 6のStrict Concurrency Checkingを有効にする)。
13. 非同期処理内で `@Published` (または `@Observable` の状態) を更新する際は、メインスレッドへのディスパッチ漏れに注意する。
14. 画像処理などの重い同期処理は、`Task.detached` や独自のグローバルActorへオフロードし、UIスレッドをブロックしない。
15. 通知センター(NotificationCenter)の監視には `notifications()` の AsyncSequence を活用する。

## 5. パフォーマンス最適化

1. `body` プロパティ内での重い計算処理やインスタンス生成は厳禁。Viewの再評価(Re-evaluation)を高速に保つ。
2. `@State` や `@Binding` が変更されたとき、影響を受ける最小限のViewだけが再描画されるよう適切にViewを分割する。
3. 大量の画像をリストで読み込む際は、スクロールに合わせて非同期で読み込み、標準の `AsyncImage` またはNuke等のキャッシュライブラリを利用する。
4. `EquatableView` プロトコル(`.equatable()`)を活用し、値が変更されていない場合の不要な再描画を防ぐ（※現在はView分割でほぼ代用可能）。
5. Instrumentsの "SwiftUI" プロファイラを使用し、無駄なViewの再評価回数を監視・特定する。
6. オフスクリーンレンダリング(影や複雑なグラデーション)が多用される場合は、`.drawingGroup()` を適用してMetalによるキャッシュ描画を検討する。
7. 画像リソースは適切なサイズとフォーマット(HEIC, WebP, SVG/PDFのベクター)で提供し、メモリ使用量とアプリ容量を抑える。
8. `Text` ビューでの過度な文字列結合(`+`)は避け、文字列補間(`\(...)`)や `AttributedString` を正しく使う。
9. カスタムフォントや巨大なアセットのロードは、アプリ起動時ではなく必要なタイミングで行う(遅延ロード)。
10. メモリリークを防ぐため、クロージャ内での `self` のキャプチャには `[weak self]` を必要に応じて使用する（値型中心のSwiftUIでは減ったが、ViewModelやコールバックで注意）。

## 6. データ永続化・ネットワーク通信

1. 複雑なローカルDBにはCore Dataではなく、Swift 5.9+ の `SwiftData` を積極的に採用する。
2. APIとの通信には `URLSession.shared.data(from:)` などの `async/await` 対応APIを直接利用するか、APIクライアントを自作する。
3. JSONのパースには `Codable` プロトコルを使用し、APIレスポンス用モデルとアプリ内のドメインモデルは分けて定義する。
4. セキュアな情報(アクセストークンやパスワード)は `UserDefaults` ではなく `Keychain` に保存する。
5. オフライン状態(ネットワーク未接続)を `NWPathMonitor` で検知し、ユーザーに適切なUI(キャッシュ表示やエラー画面)を提供する。
6. `SwiftData` でのモデル定義では `@Model` マクロを活用し、リレーションシップや一意制約(`@Attribute(.unique)`)を適切に設定する。
7. バックグラウンドでの巨大なファイルダウンロードには `URLSessionConfiguration.background` を使用する。
8. ページネーションを実装し、一度に大量のデータをAPIから取得しないようにする。
9. URLの生成には手動での文字列結合を避け、`URLComponents` と `URLQueryItem` を使用してエンコードを安全に行う。
10. 通信エラー時は、独自のエラー型(`Error` protocolに準拠したEnum)を定義し、ユーザーフレンドリーなメッセージに変換して表示する。

## 7. アクセシビリティ・UI/UX・ローカライズ

1. VoiceOver対応のため、アイコンや画像のみのボタンには `.accessibilityLabel("意味")` を必ず設定する。
2. 装飾目的のみの画像には `.accessibilityHidden(true)` を適用し、読み上げをスキップさせる。
3. Dynamic Type(文字サイズ変更)に対応するため、フォントサイズには固定値(`Font.system(size: 20)`)ではなく、テキストスタイル(`.title`, `.body`等)を使用する。
4. コントラスト比ガイドライン(WCAG)を満たす色設定を行い、屋外や視覚障害者にも配慮した視認性を確保する。
5. タップ可能な領域(Hit Target)は、AppleのHIGに従い最低 44x44 pt を確保する (`.contentShape(Rectangle())` などを活用)。
6. 多言語対応(ローカライズ)は `Localizable.xcstrings` (String Catalog)を使用し、コード内に表示文字列をハードコードしない。
7. ダークモードをサポートし、色定義にはシステムのセマンティックカラー(例: `.primary`, `.background`)を使用するか、Asset Catalogで両モードの色を定義する。
8. 読み込み中や処理中の状態は、`ProgressView` やスケルトンスクリーンでユーザーに明示し、フリーズしていると思わせない。
9. デバイスの向き(Portrait/Landscape)やiPadのスプリットスクリーンに柔軟に対応できるレスポンシブなレイアウトを構築する。
10. エラー時や成功時など、適切なタイミングでハプティックフィードバック(`UINotificationFeedbackGenerator` など)を利用して操作感を向上させる。

## 8. テスト・開発ツール・エコシステム

1. UIのプレビューには `#Preview` マクロを活用し、さまざまな状態、ダークモード、Dynamic Typeでの表示を効率的に確認する。
2. プレビュー用のモックデータ生成ファクトリーを作成し、実際のAPIに依存せずUIコンポーネントを独立して確認できるようにする。
3. XCTestを使用してビジネスロジックやViewModelの単体テスト(Unit Test)を網羅的に記述する。
4. ネットワーク層などの外部依存はプロトコルで抽象化し、テスト時に依存を差し替え可能(Dependency Injection)にする。
5. Viewの単体テストとして ViewInspector ライブラリの導入を検討するか、スナップショットテスト(`swift-snapshot-testing`)を実施してUIの意図せぬ変更を防ぐ。
6. UIテスト(XCUITest)では、テスト要素の特定を容易にするため `.accessibilityIdentifier("ID")` を適切に付与する。
7. Xcodeの Strict Concurrency Checking (厳格な並行性チェック) を `Complete` に設定し、コンパイル時にデータ競合を排除する。
8. CI/CD環境(Xcode Cloud, GitHub Actions, Bitriseなど)を構築し、ビルド、テスト、TestFlightへの配信(Fastlane等)を自動化する。
9. SwiftLint または SwiftFormat を導入し、チーム全体でコードフォーマットの統一と静的解析を強制する。
10. 依存関係の管理は CocoaPods や Carthage ではなく、Swift Package Manager (SPM) に一本化する。
11. サードパーティライブラリへの依存は最小限に抑え、標準フレームワークで実現できないかまず検討する(特にUIコンポーネント)。
12. Crashlytics などのクラッシュレポートツールを導入し、本番環境でのエラーや非致命的例外を監視する。
13. App Store審査のリジェクトを防ぐため、Human Interface Guidelines (HIG) を熟読し遵守する。
14. 実機でのデバッグを怠らず、シミュレータでは再現しないパフォーマンス問題やメモリ警告、カメラ・GPSなどのハードウェア連携を確認する。
15. 毎年WWDCの最新セッションをチェックし、SwiftおよびSwiftUIの非推奨(Deprecated)APIからの移行を技術的負債になる前に行う。
