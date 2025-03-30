// バックグラウンドスクリプト - 拡張機能アイコンクリック時の処理

// デバッグモード（本番環境では false に設定）
const DEBUG_MODE = false;

// デバッグログ用関数
function log(message, type = 'info') {
  if (!DEBUG_MODE && type === 'debug') return;
  
  const prefix = type === 'error' ? '🛑' : 
                 type === 'warn' ? '⚠️' : 
                 '✓';
  
  console.log(`[NGブロッカー:BG] ${prefix} ${message}`);
}

// 初期化ログ
log('バックグラウンドスクリプトを初期化しました');

// メルカリドメインかどうかを確認する関数
function isMercariDomain(url) {
  return url && (
    url.includes('mercari.com') || 
    url.includes('jp.mercari.com') || 
    url.includes('www.mercari.com')
  );
}

// 拡張機能アイコンがクリックされたときの処理
chrome.action.onClicked.addListener(function(tab) {
  log(`アイコンがクリックされました: ${tab.url}`, 'debug');
  
  // メルカリのページの場合
  if (isMercariDomain(tab.url)) {
    // タブがロード済みか確認
    chrome.tabs.get(tab.id, function(currentTab) {
      if (chrome.runtime.lastError) {
        log(`エラー: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }

      // 現在のページが有効であれば、メッセージを送信
      if (currentTab.status === 'complete') {
        try {
          chrome.tabs.sendMessage(tab.id, {
            action: 'toggleNgWordFilter'
          }, function(response) {
            // レスポンスがなくてもエラーにしない
            if (chrome.runtime.lastError) {
              log(`メッセージ送信時にエラーが発生しましたが、無視します`, 'debug');
            } else if (response) {
              log(`レスポンス受信: ${JSON.stringify(response)}`, 'debug');
            }
          });
        } catch (e) {
          log(`メッセージ送信エラー: ${e.message}`, 'error');
        }
      } else {
        log(`ページの読み込みが完了していません: ${currentTab.status}`, 'warn');
        
        // ページが完全に読み込まれるまで待機する場合の処理
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          // ターゲットのタブが完全に読み込まれたかチェック
          if (tabId === tab.id && changeInfo.status === 'complete') {
            // リスナーを削除
            chrome.tabs.onUpdated.removeListener(listener);
            
            // メッセージを送信
            chrome.tabs.sendMessage(tab.id, {
              action: 'toggleNgWordFilter'
            }, function(response) {
              if (chrome.runtime.lastError) {
                log(`遅延メッセージ送信時にエラーが発生しました: ${chrome.runtime.lastError.message}`, 'warn');
              }
            });
          }
        });
      }
    });
  } else {
    // メルカリのページでない場合は通知
    log('メルカリ以外のページでアイコンがクリックされました', 'warn');
    
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
  log(`メッセージ受信: ${request.action}`, 'debug');
  
  // NGワード設定が更新された場合、他のタブにも通知
  if (request.action === 'ngWordsUpdated') {
    log('NGワードの更新を他のタブに通知します', 'debug');
    
    chrome.tabs.query({url: '*://jp.mercari.com/*'}, function(tabs) {
      const senderTabId = sender.tab ? sender.tab.id : null;
      log(`送信元タブID: ${senderTabId}, 対象タブ数: ${tabs.length}`, 'debug');
      
      // 更新されたNGワードを保存（拡張機能全体で共有）
      chrome.storage.local.set({
        customNgWords: request.customNgWords,
        lastUpdated: Date.now()
      });
      
      // 各タブに通知
      tabs.forEach(function(tab) {
        if (tab.id !== senderTabId) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateNgWords',
            customNgWords: request.customNgWords
          }).catch(error => {
            // エラーは無視（タブがメッセージを受け取る準備ができていない可能性がある）
            log(`タブID ${tab.id} への通知に失敗: ${error}`, 'debug');
          });
        }
      });
    });
    
    sendResponse({status: 'success'});
  }
  
  // パネル表示設定が更新された場合も同期
  else if (request.action === 'controlPanelUpdated') {
    log('コントロールパネル設定を他のタブに通知します', 'debug');
    
    // 設定を保存
    chrome.storage.local.set({
      controlPanelVisible: request.panelState.visible,
      lastUpdated: Date.now()
    });
    
    // 他のタブに通知
    chrome.tabs.query({url: '*://jp.mercari.com/*'}, function(tabs) {
      const senderTabId = sender.tab ? sender.tab.id : null;
      
      tabs.forEach(function(tab) {
        if (tab.id !== senderTabId) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateSettings',
            settings: {
              controlPanelVisible: request.panelState.visible
            }
          }).catch(error => {
            // エラーは無視
            log(`タブID ${tab.id} への設定通知に失敗: ${error}`, 'debug');
          });
        }
      });
    });
    
    sendResponse({status: 'success'});
  }
  
  // トレンド分析データのキャッシュを更新（新機能）
  else if (request.action === 'updateTrendCache') {
    log('トレンド分析データをキャッシュします', 'debug');
    
    // データをキャッシュ
    chrome.storage.local.set({
      trendCache: request.trendData,
      trendCacheExpiry: Date.now() + (60 * 60 * 1000) // 1時間キャッシュ
    });
    
    sendResponse({status: 'success'});
  }
  
  return true; // 非同期レスポンスを有効化
});

// タブの更新を監視し、必要に応じてフィルターを適用
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // タブが完全に読み込まれたときだけ処理
  if (changeInfo.status === 'complete' && isMercariDomain(tab.url)) {
    // 設定を読み込み
    chrome.storage.local.get(['isFilterActive'], function(result) {
      // フィルターが有効なら適用
      if (result.isFilterActive) {
        // ページが完全に読み込まれるまで少し待機
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, {
            action: 'applyFilter'
          }).catch(error => {
            // コンテンツスクリプトがまだロードされていない場合は無視
            log(`タブID ${tabId} へのフィルター適用に失敗: ${error}`, 'debug');
          });
        }, 500);
      }
    });
  }
});

// 拡張機能のインストール/更新時の処理
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    log('拡張機能がインストールされました', 'info');
    
    // 初期設定
    chrome.storage.local.set({
      isFilterActive: false, // デフォルトは無効
      customNgWords: [], // カスタムNGワードは空
      controlPanelVisible: true, // パネルはデフォルトで表示
      installDate: Date.now()
    });
    
    // インストール時の通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon128.png',
      title: 'メルカリNGワードブロッカー',
      message: 'インストールが完了しました。メルカリのページを開き、拡張機能アイコンをクリックして有効にしてください。'
    });
    
  } else if (details.reason === 'update') {
    log(`拡張機能が更新されました（バージョン: ${chrome.runtime.getManifest().version}）`, 'info');
    
    // 更新時の通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon128.png',
      title: 'メルカリNGワードブロッカー',
      message: '拡張機能が最新バージョンに更新されました。新機能「トレンド分析」が追加されました。'
    });
  }
});