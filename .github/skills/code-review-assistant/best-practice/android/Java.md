# Android開発ベストプラクティス

## Java + XML レイアウト パターン

### 1. XMLレイアウト・View最適化

1. ネストの深い `LinearLayout` の多用を避け、フラットな `ConstraintLayout` を使用する
2. 再利用可能なレイアウト部品は `<include>` タグで別ファイル化する
3. `<include>` 展開時の不要な親階層を排除するため `<merge>` タグを利用する
4. 条件によって表示する重いViewには、遅延インフレートを行う `ViewStub` を使用する
5. `ConstraintLayout` 内のサイズ指定では、`match_parent` ではなく `0dp` (`match_constraint`) を使用する
6. `ConstraintLayout` の `GuideLine` を使用して、パーセンテージベースの配置を行う
7. 複数のViewの表示状態をまとめて切り替える場合は `Group` を活用する
8. 動的なテキストサイズが変わるレイアウトには `Barrier` を使用してレイアウト崩れを防ぐ
9. 単純なViewの重ね合わせには `FrameLayout` を使用し、処理コストを抑える
10. `Space` ウィジェットを使用して、背景描画が不要な空白領域を作成する
11. ViewのIDは `camelCase` または `snake_case` にチーム内で統一する（例: `tv_title`）
12. プレビュー時のみ必要なテキストや画像には `tools:text` や `tools:src` を使用する
13. Lintの「Overdraw（過剰描画）」警告に注意し、不要な `android:background` 指定を削除する
14. マージンやパディングの数値は直書きせず、`dimens.xml` に定義する
15. XMLのネームスペースには標準の `xmlns:android` と `xmlns:app` を正しく使い分ける
16. アニメーションを伴うレイアウト変更には `animateLayoutChanges="true"` や `TransitionManager` を使う
17. リスト表示には必ず `RecyclerView` を使用し、`ListView` や `GridView` は使用しない
18. `RecyclerView` のパフォーマンス向上のため `setHasFixedSize(true)` を設定する(サイズ固定の場合)
19. `RecyclerView` のデータ更新には `notifyDataSetChanged()` を避け、`DiffUtil` を使用する
20. `RecyclerView` のアイテム間の区切り線には `ItemDecoration` を利用する

### 2. Java言語・メモリ管理

1. メモリリークを防ぐため、ActivityやViewのコンテキストをstatic変数に保持しない
2. 長寿命なオブジェクト(Singletonなど)には `ApplicationContext` を使用する
3. バックグラウンドスレッドからUIを操作する際は、必ず `runOnUiThread` や Handler を使用する
4. `String` の頻繁な結合には `StringBuilder` または `StringBuffer` を使用する
5. コールバックやリスナーによるメモリリークを防ぐため、必要に応じて `WeakReference` を利用する
6. ストリームやカーソル(Cursor)などのI/Oリソースは `try-with-resources` 文を使用して確実に閉じる
7. 大量のオブジェクト生成によるメモリチャーン(Memory Churn)を防ぐため、オブジェクトプールを検討する
8. `onDraw` メソッド内でのオブジェクト(PaintやRectなど)の `new` インスタンス化を絶対に避ける
9. リフレクションの使用はパフォーマンス低下を招くため最小限に抑える
10. nullチェックを徹底し、必要に応じて `@NonNull` や `@Nullable` アノテーションを付与する

### 3. リソース管理・テーマ

1. ハードコードされた文字列は避け、すべて `strings.xml` で管理する
2. 複数形の文字列処理には、独自のロジックではなく `plurals` (Quantity Strings)を使用する
3. 動的な文字列の挿入には `getString(R.string.format, arg)` とプレースホルダー `%s`, `%d` を使用する
4. 解像度に依存しない描画には Vector Drawable (SVG/XML) を使用する
5. ラスター画像を使用する場合は、PNGやJPEGよりも圧縮効率の高い WebP フォーマットを採用する
6. アプリアイコンは `mipmap` フォルダに配置し、通常の画像は `drawable` フォルダに配置する
7. カスタムViewの属性定義には `attrs.xml` を使用し、`TypedArray` で取得後は必ず `recycle()` を呼ぶ
8. テーマ設定は `themes.xml` に集約し、全画面共通のデザインルールを定義する
9. ボタン等の状態(pressed, focused, disabled)に応じた見た目は StateListDrawable (selector) で実装する
10. 色覚多様性に配慮し、意味を伝える手段として「色」だけに依存しないデザインにする

### 4. アーキテクチャ・ライフサイクル

1. Activity/Fragmentを巨大化させない（Fat Activityの回避）ため、MVPまたはMVVMパターンを採用する
2. 画面の回転やOSによるプロセス破棄に備え、`onSaveInstanceState` で重要な状態を保存・復元する
3. UIのデータ監視には `LiveData` を使用し、ライフサイクルに応じた安全なデータ更新を行う
4. ViewModelを使用して、設定変更（画面回転など）を跨いでデータを保持する
5. `findViewById` による型安全性の欠如とボイラープレートを排除するため、View Binding を導入する
6. Fragmentの生成にはコンストラクタで引数を渡さず、`newInstance` パターンと `setArguments` を使う
7. ActivityとFragment間の通信には、インターフェースまたは共有ViewModelを使用する
8. Fragment内で子のFragmentを管理する場合は、必ず `getChildFragmentManager` を使用する
9. ライフサイクルを監視するコンポーネントには `LifecycleObserver` を実装する
10. バックグラウンドの非同期処理に非推奨の `AsyncTask` は使わず、`ExecutorService` や RxJava を使用する

### 5. バックグラウンド処理・インテント

