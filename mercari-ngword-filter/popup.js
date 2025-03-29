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
});