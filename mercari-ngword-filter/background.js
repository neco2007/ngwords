// バックグラウンドスクリプト - 拡張機能アイコンクリック時の処理

// 拡張機能アイコンがクリックされたときの処理
chrome.action.onClicked.addListener(function(tab) {
    // メルカリのページの場合のみ処理
    if (tab.url && tab.url.includes('mercari.com')) {
      // タブがロード済みか確認
      chrome.tabs.get(tab.id, function(currentTab) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
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
                console.log('メッセージ送信時にエラーが発生しましたが、無視します。');
              }
            });
          } catch (e) {
            console.error('メッセージ送信エラー:', e);
          }
        } else {
          console.log('ページの読み込みが完了していません。');
        }
      });
    } else {
      // メルカリのページでない場合は通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon48.png',
        title: 'メルカリNGワードブロッカー',
        message: 'この拡張機能はメルカリのページでのみ動作します。'
      });
    }
  });