1. 定期的なバックグラウンド処理や遅延実行には `WorkManager` を使用する
2. 正確な時刻での実行が必要な場合のみ `AlarmManager` を使用する
3. Serviceを実行する際は、OSのバックグラウンド制限に注意し、必要ならForeground Serviceを検討する
4. BroadcastReceiverの登録は、用途に応じてManifestへの静的登録とコードでの動的登録を使い分ける
5. 画面遷移のIntentには、適切な `Intent.FLAG_ACTIVITY_*` を設定してタスクスタックを管理する
6. プロセス間通信(IPC)やインテントで複雑なオブジェクトを渡す際は、Serializableではなく `Parcelable` を実装する
7. PendingIntentを生成する際は、セキュリティの観点から必ず `FLAG_IMMUTABLE` または `FLAG_MUTABLE` を明示する
8. 通知(Notification)を送信する際は、Android 8.0以降必須のNotification Channelを適切に設定・分類する
9. 実行時パーミッション(Runtime Permissions)の要求では、ユーザーが拒否した場合のRationale(理由)を適切に表示する
10. SharedPreferencesへの書き込みは、同期的な `commit()` ではなく非同期の `apply()` を使用する

### 6. ライブラリ・DI・通信

1. ネットワーク通信には Retrofit と OkHttp を使用し、直接 `HttpURLConnection` を操作しない
2. OkHttpの `HttpLoggingInterceptor` を導入し、デバッグビルド時のみAPI通信のログを出力する
3. 画像の読み込みとキャッシュ管理には Glide または Picasso ライブラリを使用する
4. JSONのパースには Gson, Jackson, または Moshi などのライブラリを活用する
5. 依存性注入(DI)には Dagger 2 または Hilt を導入し、クラス間の結合度を下げる
6. RxJavaを使用する際は、`CompositeDisposable` を使用してActivity破棄時に必ず購読を解除する
7. RxJavaのスケジューラ切り替えにおいて、UI操作は必ず `AndroidSchedulers.mainThread()` に戻す
8. データベースには生の `SQLiteOpenHelper` を使用せず、ORマッパーである Room (Java版) を導入する
9. Roomのデータベースアクセスはメインスレッドで実行するとクラッシュするため、必ず非同期で実行する
10. ButterKnifeなどの古いアノテーションプロセッサは非推奨のため、View Bindingに移行する

### 7. セキュリティ・デバッグ

1. SharedPreferencesに機密データを保存する場合は `EncryptedSharedPreferences` を使用する
2. ログ出力（`Log.d` など）にはTimberなどのライブラリを使用し、リリースビルドでは出力されないようにする
3. 開発中には `StrictMode` を有効にし、メインスレッドでのディスクI/Oやネットワーク通信を検知する
4. セキュアな乱数生成には `java.util.Random` ではなく `java.security.SecureRandom` を使用する
5. WebViewを使用する際は、XSS攻撃を防ぐため不要な場合は `setJavaScriptEnabled(false)` にする
6. WebViewでローカルファイルをロードさせない場合、ファイルアクセス権限を無効化する
7. 外部からの不正なIntentを受け取らないよう、Manifestの `android:exported` 属性を適切に明示する
8. Android StudioのProfilerを使用して、CPU、メモリ、ネットワークのパフォーマンスボトルネックを特定する
9. Layout Inspectorを使用して、実行時のView階層やマージンのズレをデバッグする
10. BuildConfig.DEBUG フラグを活用し、開発環境と本番環境のAPIエンドポイントや動作を切り替える

### 8. テスト・品質保証

1. JUnit 4 を使用して、ビジネスロジックの単体テストを記述する
2. Mockito を導入し、依存クラスをモック化してテストの独立性を確保する
3. Espresso を使用して、UIの自動化テスト（クリック、テキスト入力、アサーション）を実装する
4. テストコード内で非同期処理を待機する場合は `Thread.sleep` ではなく `IdlingResource` を使用する
5. Firebase Test Lab などを利用して、多様な実機端末でのクラッシュテストを行う
6. 多言語対応のテストとして、擬似ロケール(Pseudolocales)を有効にしてレイアウト崩れを確認する
7. RTL(Right-to-Left)レイアウトをサポートし、`paddingLeft/Right` ではなく `paddingStart/End` を使用する
8. テストしやすいコード設計にするため、staticメソッドやGod Classの作成を避ける
9. `ActivityScenario` を使用して、Activity単体のライフサイクルや状態遷移をテストする
10. カスタムViewを作成した際は、測定(`onMeasure`)やレイアウト(`onLayout`)の挙動を個別にテストする

### 9. レガシーコードからの脱却・その他

1. 古い `android.support.*` ライブラリは使用せず、完全に `androidx.*` (Jetpack)へ移行する
2. `onActivityResult` ではなく、新しい `ActivityResultContracts` API を使用して結果を受け取る
3. `FragmentPagerAdapter` は非推奨のため、`ViewPager2` と `FragmentStateAdapter` に移行する
4. ハードウェアアクセラレーションを活用し、UIの描画パフォーマンスを向上させる
5. カスタムViewの描画更新は、同期的な `invalidate()` と非同期の `postInvalidate()` を正しく使い分ける
6. 不要なレイアウトパスを避けるため、頻繁な `requestLayout()` の呼び出しを抑制する
7. Javaの標準の `java.util.Date` ではなく `java.time` (ThreeTenABPやDesugaring) を使用する
8. 例外を握りつぶさない（空の `catch` ブロックを作らない）。最低限ログを出力するか上位へ投げる
9. ユーザーの入力データは常にバリデーションを行い、不正なデータによるクラッシュを防ぐ
10. アプリのビルド設定(compileSdkVersion, targetSdkVersion)は、年に一度は最新のAndroid OSレベルに更新する
