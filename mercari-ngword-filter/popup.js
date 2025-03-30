// ポップアップの動作を制御するスクリプト

// デバッグモード（トラブルシューティング用に true に設定）
const DEBUG_MODE = true;

// デバッグログ用関数
function log(message, type = 'info') {
  if (!DEBUG_MODE && type === 'debug') return;
  
  const prefix = type === 'error' ? '🛑' : 
                 type === 'warn' ? '⚠️' : 
                 '✓';
  
  console.log(`[NGブロッカー:Popup] ${prefix} ${message}`);
}

// グローバル変数
let trendChart = null;  // Chart.jsのインスタンス
let currentTrendData = null;  // 現在表示中のトレンドデータ
let lastFetchAttempt = 0;  // 最後のデータ取得試行時間

// 初期化ログ
log('ポップアップスクリプトを初期化しました');

// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', function() {
  log('DOM読み込み完了', 'debug');
  
  // URLパラメータからタブを取得（トレンド分析画面からの起動対応）
  const urlParams = new URLSearchParams(window.location.search);
  const activeTab = urlParams.get('tab');
  
  // 要素の参照を取得
  const ngWordsInput = document.getElementById('ngWordsInput');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');
  const countDiv = document.getElementById('ngWordCount');
  const controlPanelCheckbox = document.getElementById('controlPanel');
  const redirectHomeCheckbox = document.getElementById('redirectHome');
  
  // 必須要素がない場合はエラー
  if (!ngWordsInput || !saveButton || !statusDiv || !countDiv) {
    log('必要なDOM要素が見つかりません', 'error');
    return;
  }
  
  // タブ切り替え機能の初期化
  initializeTabs(activeTab);
  
  // 保存済みの設定を読み込む
  chrome.storage.local.get(
    [
      'customNgWords', 
      'controlPanelVisible', 
      'redirectOnNgWord',
      'isFilterActive'
    ], 
    function(result) {
      // カスタムNGワード
      if (result.customNgWords && Array.isArray(result.customNgWords)) {
        ngWordsInput.value = result.customNgWords.join('\n');
        log(`ストレージからカスタムNGワードを読み込みました: ${result.customNgWords.length}件`, 'debug');
      }
      
      // コントロールパネル表示設定
      if (controlPanelCheckbox && result.controlPanelVisible !== undefined) {
        controlPanelCheckbox.checked = result.controlPanelVisible;
        log(`ストレージからコントロールパネル設定を読み込みました: ${result.controlPanelVisible}`, 'debug');
      }
      
      // リダイレクト設定
      if (redirectHomeCheckbox && result.redirectOnNgWord !== undefined) {
        redirectHomeCheckbox.checked = result.redirectOnNgWord;
        log(`ストレージからリダイレクト設定を読み込みました: ${result.redirectOnNgWord}`, 'debug');
      }
      
      // フィルターの状態表示
      const filterStatusElem = document.getElementById('filterStatus');
      if (filterStatusElem && result.isFilterActive !== undefined) {
        filterStatusElem.textContent = result.isFilterActive ? '有効' : '無効';
        filterStatusElem.className = result.isFilterActive ? 'status-active' : 'status-inactive';
      }
    }
  );
  
  // トレンド分析の初期化
  initializeTrendAnalysis();
  
  // 保存ボタンのクリックイベント
  saveButton.addEventListener('click', function() {
    log('保存ボタンがクリックされました', 'debug');
    saveSettings();
  });
  
  // NGワードの追加（Enterキー）
  ngWordsInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
      saveButton.click();
    }
  });
  
  // 現在のNGワード数を表示
  displayNgWordCount();
  
  // 設定切り替えのイベントリスナー
  if (controlPanelCheckbox) {
    controlPanelCheckbox.addEventListener('change', function() {
      log(`コントロールパネル表示設定が変更されました: ${this.checked}`, 'debug');
      savePanelSettings();
    });
  }
  
  if (redirectHomeCheckbox) {
    redirectHomeCheckbox.addEventListener('change', function() {
      log(`リダイレクト設定が変更されました: ${this.checked}`, 'debug');
      saveRedirectSettings();
    });
  }
  
  // タブ切り替え機能
  function initializeTabs(activeTabId) {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // URLパラメータで指定されたタブがあれば、そのタブをアクティブにする
    if (activeTabId) {
      tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === activeTabId) {
          // 全てのタブの活性状態をリセット
          tabs.forEach(t => t.classList.remove('active'));
          // 指定されたタブをアクティブに
          tab.classList.add('active');
          
          // 全てのコンテンツを非表示に
          tabContents.forEach(content => {
            content.classList.remove('active');
          });
          
          // 指定されたタブのコンテンツを表示
          const targetContent = document.getElementById(activeTabId + '-tab');
          if (targetContent) {
            targetContent.classList.add('active');
          }
          
          // 「トレンド分析」タブがアクティブな場合は自動的に分析を開始
          if (activeTabId === 'analysis') {
            setTimeout(() => {
              document.getElementById('analyze-trends')?.click();
            }, 500);
          }
        }
      });
    }
    
    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        // 現在のタブから活性クラスを削除
        tabs.forEach(t => t.classList.remove('active'));
        // クリックされたタブに活性クラスを追加
        this.classList.add('active');
        
        // すべてのタブコンテンツを非表示に
        tabContents.forEach(content => {
          content.classList.remove('active');
        });
        
        // 選択されたタブのコンテンツを表示
        const tabId = this.getAttribute('data-tab');
        document.getElementById(tabId + '-tab').classList.add('active');
      });
    });
  }
  
  // NGワードの数を表示する関数
  function displayNgWordCount() {
    log('NGワード数を表示します', 'debug');
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      // メルカリのドメインかどうかをチェック（複数のドメインパターンに対応）
      const isMercariTab = tabs[0] && (
        tabs[0].url.includes('mercari.com') || 
        tabs[0].url.includes('jp.mercari.com') || 
        tabs[0].url.includes('www.mercari.com')
      );

      if (isMercariTab) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'getNgWordCount'
        }, function(response) {
          if (chrome.runtime.lastError) {
            log(`エラー: ${chrome.runtime.lastError.message}`, 'debug');
            countDiv.innerHTML = `
              <span class="count-info">
                <span class="count-number">多数</span>のNGワードが設定されています
              </span>
              <span class="status-badge">オフライン</span>
            `;
            return;
          }
            
            if (response && response.count !== undefined) {
              log(`NGワード数を受信: ${response.count}`, 'debug');
              countDiv.innerHTML = `
                <span class="count-info">
                  <span class="count-number">${response.count}</span>個のNGワードが設定されています
                </span>
                <span class="status-badge">オンライン</span>
              `;
            } else {
              log('有効なレスポンスが受信できませんでした', 'debug');
              countDiv.innerHTML = `
                <span class="count-info">
                  <span class="count-number">多数</span>のNGワードが設定されています
                </span>
                <span class="status-badge">待機中</span>
              `;
            }
          });
        } else {
          log('メルカリのタブではありません', 'debug');
          countDiv.innerHTML = `
            <span class="count-info">メルカリを開いてください</span>
            <span class="status-badge">未接続</span>
          `;
        }
      });
    }
    
  // 設定を保存する関数
  function saveSettings() {
    // テキストエリアから値を取得
    const text = ngWordsInput.value.trim();
    log(`テキストエリアから入力を取得: ${text.length}文字`, 'debug');
    
    // 改行で分割して追加NGワードの配列を作成
    const additionalNgWords = text.split('\n')
      .map(word => word.trim())
      .filter(word => word.length > 0); // 空行を除外
    
    log(`処理後のNGワード数: ${additionalNgWords.length}件`, 'debug');
    
    // ストレージに保存
    chrome.storage.local.set({customNgWords: additionalNgWords}, function() {
      log('カスタムNGワードをストレージに保存しました', 'debug');
      
      // 追加のNGワードをコンテンツスクリプトに送信
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        // メルカリのドメインかどうかをチェック（複数のドメインパターンに対応）
        const isMercariTab = tabs[0] && (
          tabs[0].url.includes('mercari.com') || 
          tabs[0].url.includes('jp.mercari.com') || 
          tabs[0].url.includes('www.mercari.com')
        );
        
        if (isMercariTab) {
          log(`メッセージ送信: updateCustomNgWords - タブID: ${tabs[0].id}`, 'debug');
          
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateCustomNgWords',
            additionalNgWords: additionalNgWords
          }, function(response) {
            if (chrome.runtime.lastError) {
              log(`エラー: ${chrome.runtime.lastError.message}`, 'debug');
              showStatus('メルカリページを再読み込みしてください', 'error');
              return;
            }
            
            if (response && response.status === 'success') {
              log('NGワードの更新に成功しました', 'debug');
              showStatus('NGワードを更新しました！ページをリロードせずに反映されます', 'success');
              
              // 他のタブにも通知
              chrome.runtime.sendMessage({
                action: 'ngWordsUpdated',
                customNgWords: additionalNgWords
              });
            } else {
              log('NGワードの更新に失敗しました', 'debug');
              showStatus('NGワードの適用に失敗しました', 'error');
            }
          });
        } else {
          log('メルカリのタブではありません', 'debug');
          showStatus('メルカリのページを開いてください', 'error');
        }
      });
    });
  }
  
  // パネル表示設定を保存する関数
  function savePanelSettings() {
    const isVisible = controlPanelCheckbox.checked;
    
    // ストレージに保存
    chrome.storage.local.set({controlPanelVisible: isVisible}, function() {
      log(`コントロールパネル表示設定を保存しました: ${isVisible}`, 'debug');
      
      // 他のタブに通知
      chrome.runtime.sendMessage({
        action: 'controlPanelUpdated',
        panelState: {
          visible: isVisible
        }
      });
      
      // 現在のタブに適用
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        // メルカリのドメインかどうかをチェック（複数のドメインパターンに対応）
        const isMercariTab = tabs[0] && (
          tabs[0].url.includes('mercari.com') || 
          tabs[0].url.includes('jp.mercari.com') || 
          tabs[0].url.includes('www.mercari.com')
        );
        
        if (isMercariTab) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateSettings',
            settings: {
              controlPanelVisible: isVisible
            }
          });
        }
      });
      
      showStatus('パネル表示設定を保存しました', 'success');
    });
  }
  
  // リダイレクト設定を保存する関数
  function saveRedirectSettings() {
    const isEnabled = redirectHomeCheckbox.checked;
    
    // ストレージに保存
    chrome.storage.local.set({redirectOnNgWord: isEnabled}, function() {
      log(`リダイレクト設定を保存しました: ${isEnabled}`, 'debug');
      
      // 現在のタブに適用
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        // メルカリのドメインかどうかをチェック（複数のドメインパターンに対応）
        const isMercariTab = tabs[0] && (
          tabs[0].url.includes('mercari.com') || 
          tabs[0].url.includes('jp.mercari.com') || 
          tabs[0].url.includes('www.mercari.com')
        );
        
        if (isMercariTab) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateSettings',
            settings: {
              redirectOnNgWord: isEnabled
            }
          });
        }
      });
      
      showStatus('リダイレクト設定を保存しました', 'success');
    });
  }
  
  // ステータスメッセージを表示する関数
  function showStatus(message, type) {
    log(`ステータスメッセージを表示: ${message} (${type})`, 'debug');
    
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    
    // 3秒後にメッセージを消す
    setTimeout(function() {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }

  // トレンド分析機能の初期化
  function initializeTrendAnalysis() {
    const analyzeButton = document.getElementById('analyze-trends');
    const categorySelect = document.getElementById('trend-category');
    const periodSelect = document.getElementById('trend-period');
    const resultsContainer = document.getElementById('trend-results');
    const chartContainer = document.getElementById('chart-container');
    const comparisonContainer = document.getElementById('amazon-comparison');
    
    if (!analyzeButton || !categorySelect || !periodSelect || !resultsContainer) {
      log('トレンド分析用のDOM要素が見つかりません', 'error');
      return;
    }
    
    // チャートタブの切り替え機能
    const chartTabs = document.querySelectorAll('.chart-tab');
    chartTabs.forEach(tab => {
      tab.addEventListener('click', function() {
        // 全てのタブのアクティブ状態をリセット
        chartTabs.forEach(t => t.classList.remove('active'));
        
        // クリックされたタブをアクティブにする
        this.classList.add('active');
        
        // 選択されたチャートタイプに基づいてチャート表示を更新
        const chartType = this.getAttribute('data-chart');
        if (currentTrendData) {
          renderChart(currentTrendData, chartType);
          
          // Amazon比較タブが選択された場合、比較セクションを表示
          if (chartType === 'comparison') {
            comparisonContainer.style.display = 'block';
          } else {
            comparisonContainer.style.display = 'none';
          }
        }
      });
    });
    
    // 分析ボタンのクリックイベント
    analyzeButton.addEventListener('click', function() {
      const category = categorySelect.value;
      const period = periodSelect.value;
      
      // 短時間での連続クリックを防止（500ms以内）
      const now = Date.now();
      if (now - lastFetchAttempt < 500) {
        log('連続クリックを防止します', 'debug');
        return;
      }
      lastFetchAttempt = now;
      
      // 読み込み中表示
      resultsContainer.innerHTML = `
        <div class="trend-loading">
          <span class="spinner"></span>
          トレンドデータを収集中...
        </div>
      `;
      
      // チャートとAmazon比較を非表示
      chartContainer.style.display = 'none';
      comparisonContainer.style.display = 'none';
      
      // トレンド情報を取得（改良版）
      fetchTrendDataImproved(category, period)
        .then(data => {
          // データをグローバル変数に保存
          currentTrendData = data;
          
          // チャートとリストを表示
          displayTrendResults(data);
        })
        .catch(error => {
          log(`トレンドデータの取得に失敗: ${error.message}`, 'error');
          
          // エラーの場合でもサンプルデータを使用して表示
          const sampleData = generateSampleData(category, period);
          currentTrendData = sampleData;
          
          // チャートとリストを表示（サンプルデータで）
          displayTrendResults(sampleData);
          
          // エラーメッセージを小さく表示
          const errorDiv = document.createElement('div');
          errorDiv.style.fontSize = '11px';
          errorDiv.style.color = '#f44336';
          errorDiv.style.textAlign = 'center';
          errorDiv.style.padding = '5px';
          errorDiv.innerHTML = `
            <span>※実データの取得に失敗したため、サンプルデータを表示しています</span>
            <button id="retry-fetch" style="border:none; background:none; color:#4CAF50; cursor:pointer; text-decoration:underline; padding:0 5px;">再試行</button>
          `;
          
          // リトライボタンのイベント
          setTimeout(() => {
            const retryButton = document.getElementById('retry-fetch');
            if (retryButton) {
              retryButton.addEventListener('click', () => {
                analyzeButton.click();
              });
            }
          }, 100);
          
          // エラーメッセージを追加
          resultsContainer.insertBefore(errorDiv, resultsContainer.firstChild);
        });
    });
    
    // トレンド分析の実行（改良版）
    async function fetchTrendDataImproved(category, period) {
      return new Promise((resolve, reject) => {
        log('トレンドデータ取得開始', 'debug');
        
        // まずはキャッシュを確認
        chrome.storage.local.get(['trendCache', 'trendCacheExpiry'], function(result) {
          // 有効なキャッシュがあれば使用する
          if (result.trendCache && result.trendCacheExpiry && Date.now() < result.trendCacheExpiry) {
            log('キャッシュからデータを使用', 'debug');
            resolve(result.trendCache);
            return;
          }
          
          // アクティブなタブを探す
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs || tabs.length === 0) {
              reject(new Error('アクティブなタブが見つかりません'));
              return;
            }
            
            const currentTab = tabs[0];
            
            // メルカリドメインかどうかをチェック（複数のドメインパターンに対応）
            const isMercariTab = currentTab.url && (
              currentTab.url.includes('mercari.com') || 
              currentTab.url.includes('jp.mercari.com') || 
              currentTab.url.includes('www.mercari.com')
            );
            
            log(`タブ情報: URL=${currentTab.url}, メルカリタブ=${isMercariTab}`, 'debug');
            
            if (!isMercariTab) {
              // メルカリタブではない場合はサンプルデータを使用
              log('メルカリタブではありません。サンプルデータを使用します', 'debug');
              const sampleData = generateSampleData(category, period);
              resolve(sampleData);
              return;
            }
            
            // タブがロード済みか確認
            if (currentTab.status !== 'complete') {
              log(`タブはまだ読み込み中です: ${currentTab.status}`, 'warn');
              // タブが完全に読み込まれるまで少し待機し、サンプルデータを使用
              const sampleData = generateSampleData(category, period);
              resolve(sampleData);
              return;
            }
            
            log(`コンテンツスクリプトにメッセージ送信: タブID=${currentTab.id}`, 'debug');
            
            // タイムアウト処理用
            let hasResponded = false;
            let timeoutId = setTimeout(() => {
              if (!hasResponded) {
                log('メッセージ応答タイムアウト', 'error');
                hasResponded = true;
                const sampleData = generateSampleData(category, period);
                resolve(sampleData);
              }
            }, 5000);
            
            // コンテンツスクリプトへメッセージを送信
            try {
              chrome.tabs.sendMessage(currentTab.id, {
                action: 'fetchTrendData',
                category: category,
                period: period
              }, function(response) {
                clearTimeout(timeoutId);
                
                if (hasResponded) return; // 既にタイムアウト処理済み
                hasResponded = true;
                
                // エラーチェック
                if (chrome.runtime.lastError) {
                  log(`メッセージ送信エラー: ${chrome.runtime.lastError.message}`, 'error');
                  
                  // コンテンツスクリプトが応答しない場合はサンプルデータを使用
                  const sampleData = generateSampleData(category, period);
                  resolve(sampleData);
                  return;
                }
                
                if (!response) {
                  log('応答がありません', 'error');
                  const sampleData = generateSampleData(category, period);
                  resolve(sampleData);
                  return;
                }
                
                log('トレンドデータレスポンス受信', 'debug');
                
                if (response.status === 'success' && response.data) {
                  // キャッシュに保存
                  chrome.storage.local.set({
                    trendCache: response.data,
                    trendCacheExpiry: Date.now() + (30 * 60 * 1000) // 30分
                  });
                  
                  resolve(response.data);
                } else {
                  log('無効なレスポンス', 'error');
                  const sampleData = generateSampleData(category, period);
                  resolve(sampleData);
                }
              });
            } catch (error) {
              log(`メッセージ送信例外: ${error.message}`, 'error');
              clearTimeout(timeoutId);
              if (!hasResponded) {
                hasResponded = true;
                const sampleData = generateSampleData(category, period);
                resolve(sampleData);
              }
            }
          });
        });
      });
    }
    
    // サンプルデータを生成
    function generateSampleData(category, period) {
      log('サンプルデータ生成中...', 'debug');
      
      const items = generateSampleItems(category, period, 20);
      
      return {
        category: getCategoryName(category),
        period: getPeriodName(period),
        timestamp: Date.now(),
        items: items,
        isSampleData: true // サンプルデータであることを示すフラグ
      };
    }
    
    // トレンド結果の表示
    function displayTrendResults(data) {
      if (!data || !data.items || data.items.length === 0) {
        resultsContainer.innerHTML = `
          <div class="trend-placeholder">
            該当するトレンドデータがありません。
          </div>
        `;
        return;
      }
      
      // グラフコンテナを表示
      chartContainer.style.display = 'block';
      
      // デフォルトのチャート（価格分布）を表示
      renderChart(data, 'price');
      
      // Amazon比較データがある場合、比較リストを更新
      updateAmazonComparison(data.items);
      
      // サンプルデータの場合の表示
      let sampleDataNotice = '';
      if (data.isSampleData) {
        sampleDataNotice = `
          <div style="font-size: 11px; color: #f57c00; text-align: center; margin-bottom: 10px; padding: 5px; background-color: #fff8e1; border-radius: 4px;">
            ※サンプルデータを表示しています
          </div>
        `;
      }
      
      // 結果リスト作成
      let listHTML = `
        ${sampleDataNotice}
        <div class="trend-header">
          <div style="margin: 15px 0 10px; font-size: 14px; font-weight: bold; color: #333;">
            ${data.category}の人気トレンド（${data.period}）
          </div>
        </div>
        <ul class="trend-list">
      `;
      
      // 各トレンドアイテムのHTMLを追加
      data.items.forEach((item, index) => {
        const rank = index + 1;
        const rankClass = rank <= 1 ? 'top-1' : (rank <= 3 ? 'top-3' : '');
        const timeAgo = getTimeAgo(new Date(item.date));
        
        // Amazonデータがあれば表示
        let amazonInfo = '';
        if (item.amazonInfo) {
          const amazonPrice = item.amazonInfo.price;
          let priceCompare = '';
          
          // メルカリとAmazonの価格を比較
          if (amazonPrice) {
            const mercariPrice = item.rawPrice || parseInt(item.price.replace(/,/g, ''));
            const amzPrice = parseInt(amazonPrice.replace(/,/g, ''));
            
            if (mercariPrice < amzPrice) {
              const diff = amzPrice - mercariPrice;
              const diffPercent = Math.round(diff / amzPrice * 100);
              priceCompare = `<span class="price-lower">Amazonより${diffPercent}%安い</span>`;
            } else if (mercariPrice > amzPrice) {
              const diff = mercariPrice - amzPrice;
              const diffPercent = Math.round(diff / mercariPrice * 100);
              priceCompare = `<span class="price-higher">Amazonより${diffPercent}%高い</span>`;
            } else {
              priceCompare = '<span class="price-equal">Amazonと同じ価格</span>';
            }
          }
          
          // Amazon情報
          amazonInfo = `
            <div class="trend-amazon-info">
              ${amazonPrice ? `<span class="amazon-price">Amazon: ¥${amazonPrice}</span>` : ''}
              ${item.amazonInfo.url ? `<a href="${item.amazonInfo.url}" target="_blank" class="amazon-link">Amazonで見る</a>` : ''}
              ${priceCompare}
            </div>
          `;
        }
        
        listHTML += `
          <li class="trend-item">
            <div class="trend-rank ${rankClass}">${rank}</div>
            <div class="trend-info">
              <div class="trend-name">${item.name}</div>
              <div class="trend-meta">
                <span>${item.category || data.category}</span>
                <span>${timeAgo}</span>
              </div>
              ${amazonInfo}
            </div>
            <div class="trend-price">¥${item.price}</div>
          </li>
        `;
      });
      
      listHTML += `</ul>`;
      
      // 結果を表示
      resultsContainer.innerHTML = listHTML;
    }
    
    // Amazonとの比較セクションを更新
    function updateAmazonComparison(items) {
      const comparisonList = document.getElementById('comparison-list');
      if (!comparisonList) return;
      
      // 比較データがあるアイテムをフィルタリング
      const itemsWithAmazon = items.filter(item => item.amazonInfo && item.amazonInfo.price);
      
      // 比較データがない場合
      if (itemsWithAmazon.length === 0) {
        comparisonList.innerHTML = '<div style="text-align: center; padding: 10px; color: #666;">Amazon比較データはありません</div>';
        return;
      }
      
      let html = '';
      
      // 各アイテムの比較データを表示
      itemsWithAmazon.forEach((item, index) => {
        const mercariPrice = item.rawPrice || parseInt(item.price.replace(/,/g, ''));
        const amazonPrice = parseInt(item.amazonInfo.price.replace(/,/g, ''));
        
        let diffClass = '';
        let diffText = '';
        
        if (mercariPrice < amazonPrice) {
          const diff = amazonPrice - mercariPrice;
          const diffPercent = Math.round(diff / amazonPrice * 100);
          diffClass = 'price-lower';
          diffText = `${diffPercent}%安い`;
        } else if (mercariPrice > amazonPrice) {
          const diff = mercariPrice - amazonPrice;
          const diffPercent = Math.round(diff / mercariPrice * 100);
          diffClass = 'price-higher';
          diffText = `${diffPercent}%高い`;
        } else {
          diffClass = 'price-equal';
          diffText = '同じ価格';
        }
        
        html += `
          <div class="comparison-item">
            <div>${item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}</div>
            <div>
              <span>メルカリ: ¥${item.price}</span>
              <span>Amazon: ¥${item.amazonInfo.price}</span>
              <span class="price-difference ${diffClass}">${diffText}</span>
            </div>
          </div>
        `;
      });
      
      comparisonList.innerHTML = html;
    }
    
    // チャートをレンダリング
    function renderChart(data, chartType) {
      const ctx = document.getElementById('trend-chart').getContext('2d');
      
      // 既存のチャートがあれば破棄
      if (trendChart) {
        trendChart.destroy();
      }
      
      // チャートタイプに応じたデータとオプションを生成
      let chartData, chartOptions;
      
      switch (chartType) {
        case 'price':
          // 価格分布チャート
          const priceRanges = getPriceRanges(data.items);
          chartData = {
            labels: priceRanges.labels,
            datasets: [{
              label: '価格分布',
              data: priceRanges.counts,
              backgroundColor: 'rgba(76, 175, 80, 0.6)',
              borderColor: 'rgba(76, 175, 80, 1)',
              borderWidth: 1
            }]
          };
          
          chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: '価格分布'
              },
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `${context.raw}件`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: '商品数'
                },
                ticks: {
                  precision: 0
                }
              },
              x: {
                title: {
                  display: true,
                  text: '価格帯'
                }
              }
            }
          };
          break;
          
        case 'category':
          // カテゴリ分布チャート
          const categories = getCategoryDistribution(data.items);
          chartData = {
            labels: categories.labels,
            datasets: [{
              label: 'カテゴリ分布',
              data: categories.counts,
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
                'rgba(255, 159, 64, 0.6)',
                'rgba(76, 175, 80, 0.6)'
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(76, 175, 80, 1)'
              ],
              borderWidth: 1
            }]
          };
          
          chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'カテゴリ分布'
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `${context.label}: ${context.raw}件`;
                  }
                }
              }
            }
          };
          break;
          
        case 'comparison':
          // Amazonとの価格比較チャート
          const comparisonData = getAmazonComparison(data.items);
          chartData = {
            labels: comparisonData.labels,
            datasets: [
              {
                label: 'メルカリ価格',
                data: comparisonData.mercariPrices,
                backgroundColor: 'rgba(76, 175, 80, 0.6)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 1
              },
              {
                label: 'Amazon価格',
                data: comparisonData.amazonPrices,
                backgroundColor: 'rgba(255, 152, 0, 0.6)',
                borderColor: 'rgba(255, 152, 0, 1)',
                borderWidth: 1
              }
            ]
          };
          
          chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'メルカリとAmazonの価格比較'
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `${context.dataset.label}: ¥${context.raw.toLocaleString()}`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: '価格 (円)'
                },
                ticks: {
                  callback: function(value) {
                    return '¥' + value.toLocaleString();
                  }
                }
              }
            }
          };
          break;
      }
      
      // チャートを作成
      trendChart = new Chart(ctx, {
        type: chartType === 'category' ? 'pie' : 'bar',
        data: chartData,
        options: chartOptions
      });
    }
    
    // 価格帯ごとの商品数を集計
    function getPriceRanges(items) {
      // 価格帯の定義
      const ranges = [
        { max: 1000, label: '～1,000円' },
        { max: 3000, label: '～3,000円' },
        { max: 5000, label: '～5,000円' },
        { max: 10000, label: '～10,000円' },
        { max: 30000, label: '～30,000円' },
        { max: 50000, label: '～50,000円' },
        { max: Infinity, label: '50,000円～' }
      ];
      
      // 各価格帯ごとにカウント
      const counts = new Array(ranges.length).fill(0);
      
      items.forEach(item => {
        const price = item.rawPrice || parseInt(item.price.replace(/,/g, ''));
        
        for (let i = 0; i < ranges.length; i++) {
          if (price <= ranges[i].max) {
            counts[i]++;
            break;
          }
        }
      });
      
      return {
        labels: ranges.map(r => r.label),
        counts: counts
      };
    }
    
    // カテゴリごとの商品数を集計
    function getCategoryDistribution(items) {
      // カテゴリごとに集計
      const categoryCounts = {};
      
      items.forEach(item => {
        const category = item.category || '不明';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      // 上位カテゴリを抽出（最大6カテゴリ、それ以外は「その他」としてまとめる）
      const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1]);
      
      const topCategories = sortedCategories.slice(0, 6);
      const otherCount = sortedCategories.slice(6)
        .reduce((sum, [_, count]) => sum + count, 0);
      
      const labels = topCategories.map(([category]) => category);
      const counts = topCategories.map(([_, count]) => count);
      
      // 「その他」があれば追加
      if (otherCount > 0) {
        labels.push('その他');
        counts.push(otherCount);
      }
      
      return { labels, counts };
    }
    
    // Amazonとの価格比較データを生成
    function getAmazonComparison(items) {
      // Amazon価格データがある商品のみ抽出
      const itemsWithAmazon = items.filter(item => 
        item.amazonInfo && item.amazonInfo.price
      ).slice(0, 10); // 最大10件まで
      
      const labels = itemsWithAmazon.map(item => 
        item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name
      );
      
      const mercariPrices = itemsWithAmazon.map(item => 
        item.rawPrice || parseInt(item.price.replace(/,/g, ''))
      );
      
      const amazonPrices = itemsWithAmazon.map(item => 
        parseInt(item.amazonInfo.price.replace(/,/g, ''))
      );
      
      return {
        labels,
        mercariPrices,
        amazonPrices
      };
    }
    
    // サンプルの商品データを生成
    function generateSampleItems(category, period, count) {
      // サンプルのブランド名
      const brands = ['Apple', 'Nintendo', 'Sony', 'NIKE', 'adidas', 'UNIQLO', 'MUJI', 'LEGO', 'Disney', 'ZARA'];
      
      // サンプル商品タイプ
      let productTypes = [];
      
      // カテゴリによって商品タイプを変更
      switch (category) {
        case '1': // レディース
          productTypes = ['ワンピース', 'スカート', 'バッグ', 'コート', 'ニット', 'パンプス', 'サンダル', 'ジャケット'];
          break;
        case '2': // メンズ
          productTypes = ['シャツ', 'パンツ', 'スニーカー', 'ジャケット', 'コート', 'バッグ', 'スーツ', 'ネクタイ'];
          break;
        case '8': // 家電・スマホ
          productTypes = ['スマホ', 'タブレット', 'イヤホン', 'ノートPC', 'ヘッドホン', 'スマートウォッチ', 'カメラ', '掃除機'];
          break;
        case '6': // おもちゃ・ホビー
          productTypes = ['フィギュア', 'プラモデル', 'ゲーム', 'カードゲーム', 'ぬいぐるみ', 'ミニカー', 'ドローン', 'ラジコン'];
          break;
        default:
          productTypes = ['シャツ', 'バッグ', 'スニーカー', 'ワンピース', 'フィギュア', 'スマホ', 'ゲーム', 'イヤホン'];
      }
      
      // サンプル商品を生成
      const items = [];
      for (let i = 0; i < count; i++) {
        // ランダムな商品名の生成
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const type = productTypes[Math.floor(Math.random() * productTypes.length)];
        const name = `${brand} ${type} ${Math.floor(Math.random() * 1000)}`;
        
        // ランダムな価格
        const basePrice = 1000 + Math.floor(Math.random() * 20000);
        
        // ランダムな日時（最近の2週間以内）
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 14));
        
        // 商品IDを生成
        const id = 'm' + Math.floor(Math.random() * 1000000000);
        
        // Amazonの価格情報を生成（70%の確率で）
        let amazonInfo = null;
        if (Math.random() < 0.7) {
          // ランダムなAmazon価格（メルカリより高いか低いかランダム）
          const priceVariation = Math.random() > 0.5 ? 0.8 + Math.random() * 0.4 : 1 + Math.random() * 0.5;
          const amazonPrice = Math.floor(basePrice * priceVariation);
          
          amazonInfo = {
            price: amazonPrice.toLocaleString(),
            url: `https://www.amazon.co.jp/s?k=${encodeURIComponent(name)}`,
            available: Math.random() > 0.2,
            prime: Math.random() > 0.5,
            reviewCount: Math.floor(Math.random() * 1000),
            rating: (3 + Math.random() * 2).toFixed(1)
          };
        }
        
        // 商品情報を作成
        items.push({
          id,
          name,
          price: basePrice.toLocaleString(),
          rawPrice: basePrice,
          imageUrl: `https://placehold.jp/150x150.png?text=${encodeURIComponent(brand)}`,
          url: `https://jp.mercari.com/item/${id}`,
          category: getCategoryName(category),
          source: 'mercari',
          date: date.toISOString(),
          views: 100 + Math.floor(Math.random() * 1000),
          likeCount: Math.floor(Math.random() * 50),
          amazonInfo: amazonInfo
        });
      }
      
      return items;
    }
  }
  
  // カテゴリIDから名前を取得
  function getCategoryName(categoryId) {
    const categories = {
      'all': 'すべてのカテゴリ',
      '1': 'レディース',
      '2': 'メンズ',
      '3': 'ベビー・キッズ',
      '4': 'インテリア・住まい',
      '5': '本・音楽・ゲーム',
      '6': 'おもちゃ・ホビー',
      '7': 'コスメ・香水・美容',
      '8': '家電・スマホ・カメラ',
      '9': 'スポーツ・レジャー',
      '10': 'ハンドメイド',
      '11': '自動車・バイク',
      '12': 'その他'
    };
    
    return categories[categoryId] || 'すべてのカテゴリ';
  }
  
  // 期間IDから名前を取得
  function getPeriodName(periodId) {
    const periods = {
      'daily': '24時間',
      'weekly': '1週間',
      'monthly': '1ヶ月'
    };
    
    return periods[periodId] || '24時間';
  }
  
  // 日付から経過時間を表示用のテキストに変換
  function getTimeAgo(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}日前`;
    } else if (hours > 0) {
      return `${hours}時間前`;
    } else if (minutes > 0) {
      return `${minutes}分前`;
    } else {
      return 'たった今';
    }
  }
});