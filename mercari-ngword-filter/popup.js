// ポップアップの動作を制御するスクリプト

// デバッグログ用関数
function debugLog(message) {
  console.log(`[NGブロッカー:Popup] ${message}`);
}

// 初期化ログ
debugLog('ポップアップスクリプトを初期化しました');

// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', function() {
  debugLog('DOM読み込み完了');
  
  // 要素の参照を取得
  const ngWordsInput = document.getElementById('ngWordsInput');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');
  const countDiv = document.getElementById('ngWordCount');
  const blockModeSelect = document.getElementById('blockMode');
  const blockStrengthSelect = document.getElementById('blockStrength');
  const useControlPanelCheckbox = document.getElementById('useControlPanel');
  
  if (!ngWordsInput || !saveButton || !statusDiv || !countDiv) {
    console.error('[NGブロッカー:Popup] 必要なDOM要素が見つかりません');
    return;
  }
  
  debugLog('DOM要素の参照を取得しました');
  
  // 保存済みの設定を読み込む
  chrome.storage.local.get(
    ['customNgWords', 'blockMode', 'blockStrength', 'controlPanelVisible'], 
    function(result) {
      // カスタムNGワード
      if (result.customNgWords && Array.isArray(result.customNgWords)) {
        ngWordsInput.value = result.customNgWords.join('\n');
        debugLog(`ストレージからカスタムNGワードを読み込みました: ${result.customNgWords.length}件`);
      } else {
        debugLog('ストレージにカスタムNGワードがありません');
      }
      
      // ブロックモード
      if (result.blockMode && blockModeSelect) {
        blockModeSelect.value = result.blockMode;
        debugLog(`ストレージからブロックモードを読み込みました: ${result.blockMode}`);
      }
      
      // ブロック強度
      if (result.blockStrength && blockStrengthSelect) {
        blockStrengthSelect.value = result.blockStrength;
        debugLog(`ストレージからブロック強度を読み込みました: ${result.blockStrength}`);
      }
      
      // コントロールパネル表示設定
      if (useControlPanelCheckbox && result.controlPanelVisible !== undefined) {
        useControlPanelCheckbox.checked = result.controlPanelVisible;
        debugLog(`ストレージからコントロールパネル設定を読み込みました: ${result.controlPanelVisible}`);
      }
    }
  );
  
  // 保存ボタンのクリックイベント
  saveButton.addEventListener('click', function() {
    debugLog('保存ボタンがクリックされました');
    saveSettings();
  });
  
  // 現在のNGワード数を表示
  displayNgWordCount();
  
  // ブロックモード変更イベント
  if (blockModeSelect) {
    blockModeSelect.addEventListener('change', function() {
      debugLog(`ブロックモードが変更されました: ${this.value}`);
    });
  }
  
  // ブロック強度変更イベント
  if (blockStrengthSelect) {
    blockStrengthSelect.addEventListener('change', function() {
      debugLog(`ブロック強度が変更されました: ${this.value}`);
    });
  }
  
  // コントロールパネル表示設定変更イベント
  if (useControlPanelCheckbox) {
    useControlPanelCheckbox.addEventListener('change', function() {
      debugLog(`コントロールパネル表示設定が変更されました: ${this.checked}`);
    });
  }
  
  // NGワードの数を表示する関数
  function displayNgWordCount() {
    debugLog('NGワード数を表示します');
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('mercari.com')) {
        debugLog(`アクティブタブ: ${tabs[0].url}`);
        
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'getNgWordCount'
        }, function(response) {
          if (chrome.runtime.lastError) {
            debugLog(`エラー: ${chrome.runtime.lastError.message}`);
            countDiv.textContent = 'メルカリNGワードブロッカーが有効です';
            return;
          }
          
          if (response && response.count !== undefined) {
            debugLog(`NGワード数を受信: ${response.count}`);
            countDiv.textContent = `デフォルトで${response.count}個のNGワードが設定されています`;
          } else {
            debugLog('有効なレスポンスが受信できませんでした');
            countDiv.textContent = 'デフォルトのNGワードが多数設定されています';
          }
        });
      } else {
        debugLog('メルカリのタブではありません');
        countDiv.textContent = 'メルカリを開いてください';
      }
    });
  }
  
  // 設定を保存する関数
  function saveSettings() {
    debugLog('設定を保存します');
    
    // テキストエリアから値を取得
    const text = ngWordsInput.value.trim();
    debugLog(`テキストエリアから入力を取得: ${text.length}文字`);
    
    // 改行で分割して追加NGワードの配列を作成
    const additionalNgWords = text.split('\n')
      .map(word => word.trim())
      .filter(word => word.length > 0); // 空行を除外
    
    debugLog(`処理後のNGワード数: ${additionalNgWords.length}件`);
    
    // 他の設定値を取得
    const settings = {
      customNgWords: additionalNgWords
    };
    
    // ブロックモード
    if (blockModeSelect) {
      settings.blockMode = blockModeSelect.value;
    }
    
    // ブロック強度
    if (blockStrengthSelect) {
      settings.blockStrength = blockStrengthSelect.value;
    }
    
    // コントロールパネル表示設定
    if (useControlPanelCheckbox) {
      settings.controlPanelVisible = useControlPanelCheckbox.checked;
    }
    
    // ストレージに保存
    chrome.storage.local.set(settings, function() {
      debugLog('設定をストレージに保存しました');
      
      // 設定をコンテンツスクリプトに送信
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url.includes('mercari.com')) {
          debugLog(`メッセージ送信: updateSettings - タブID: ${tabs[0].id}`);
          
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateSettings',
            settings: settings
          }, function(response) {
            if (chrome.runtime.lastError) {
              debugLog(`エラー: ${chrome.runtime.lastError.message}`);
              showStatus('メルカリページを再読み込みしてください', 'error');
              return;
            }
            
            if (response && response.status === 'success') {
              debugLog('設定の更新に成功しました');
              showStatus('設定を更新しました！ページをリロードせずに反映されます', 'success');
              
              // 他のタブにも通知
              chrome.runtime.sendMessage({
                action: 'ngWordsUpdated',
                customNgWords: additionalNgWords
              });
              
              // コントロールパネル設定も通知
              if (useControlPanelCheckbox) {
                chrome.runtime.sendMessage({
                  action: 'controlPanelUpdated',
                  panelState: {
                    visible: useControlPanelCheckbox.checked
                  }
                });
              }
            } else {
              debugLog('設定の更新に失敗しました');
              showStatus('設定の適用に失敗しました', 'error');
            }
          });
        } else {
          debugLog('メルカリのタブではありません');
          showStatus('メルカリのページを開いてください', 'error');
        }
      });
    });
  }
  
  // ステータスメッセージを表示する関数
  function showStatus(message, type) {
    debugLog(`ステータスメッセージを表示: ${message} (${type})`);
    
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    
    // 3秒後にメッセージを消す
    setTimeout(function() {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
});