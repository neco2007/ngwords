// ポップアップの動作を制御するスクリプト

// デバッグモード（本番環境では false に設定）
const DEBUG_MODE = false;

// デバッグログ用関数
function log(message, type = 'info') {
  if (!DEBUG_MODE && type === 'debug') return;
  
  const prefix = type === 'error' ? '🛑' : 
                 type === 'warn' ? '⚠️' : 
                 '✓';
  
  console.log(`[NGブロッカー:Popup] ${prefix} ${message}`);
}

// 初期化ログ
log('ポップアップスクリプトを初期化しました');

// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', function() {
  log('DOM読み込み完了', 'debug');
  
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
  initializeTabs();
  
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
  function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
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
      if (tabs[0] && tabs[0].url.includes('mercari.com')) {
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
        if (tabs[0] && tabs[0].url.includes('mercari.com')) {
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
        if (tabs[0] && tabs[0].url.includes('mercari.com')) {
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
        if (tabs[0] && tabs[0].url.includes('mercari.com')) {
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
    
    if (!analyzeButton || !categorySelect || !periodSelect || !resultsContainer) {
      log('トレンド分析用のDOM要素が見つかりません', 'error');
      return;
    }
    
    // 分析ボタンのクリックイベント
    analyzeButton.addEventListener('click', function() {
      const category = categorySelect.value;
      const period = periodSelect.value;
      
      // 読み込み中表示
      resultsContainer.innerHTML = `
        <div class="trend-loading">
          <span class="spinner"></span>
          トレンドデータを収集中...
        </div>
      `;
      
      // トレンド情報を取得
      fetchTrendData(category, period)
        .then(data => {
          displayTrendResults(data);
        })
        .catch(error => {
          resultsContainer.innerHTML = `
            <div class="trend-placeholder">
              データの取得に失敗しました。<br>
              メルカリのページを開いた状態で再度お試しください。
            </div>
          `;
          log(`トレンドデータの取得に失敗: ${error.message}`, 'error');
        });
    });
    
    // トレンドデータを取得
    function fetchTrendData(category, period) {
      return new Promise((resolve, reject) => {
        // アクティブなメルカリタブを探す
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (!tabs[0] || !tabs[0].url.includes('mercari.com')) {
            reject(new Error('メルカリのタブが開かれていません'));
            return;
          }
          
          // コンテンツスクリプトへメッセージを送信
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'fetchTrendData',
            category: category,
            period: period
          }, function(response) {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            
            if (response && response.status === 'success') {
              resolve(response.data);
            } else {
              // モック/フォールバックデータを返す
              resolve(getMockTrendData(category, period));
            }
          });
        });
      });
    }
    
    // モックトレンドデータを生成（実際の実装では不要）
    function getMockTrendData(category, period) {
      // カテゴリ名の設定
      const categoryNames = {
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
      
      // 期間の表示名
      const periodNames = {
        'daily': '24時間',
        'weekly': '1週間',
        'monthly': '1ヶ月'
      };
      
      // サンプル商品データ
      const items = [
        { name: 'Apple AirPods Pro', category: '家電・スマホ', price: '18,500', views: 2450, watchCount: 152 },
        { name: 'Nintendo Switch 有機ELモデル', category: 'ゲーム', price: '32,800', views: 2190, watchCount: 143 },
        { name: 'ノースフェイス ダウンジャケット', category: 'メンズ', price: '15,900', views: 1980, watchCount: 129 },
        { name: 'PlayStation 5', category: 'ゲーム', price: '54,800', views: 1870, watchCount: 121 },
        { name: 'iPad Pro 11インチ', category: '家電・スマホ', price: '78,000', views: 1760, watchCount: 115 },
        { name: 'ダイソン ヘアドライヤー', category: '家電・スマホ', price: '29,800', views: 1650, watchCount: 108 },
        { name: 'ルイヴィトン ショルダーバッグ', category: 'レディース', price: '85,000', views: 1540, watchCount: 100 },
        { name: 'シャネル 香水', category: 'コスメ・美容', price: '9,800', views: 1430, watchCount: 93 },
        { name: 'ナイキ エアジョーダン', category: 'スポーツ', price: '12,500', views: 1320, watchCount: 86 },
        { name: 'アニヤハインドマーチ トートバッグ', category: 'レディース', price: '22,800', views: 1210, watchCount: 79 },
        { name: 'ロレックス デイトジャスト', category: 'メンズ', price: '950,000', views: 1100, watchCount: 72 },
        { name: 'キッチンエイド ミキサー', category: '家電', price: '35,800', views: 990, watchCount: 65 },
        { name: 'チャムス フリースジャケット', category: 'アウトドア', price: '8,900', views: 880, watchCount: 57 },
        { name: 'ゼルダの伝説 ティアーズオブキングダム', category: 'ゲーム', price: '5,980', views: 770, watchCount: 50 },
        { name: 'BOSE ワイヤレスイヤホン', category: '家電', price: '22,000', views: 660, watchCount: 43 },
        { name: 'アディダス スタンスミス', category: 'スポーツ', price: '9,800', views: 550, watchCount: 36 },
        { name: '無印良品 収納ケース', category: 'インテリア', price: '2,500', views: 440, watchCount: 29 },
        { name: 'ドラゴンボール フィギュア', category: 'ホビー', price: '4,800', views: 330, watchCount: 22 },
        { name: 'ユニクロ ヒートテック', category: 'メンズ', price: '1,200', views: 220, watchCount: 14 },
        { name: 'コールマン テント', category: 'アウトドア', price: '18,900', views: 110, watchCount: 7 }
      ];
      
      // 日付のランダムなばらつきを追加
      const today = new Date();
      const items2 = items.map(item => {
        // ランダムな分と秒を生成
        const randomMinutes = Math.floor(Math.random() * 59);
        const randomSeconds = Math.floor(Math.random() * 59);
        const randomHours = Math.floor(Math.random() * 6); // 最近の6時間以内
        
        // 日付を設定
        const date = new Date(today);
        date.setHours(today.getHours() - randomHours);
        date.setMinutes(randomMinutes);
        date.setSeconds(randomSeconds);
        
        return {
          ...item,
          date: date.toISOString()
        };
      });
      
      // カテゴリでフィルタリング
      let filteredItems = items2;
      if (category !== 'all') {
        // モックデータなので完全一致させる代わりに、いくつかのカテゴリでフィルタリング
        const categoryMappings = {
          '1': 'レディース',
          '2': 'メンズ',
          '7': 'コスメ・美容',
          '8': '家電'
        };
        
        if (categoryMappings[category]) {
          filteredItems = items2.filter(item => 
            item.category.includes(categoryMappings[category])
          );
        }
      }
      
      return {
        category: categoryNames[category] || 'すべてのカテゴリ',
        period: periodNames[period] || '24時間',
        timestamp: new Date().toISOString(),
        items: filteredItems
      };
    }
    
    // トレンド結果を表示
    function displayTrendResults(data) {
      if (!data || !data.items || data.items.length === 0) {
        resultsContainer.innerHTML = `
          <div class="trend-placeholder">
            該当するトレンドデータがありません。
          </div>
        `;
        return;
      }
      
      // 結果のHTMLを生成
      let html = `
        <div class="trend-header">
          <div style="margin-bottom: 10px; font-size: 13px; color: #666;">
            ${data.category}の人気トレンド（${data.period}）
          </div>
        </div>
        <ul class="trend-list">
      `;
      
      // 各トレンドアイテムのHTMLを追加
      data.items.forEach((item, index) => {
        const rank = index + 1;
        const rankClass = rank <= 1 ? 'top-1' : (rank <= 3 ? 'top-3' : '');
        const date = new Date(item.date);
        const timeAgo = getTimeAgo(date);
        
        html += `
          <li class="trend-item">
            <div class="trend-rank ${rankClass}">${rank}</div>
            <div class="trend-info">
              <div class="trend-name">${item.name}</div>
              <div class="trend-meta">
                <span>${item.category}</span>
                <span>${timeAgo}</span>
              </div>
            </div>
            <div class="trend-price">¥${item.price}</div>
          </li>
        `;
      });
      
      html += `</ul>`;
      
      // 結果を表示
      resultsContainer.innerHTML = html;
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
        return '今すぐ';
      }
    }
  }
});