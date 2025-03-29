// バックグラウンドスクリプト - 拡張機能アイコンクリック時の処理

// デバッグログ用関数
function debugLog(message) {
  console.log(`[NGブロッカー:BG] ${message}`);
}

// 初期化ログ
debugLog('バックグラウンドスクリプトを初期化しました');

// 拡張機能アイコンがクリックされたときの処理
chrome.action.onClicked.addListener(function(tab) {
  debugLog(`アイコンがクリックされました: ${tab.url}`);
  
  // メルカリのページの場合のみ処理
  if (tab.url && tab.url.includes('mercari.com')) {
    // タブがロード済みか確認
    chrome.tabs.get(tab.id, function(currentTab) {
      if (chrome.runtime.lastError) {
        console.error(`[NGブロッカー:BG] エラー: ${chrome.runtime.lastError.message}`);
        return;
      }

      // 現在のページが有効であれば、メッセージを送信
      if (currentTab.status === 'complete') {
        try {
          debugLog(`メッセージ送信: toggleNgWordFilter - タブID: ${tab.id}`);
          chrome.tabs.sendMessage(tab.id, {
            action: 'toggleNgWordFilter'
          }, function(response) {
            // レスポンスがなくてもエラーにしない
            if (chrome.runtime.lastError) {
              debugLog(`メッセージ送信時にエラーが発生しましたが、無視します: ${chrome.runtime.lastError.message}`);
            } else if (response) {
              debugLog(`レスポンス受信: ${JSON.stringify(response)}`);
            }
          });
        } catch (e) {
          console.error(`[NGブロッカー:BG] メッセージ送信エラー: ${e.message}`);
        }
      } else {
        debugLog(`ページの読み込みが完了していません: ${currentTab.status}`);
      }
    });
  } else {
    // メルカリのページでない場合は通知
    debugLog('メルカリ以外のページでアイコンがクリックされました');
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon48.png',
      title: 'メルカリNGワードブロッカー',
      message: 'この拡張機能はメルカリのページでのみ動作します。'
    });
  }
});

// タブ間での設定共有のためのメッセージリスナー
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  debugLog(`メッセージ受信: ${request.action}`);
  
  // NGワード設定が更新された場合、他のタブにも通知
  if (request.action === 'ngWordsUpdated') {
    debugLog('NGワードの更新を他のタブに通知します');
    chrome.tabs.query({url: 'https://jp.mercari.com/*'}, function(tabs) {
      const senderTabId = sender.tab ? sender.tab.id : null;
      debugLog(`送信元タブID: ${senderTabId}, 対象タブ数: ${tabs.length}`);
      
      tabs.forEach(function(tab) {
        if (tab.id !== senderTabId) {
          debugLog(`タブID ${tab.id} に更新を通知`);
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateNgWords',
            customNgWords: request.customNgWords
          });
        }
      });
    });
    sendResponse({status: 'success'});
  }
  
  // コントロールパネルの状態が更新された場合も同期
  else if (request.action === 'controlPanelUpdated') {
    debugLog('コントロールパネルの状態更新を他のタブに通知します');
    chrome.tabs.query({url: 'https://jp.mercari.com/*'}, function(tabs) {
      const senderTabId = sender.tab ? sender.tab.id : null;
      
      tabs.forEach(function(tab) {
        if (tab.id !== senderTabId) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateControlPanel',
            panelState: request.panelState
          });
        }
      });
    });
    sendResponse({status: 'success'});
  }
  
  return true;
});