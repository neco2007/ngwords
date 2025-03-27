// ポップアップの動作を制御するスクリプト

// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', function() {
    // 要素の参照を取得
    const ngWordsInput = document.getElementById('ngWordsInput');
    const saveButton = document.getElementById('saveButton');
    const statusDiv = document.getElementById('status');
    const countDiv = document.getElementById('ngWordCount');
    
    // 保存ボタンのクリックイベント
    saveButton.addEventListener('click', function() {
      saveCustomNgWords();
    });
    
    // 現在のNGワード数を表示
    displayNgWordCount();
    
    // NGワードの数を表示する関数
    function displayNgWordCount() {
      // 既にngwords.jsで読み込まれているNGワードの数を表示
      if (typeof chrome.extension !== 'undefined') {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0] && tabs[0].url.includes('mercari.com')) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'getNgWordCount'
            }, function(response) {
              if (response && response.count) {
                countDiv.textContent = `デフォルトで${response.count}個のNGワードが設定されています`;
              } else {
                countDiv.textContent = 'デフォルトのNGワードが多数設定されています';
              }
            });
          } else {
            countDiv.textContent = 'メルカリを開いてください';
          }
        });
      }
    }
    
    // 追加のNGワードを保存する関数
    function saveCustomNgWords() {
      // テキストエリアから値を取得
      const text = ngWordsInput.value.trim();
      
      // 改行で分割して追加NGワードの配列を作成
      const additionalNgWords = text.split('\n')
        .map(word => word.trim())
        .filter(word => word.length > 0); // 空行を除外
      
      // 追加のNGワードをコンテンツスクリプトに送信
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url.includes('mercari.com')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'addCustomNgWords',
            additionalNgWords: additionalNgWords
          }, function(response) {
            if (response && response.status === 'success') {
              showStatus('追加のNGワードを適用しました！', 'success');
            } else {
              showStatus('NGワードの適用に失敗しました', 'error');
            }
          });
        } else {
          showStatus('メルカリのページを開いてください', 'error');
        }
      });
    }
    
    // ステータスメッセージを表示する関数
    function showStatus(message, type) {
      statusDiv.textContent = message;
      statusDiv.className = 'status ' + type;
      
      // 3秒後にメッセージを消す
      setTimeout(function() {
        statusDiv.textContent = '';
        statusDiv.className = 'status';
      }, 3000);
    }
  });