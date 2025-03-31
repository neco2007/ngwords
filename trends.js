/**
 * メルカリNGワードブロッカー拡張機能
 * トレンド分析機能 - Google Trends APIと連携した商品トレンド分析
 * 
 * このファイルはtrends.htmlのための機能を提供します
 */

// 設定
const CONFIG = {
    // APIの設定
    googleTrendsApiUrl: 'https://trends.google.com/trends/api/explore',
    mercariApiUrl: 'https://api.mercari.jp/v2/entities:search',
    
    // キャッシュの有効期間（ミリ秒）
    cacheExpiry: 60 * 60 * 1000, // 1時間
    
    // リクエスト間隔（ミリ秒）- サーバー負荷を避けるため
    requestDelay: 500,
    
    // 表示する最大アイテム数
    maxItems: 100,
    
    // ローカルストレージのキー
    storageKeys: {
      trendCache: 'mercari_trend_cache',
      lastSearch: 'mercari_last_search',
      filters: 'mercari_trend_filters'
    }
  };
  
  // グローバル変数
  let trendCharts = {};  // チャートインスタンスを保持するオブジェクト
  let currentTrendData = null;  // 現在表示中のトレンドデータ
  let lastFetchAttempt = 0;  // 最後のデータ取得試行時間
  let isLoading = false;     // データ読み込み中フラグ
  
  // デバッグログ用関数
  function log(message, type = 'info') {
    const prefix = type === 'error' ? '🛑' : 
                   type === 'warn' ? '⚠️' : 
                   '✓';
    
    console.log(`[トレンド分析] ${prefix} ${message}`);
  }
  
  // ページ読み込み完了時の処理
  document.addEventListener('DOMContentLoaded', function() {
    initializePage();
  });
  
  // ページの初期化
  function initializePage() {
    // 保存されたフィルター設定を復元
    restoreFilters();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // 初期データの読み込み
    loadInitialData();
  }
  
  // イベントリスナーの設定
  function setupEventListeners() {
    // チャートタブの切り替え
    const chartTabs = document.querySelectorAll('.chart-tab');
    chartTabs.forEach(tab => {
      tab.addEventListener('click', function() {
        // 全てのタブからactiveクラスを削除
        chartTabs.forEach(t => t.classList.remove('active'));
        // クリックされたタブにactiveクラスを追加
        this.classList.add('active');
        
        // チャートを描画
        const chartType = this.getAttribute('data-chart');
        renderChart(chartType);
      });
    });
    
    // フィルター適用ボタン
    document.querySelector('.button-apply')?.addEventListener('click', function() {
      applyFilters();
    });
    
    // フィルターリセットボタン
    document.querySelector('.button-reset')?.addEventListener('click', function() {
      resetFilters();
    });
    
    // 検索ボタン
    document.querySelector('.search-button')?.addEventListener('click', function() {
      searchTrends();
    });
    
    // 検索入力のEnterキー対応
    document.querySelector('.search-input')?.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        searchTrends();
      }
    });
    
    // 関連キーワードタグのクリックイベント
    document.querySelectorAll('.keyword-tag').forEach(tag => {
      tag.addEventListener('click', function() {
        document.querySelector('.search-input').value = this.textContent;
        searchTrends();
      });
    });
  }
  
  // 初期データの読み込み
  function loadInitialData() {
    try {
      // キャッシュを確認
      const cachedData = localStorage.getItem(CONFIG.storageKeys.trendCache);
      const lastSearch = localStorage.getItem(CONFIG.storageKeys.lastSearch);
      
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData);
          const timestamp = data.timestamp || 0;
          
          // キャッシュが有効かチェック
          if (Date.now() - timestamp < CONFIG.cacheExpiry) {
            log('キャッシュからデータを読み込みました');
            currentTrendData = data;
            
            // 前回の検索クエリがあれば表示
            if (lastSearch) {
              document.querySelector('.search-input').value = lastSearch;
            }
            
            // トレンドデータの表示を更新
            updateTrendDisplay();
            return;
          }
        } catch (e) {
          log(`キャッシュデータの解析中にエラー: ${e.message}`, 'error');
        }
      }
      
      // キャッシュが無いか古い場合は新しいデータを取得
      fetchInitialTrends();
    } catch (e) {
      log(`初期データ読み込み中にエラー: ${e.message}`, 'error');
      showError('データの読み込みに失敗しました。再度お試しください。');
    }
  }
  
  // 初期トレンドデータの取得
  async function fetchInitialTrends() {
    // ユーザーへの表示
    setLoadingState(true);
    
    try {
      // 実際の実装ではAPIからデータを取得
      // ここではモックデータを使用
      
      // データ取得の遅延をシミュレート
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // モックデータを生成
      const mockData = generateMockData();
      
      // データを設定
      currentTrendData = mockData;
      
      // LocalStorageにキャッシュ
      localStorage.setItem(CONFIG.storageKeys.trendCache, JSON.stringify(mockData));
      
      // Google Trendsデータを読み込み
      loadGoogleTrendsData();
      
      // トレンドデータの表示を更新
      updateTrendDisplay();
    } catch (error) {
      log(`トレンドデータの取得に失敗: ${error.message}`, 'error');
      showError('トレンドデータの取得に失敗しました。');
    } finally {
      setLoadingState(false);
    }
  }
  
  // トレンドデータの表示を更新
  function updateTrendDisplay() {
    if (!currentTrendData) return;
    
    try {
      // 検索トレンドチャートを描画
      renderChart('trends');
      
      // トップ100リストを更新
      updateTopTrendsList();
      
      // 関連キーワードを更新
      updateRelatedKeywords();
      
      // トレンドインサイトを更新
      updateTrendInsights();
    } catch (e) {
      log(`トレンド表示の更新中にエラー: ${e.message}`, 'error');
    }
  }
  
  // ローディング状態を設定
  function setLoadingState(isLoading) {
    const chartContainer = document.getElementById('trends-chart');
    const trendsList = document.querySelector('.top-trends-list');
    
    if (isLoading) {
      // ローディング表示
      chartContainer.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <div class="loading-text">データを読み込み中...</div>
        </div>
      `;
      
      trendsList.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <div class="loading-text">トレンドデータを取得中...</div>
        </div>
      `;
    }
  }
  
  // エラーメッセージを表示
  function showError(message) {
    const chartContainer = document.getElementById('trends-chart');
    
    chartContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <div style="font-size: 48px; margin-bottom: 20px;">😞</div>
        <div style="font-size: 18px; color: #f44336; margin-bottom: 10px; font-weight: bold;">エラーが発生しました</div>
        <div style="color: #666;">${message}</div>
        <button class="filter-button button-apply" style="margin-top: 20px;" onclick="location.reload()">再読み込み</button>
      </div>
    `;
  }
  
  // チャートを描画する関数
  function renderChart(type) {
    const container = document.getElementById('trends-chart');
    if (!container) return;
    
    // コンテナをクリア
    container.innerHTML = '';
    
    // チャートキャンバスを作成
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    container.appendChild(canvas);
    
    // チャートを描画
    switch (type) {
      case 'trends':
        renderTrendsChart(canvas);
        break;
      case 'prices':
        renderPricesChart(canvas);
        break;
      case 'category':
        renderCategoryChart(canvas);
        break;
      case 'comparison':
        renderComparisonChart(canvas);
        break;
    }
  }
  
  // 検索トレンドチャートを描画
  function renderTrendsChart(canvas) {
    if (!currentTrendData || !currentTrendData.topItems) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // チャートの設定
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // 背景をクリア
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    
    // グリッド線を描画
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // 横線
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // トップ3アイテムのトレンドデータを取得
    const items = currentTrendData.topItems.slice(0, 3);
    const labels = ['1週間前', '6日前', '5日前', '4日前', '3日前', '2日前', '昨日', '今日'];
    
    // 縦線
    for (let i = 0; i < labels.length; i++) {
      const x = padding + (chartWidth / (labels.length - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    // X軸のラベル
    ctx.fillStyle = '#757575';
    ctx.font = '12px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < labels.length; i++) {
      const x = padding + (chartWidth / (labels.length - 1)) * i;
      ctx.fillText(labels[i], x, height - padding + 20);
    }
    
    // 各商品の色
    const colors = ['#ff4081', '#2196f3', '#ffc107'];
    
    // 各商品のトレンドラインを描画
    items.forEach((item, index) => {
      // トレンドデータを生成（モックデータ）
      const generateTrendData = () => {
        const baseValue = 100 - index * 20;
        const data = [];
        
        for (let i = 0; i < 7; i++) {
          // トレンド値を計算（徐々に上昇し、最後に急上昇）
          const value = baseValue * (1 + (i * 0.05) + (i === 6 ? 0.5 : 0));
          data.push(value);
        }
        
        // 最終日の急上昇
        data.push(baseValue * (1 + 0.7 + index * 0.3));
        
        return data;
      };
      
      const trendData = generateTrendData();
      const color = colors[index];
      
      // 最大値を見つける
      const maxValue = Math.max(...trendData) * 1.1;
      
      // ラインを描画
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      trendData.forEach((value, i) => {
        const x = padding + (chartWidth / (trendData.length - 1)) * i;
        const y = height - padding - ((value / maxValue) * chartHeight);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // 点を描画
      trendData.forEach((value, i) => {
        const x = padding + (chartWidth / (trendData.length - 1)) * i;
        const y = height - padding - ((value / maxValue) * chartHeight);
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });
    
    // 凡例
    const legendY = 20;
    const legendX = width - 200;
    
    items.forEach((item, index) => {
      const y = legendY + index * 25;
      const color = colors[index];
      
      // 凡例の色の四角
      ctx.fillStyle = color;
      ctx.fillRect(legendX, y, 15, 15);
      
      // 凡例テキスト
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.fillText(item.title.substring(0, 20) + (item.title.length > 20 ? '...' : ''), legendX + 25, y + 12);
    });
  }
  
  // 価格推移チャートを描画
  function renderPricesChart(canvas) {
    if (!currentTrendData || !currentTrendData.topItems) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // チャートの設定
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // 背景をクリア
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    
    // グリッド線を描画
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // 横線
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // トップ3アイテムの価格データを取得
    const items = currentTrendData.topItems.slice(0, 3);
    const labels = ['1週間前', '6日前', '5日前', '4日前', '3日前', '2日前', '昨日', '今日'];
    
    // 縦線
    for (let i = 0; i < labels.length; i++) {
      const x = padding + (chartWidth / (labels.length - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    // X軸のラベル
    ctx.fillStyle = '#757575';
    ctx.font = '12px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < labels.length; i++) {
      const x = padding + (chartWidth / (labels.length - 1)) * i;
      ctx.fillText(labels[i], x, height - padding + 20);
    }
    
    // 各商品の色
    const colors = ['#ff4081', '#2196f3', '#ffc107'];
    
    // 価格範囲を計算
    const maxPrice = Math.max(...items.map(item => item.price)) * 1.2;
    const minPrice = Math.min(...items.map(item => item.price)) * 0.8;
    const priceRange = maxPrice - minPrice;
    
    // 各商品の価格ラインを描画
    items.forEach((item, index) => {
      // 価格データを生成（モックデータ）
      const generatePriceData = () => {
        const basePrice = item.price;
        const data = [];
        
        // ランダムな変動を持つ価格データ
        for (let i = 0; i < 8; i++) {
          const variation = basePrice * (Math.random() * 0.04 - 0.02); // ±2%の変動
          data.push(basePrice + variation);
        }
        
        return data;
      };
      
      const priceData = generatePriceData();
      const color = colors[index];
      
      // ラインを描画
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      priceData.forEach((price, i) => {
        const x = padding + (chartWidth / (priceData.length - 1)) * i;
        const y = height - padding - ((price - minPrice) / priceRange * chartHeight);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // 点を描画
      priceData.forEach((price, i) => {
        const x = padding + (chartWidth / (priceData.length - 1)) * i;
        const y = height - padding - ((price - minPrice) / priceRange * chartHeight);
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 価格を表示（最初と最後のみ）
        if (i === 0 || i === priceData.length - 1) {
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          ctx.fillText(`¥${Math.round(price).toLocaleString()}`, x, y - 15);
        }
      });
    });
    
    // 凡例
    const legendY = 20;
    const legendX = width - 200;
    
    items.forEach((item, index) => {
      const y = legendY + index * 25;
      const color = colors[index];
      
      // 凡例の色の四角
      ctx.fillStyle = color;
      ctx.fillRect(legendX, y, 15, 15);
      
      // 凡例テキスト
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.fillText(item.title.substring(0, 15) + (item.title.length > 15 ? '...' : ''), legendX + 25, y + 12);
    });
  }
  
  // カテゴリー分布チャートを描画
  function renderCategoryChart(canvas) {
    if (!currentTrendData || !currentTrendData.categoryDistribution) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // 背景をクリア
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    
    // パイチャートのパラメータ
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 50;
    
    // カテゴリーデータ
    const categories = currentTrendData.categoryDistribution;
    
    // 合計値を計算
    const total = categories.reduce((sum, category) => sum + category.value, 0);
    
    // 各カテゴリーの色
    const colors = [
      '#ff4081', '#2196f3', '#ffc107', '#4caf50', 
      '#9c27b0', '#f44336', '#3f51b5', '#ff9800'
    ];
    
    // 開始角度
    let startAngle = 0;
    
    // 凡例のY位置
    let legendY = height / 2 - (categories.length * 25) / 2;
    
    // 各カテゴリーの円グラフを描画
    categories.forEach((category, index) => {
      // 割合を計算
      const percent = category.value / total;
      // 角度を計算
      const angle = percent * Math.PI * 2;
      
      // 色を取得
      const color = colors[index % colors.length];
      
      // セクションを描画
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + angle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // セクションの中央の角度
      const midAngle = startAngle + angle / 2;
      
      // パーセントを表示（十分なスペースがある場合のみ）
      const percentDisplay = Math.round(percent * 100);
      if (percentDisplay > 3) { // 3%以上のセクションにのみラベルを表示
        const textRadius = radius * 0.7;
        const textX = centerX + Math.cos(midAngle) * textRadius;
        const textY = centerY + Math.sin(midAngle) * textRadius;
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${percentDisplay}%`, textX, textY);
      }
      
      // 凡例
      const legendX = width - 170;
      
      // 凡例の色の四角
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY + index * 25, 15, 15);
      
      // 凡例テキスト
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.font = '14px "Noto Sans JP", sans-serif';
      ctx.fillText(`${category.name} (${percentDisplay}%)`, legendX + 25, legendY + index * 25 + 12);
      
      // 次のセクションの開始角度
      startAngle += angle;
    });
  }
  
  // Amazon比較チャートを描画
  function renderComparisonChart(canvas) {
    if (!currentTrendData || !currentTrendData.amazonComparison) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // チャートの設定
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // 背景をクリア
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    
    // グリッド線を描画
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // 横線
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // 比較データを取得
    const comparisonData = currentTrendData.amazonComparison;
    
    // 最大価格を見つける
    const allPrices = comparisonData.flatMap(item => [item.mercariPrice, item.amazonPrice]);
    const maxPrice = Math.max(...allPrices) * 1.1;
    
    // 各項目の幅とギャップを計算
    const itemCount = comparisonData.length;
    const itemWidth = chartWidth / itemCount;
    const barWidth = itemWidth * 0.35;
    
    // X軸のラベル
    ctx.fillStyle = '#757575';
    ctx.font = '12px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    
    comparisonData.forEach((item, index) => {
      const x = padding + itemWidth * index + itemWidth / 2;
      const shortenedName = item.name.length > 10 ? 
        item.name.substring(0, 10) + '...' : 
        item.name;
      
      ctx.fillText(shortenedName, x, height - padding + 20);
      
      // メルカリの価格バー
      const mercariHeight = (item.mercariPrice / maxPrice) * chartHeight;
      const mercariX = padding + itemWidth * index + barWidth * 0.5;
      const mercariY = height - padding - mercariHeight;
      
      // グラデーションを作成
      const mercariGradient = ctx.createLinearGradient(mercariX, mercariY, mercariX, height - padding);
      mercariGradient.addColorStop(0, '#ff4081');
      mercariGradient.addColorStop(1, '#ff80ab');
      
      ctx.fillStyle = mercariGradient;
      ctx.fillRect(mercariX, mercariY, barWidth, mercariHeight);
      
      // Amazonの価格バー
      const amazonHeight = (item.amazonPrice / maxPrice) * chartHeight;
      const amazonX = padding + itemWidth * index + barWidth * 1.75;
      const amazonY = height - padding - amazonHeight;
      
      // グラデーションを作成
      const amazonGradient = ctx.createLinearGradient(amazonX, amazonY, amazonX, height - padding);
      amazonGradient.addColorStop(0, '#2196f3');
      amazonGradient.addColorStop(1, '#90caf9');
      
      ctx.fillStyle = amazonGradient;
      ctx.fillRect(amazonX, amazonY, barWidth, amazonHeight);
      
      // 価格表示
      ctx.fillStyle = '#333';
      ctx.font = '11px "Noto Sans JP", sans-serif';
      ctx.textAlign = 'center';
      
      ctx.fillText(`¥${item.mercariPrice.toLocaleString()}`, mercariX + barWidth / 2, mercariY - 10);
      ctx.fillText(`¥${item.amazonPrice.toLocaleString()}`, amazonX + barWidth / 2, amazonY - 10);
    });
    
    // 凡例
    const legendX = width - 150;
    const legendY = 20;
    
    // メルカリの凡例
    ctx.fillStyle = '#ff4081';
    ctx.fillRect(legendX, legendY, 15, 15);
    
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.font = '14px "Noto Sans JP", sans-serif';
    ctx.fillText('メルカリ', legendX + 25, legendY + 12);
    
    // Amazonの凡例
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(legendX, legendY + 25, 15, 15);
    
    ctx.fillStyle = '#333';
    ctx.font = '14px "Noto Sans JP", sans-serif';
    ctx.fillText('Amazon', legendX + 25, legendY + 37);
  }
  
  // 関連キーワードを更新する関数
  function updateRelatedKeywords() {
    if (!currentTrendData || !currentTrendData.relatedKeywords) return;
    
    const keywordsList = document.querySelector('.keywords-list');
    if (!keywordsList) return;
    
    keywordsList.innerHTML = '';
    
    currentTrendData.relatedKeywords.forEach(keyword => {
      const keywordTag = document.createElement('div');
      keywordTag.className = 'keyword-tag';
      keywordTag.textContent = keyword;
      
      // クリックイベント
      keywordTag.addEventListener('click', function() {
        document.querySelector('.search-input').value = this.textContent;
        searchTrends();
      });
      
      keywordsList.appendChild(keywordTag);
    });
  }
  
  // トップ100リストを更新する関数
  function updateTopTrendsList() {
    if (!currentTrendData || !currentTrendData.topItems) return;
    
    const container = document.querySelector('.top-trends-list');
    if (!container) return;
    
    // HTMLを生成
    let html = '';
    
    currentTrendData.topItems.forEach((item, index) => {
      html += `
        <div class="top-trend-item">
          <div class="top-trend-rank">${index + 1}</div>
          <div class="top-trend-info">
            <div class="top-trend-title">${item.title}</div>
            <div class="top-trend-metrics">
              <div class="top-trend-metric">
                <span>検索ボリューム:</span>
                <span>${item.volume.toLocaleString()}</span>
              </div>
              <div class="top-trend-metric">
                <span>平均価格:</span>
                <span>¥${item.price.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div class="top-trend-growth ${item.positive ? 'positive-growth' : 'negative-growth'}">
            ${item.positive ? '+' : ''}${item.growth}%
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  // トレンドインサイトを更新する関数
  function updateTrendInsights() {
    if (!currentTrendData || !currentTrendData.insights) return;
    
    const container = document.querySelector('.insights-list');
    if (!container) return;
    
    // HTMLを生成
    let html = '';
    
    currentTrendData.insights.forEach(insight => {
      html += `
        <div class="insight-item">
          <div class="insight-item-title">${insight.title}</div>
          <div class="insight-item-description">${insight.description}</div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  // Google Trendsデータを読み込む関数
  function loadGoogleTrendsData(query = '') {
    const container = document.getElementById('google-trends-embed');
    if (!container) return;
    
    // 検索クエリをクリーンアップ
    const searchTerm = query.trim() || 'Nintendo Switch';
    
    //実際のGoogle Trends APIを使用する場合はここでAPIリクエストを行います
    // この例ではモックビジュアライゼーションを使用
    
    container.innerHTML = `
      <div style="width:100%; height:400px; text-align:center;">
        <h3 style="margin:1.5rem 0; color:#4285F4;">「${searchTerm}」のGoogle Trends データ</h3>
        <div style="display:flex; height:300px;">
          <div style="flex:1; padding:10px;">
            <h4 style="margin-bottom:1rem; font-size:1rem;">「${searchTerm}」の検索トレンド</h4>
            <div style="height:85%; background-color:#f5f5f5; border-radius:8px; display:flex; justify-content:center; align-items:center;">
              <div style="width:90%; height:80%;">
                <div style="width:100%; height:100%; background:linear-gradient(to top, rgba(66,133,244,0.2), rgba(66,133,244,0.1)); position:relative;">
                  <svg viewBox="0 0 300 200" width="100%" height="100%" preserveAspectRatio="none">
                    <path d="M0,200 L0,150 C10,140 20,100 30,95 C40,90 50,100 60,90 C70,80 80,60 90,50 C100,40 110,35 120,40 C130,45 140,60 150,55 C160,50 170,30 180,20 C190,10 200,5 210,15 C220,25 230,50 240,40 C250,30 260,10 270,5 C280,0 290,5 300,10 L300,200 Z" fill="rgba(66,133,244,0.5)" />
                    <path d="M0,150 C10,140 20,100 30,95 C40,90 50,100 60,90 C70,80 80,60 90,50 C100,40 110,35 120,40 C130,45 140,60 150,55 C160,50 170,30 180,20 C190,10 200,5 210,15 C220,25 230,50 240,40 C250,30 260,10 270,5 C280,0 290,5 300,10" fill="none" stroke="#4285F4" stroke-width="2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div style="flex:1; padding:10px;">
            <h4 style="margin-bottom:1rem; font-size:1rem;">「${searchTerm}」の地域別人気度</h4>
            <div style="height:85%; background-color:#f5f5f5; border-radius:8px; padding:20px;">
              <div style="margin-bottom:10px; display:flex; justify-content:space-between;">
                <span>東京都</span>
                <span style="width:60%; height:12px; background:#4285F4; border-radius:6px;"></span>
                <span>100</span>
              </div>
              <div style="margin-bottom:10px; display:flex; justify-content:space-between;">
                <span>大阪府</span>
                <span style="width:54%; height:12px; background:#4285F4; border-radius:6px;"></span>
                <span>90</span>
              </div>
              <div style="margin-bottom:10px; display:flex; justify-content:space-between;">
                <span>愛知県</span>
                <span style="width:48%; height:12px; background:#4285F4; border-radius:6px;"></span>
                <span>80</span>
              </div>
              <div style="margin-bottom:10px; display:flex; justify-content:space-between;">
                <span>神奈川県</span>
                <span style="width:42%; height:12px; background:#4285F4; border-radius:6px;"></span>
                <span>70</span>
              </div>
              <div style="margin-bottom:10px; display:flex; justify-content:space-between;">
                <span>福岡県</span>
                <span style="width:36%; height:12px; background:#4285F4; border-radius:6px;"></span>
                <span>60</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // トレンドを検索する関数
  function searchTrends() {
    const searchInput = document.querySelector('.search-input');
    if (!searchInput) return;
    
    const searchQuery = searchInput.value.trim();
    
    if (!searchQuery) {
      return; // 空の場合は何もしない
    }
    
    // 短時間での連続クリックを防止（500ms以内）
    const now = Date.now();
    if (now - lastFetchAttempt < 500) {
      log('連続クリックを防止します', 'debug');
      return;
    }
    lastFetchAttempt = now;
    
    // ローディング表示
    setLoadingState(true);
    
    // 検索クエリを保存
    localStorage.setItem(CONFIG.storageKeys.lastSearch, searchQuery);
    
    // 検索トレンドデータを取得（モック）
    setTimeout(() => {
      // 検索結果をシミュレート
      const searchResults = generateSearchResults(searchQuery);
      
      // データを更新
      currentTrendData = searchResults;
      
      // LocalStorageにキャッシュ
      localStorage.setItem(CONFIG.storageKeys.trendCache, JSON.stringify(searchResults));
      
      // Google Trendsの表示を更新
      loadGoogleTrendsData(searchQuery);
      
      // トレンドデータの表示を更新
      updateTrendDisplay();
      
      // ローディング状態を解除
      setLoadingState(false);
    }, 1500);
  }
  
  // フィルターを適用する関数
  function applyFilters() {
    // フィルター値を取得
    const periodFilter = document.getElementById('period-filter');
    const categoryFilter = document.getElementById('category-filter');
    const priceFilter = document.getElementById('price-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    if (!periodFilter || !categoryFilter || !priceFilter || !sortFilter) {
      return;
    }
    
    const filters = {
      period: periodFilter.value,
      category: categoryFilter.value,
      price: priceFilter.value,
      sort: sortFilter.value
    };
    
    // フィルター設定を保存
    localStorage.setItem(CONFIG.storageKeys.filters, JSON.stringify(filters));
    
    // ローディング表示
    document.querySelector('.top-trends-list').innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">フィルターを適用中...</div>
      </div>
    `;
    
    // フィルター適用（モック）
    setTimeout(() => {
      // フィルター適用後のデータを取得
      const filteredData = applyFiltersToData(currentTrendData, filters);
      
      // データを更新
      currentTrendData = filteredData;
      
      // トレンドデータの表示を更新
      updateTrendDisplay();
    }, 1000);
  }
  
  // データにフィルターを適用する関数（モック）
  function applyFiltersToData(data, filters) {
    if (!data || !data.topItems) {
      return data;
    }
    
    // ディープコピーを作成
    const newData = JSON.parse(JSON.stringify(data));
    
    // トップアイテムをフィルタリング
    let filteredItems = [...newData.topItems];
    
    // カテゴリフィルター
    if (filters.category !== 'all') {
      filteredItems = filteredItems.filter(item => {
        // カテゴリ名をチェック
        const categoryName = getCategoryNameFromItem(item);
        return categoryName.toLowerCase() === filters.category.toLowerCase();
      });
    }
    
    // 価格フィルター
    if (filters.price !== 'all') {
      const [minPrice, maxPrice] = filters.price.split('-').map(p => parseInt(p) || 0);
      
      filteredItems = filteredItems.filter(item => {
        if (maxPrice) {
          return item.price >= minPrice && item.price <= maxPrice;
        } else {
          return item.price >= minPrice;
        }
      });
    }
    
    // ソート
    switch (filters.sort) {
      case 'trend':
        // デフォルトはトレンド順
        break;
      case 'growth':
        filteredItems.sort((a, b) => b.growth - a.growth);
        break;
      case 'price-asc':
        filteredItems.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filteredItems.sort((a, b) => b.price - a.price);
        break;
    }
    
    // 更新されたデータを返す
    newData.topItems = filteredItems;
    return newData;
  }
  
  // 商品からカテゴリ名を取得する関数（モック）
  function getCategoryNameFromItem(item) {
    // 実際の実装ではアイテムのプロパティからカテゴリを取得
    // この例ではタイトルに基づいて簡易的に判断
    const title = item.title.toLowerCase();
    
    if (title.includes('nintendo') || title.includes('playstation') || title.includes('xbox') || title.includes('ゲーム')) {
      return 'hobby';
    } else if (title.includes('airpods') || title.includes('iphone') || title.includes('スマホ') || title.includes('カメラ')) {
      return 'electronics';
    } else if (title.includes('nike') || title.includes('アディダス') || title.includes('コート') || title.includes('トレンチ')) {
      return 'fashion';
    } else if (title.includes('ダイソン') || title.includes('美容') || title.includes('コスメ')) {
      return 'beauty';
    } else if (title.includes('アウトドア') || title.includes('スポーツ')) {
      return 'sports';
    } else if (title.includes('インテリア') || title.includes('家具')) {
      return 'home';
    }
    
    // デフォルト
    return 'hobby';
  }
  
  // フィルターをリセットする関数
  function resetFilters() {
    document.getElementById('period-filter').value = '7';
    document.getElementById('category-filter').value = 'all';
    document.getElementById('price-filter').value = 'all';
    document.getElementById('sort-filter').value = 'trend';
    
    // フィルター設定をクリア
    localStorage.removeItem(CONFIG.storageKeys.filters);
    
    // フィルター適用と同様に処理
    applyFilters();
  }
  
  // 保存されたフィルター設定を復元
  function restoreFilters() {
    const savedFilters = localStorage.getItem(CONFIG.storageKeys.filters);
    
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        
        // 各フィルターを設定
        if (filters.period) document.getElementById('period-filter').value = filters.period;
        if (filters.category) document.getElementById('category-filter').value = filters.category;
        if (filters.price) document.getElementById('price-filter').value = filters.price;
        if (filters.sort) document.getElementById('sort-filter').value = filters.sort;
      } catch (e) {
        log(`フィルター設定の復元中にエラー: ${e.message}`, 'error');
      }
    }
  }
  
  // 検索に基づいたトレンドデータを生成する関数（モック）
  function generateSearchResults(query) {
    const lowercaseQuery = query.toLowerCase();
    
    // 基本データ構造
    const data = {
      query: query,
      timestamp: Date.now(),
      topItems: [],
      insights: [],
      relatedKeywords: [],
      categoryDistribution: [],
      amazonComparison: []
    };
    
    // 検索クエリに基づいてカスタマイズされたデータ
    if (lowercaseQuery.includes('nintendo') || lowercaseQuery.includes('switch')) {
      // Nintendo Switch関連の検索結果
      data.topItems = [
        {
          title: 'Nintendo Switch 有機ELモデル ホワイト',
          volume: 24500,
          price: 37800,
          growth: 156,
          positive: true
        },
        {
          title: 'Nintendo Switch 本体 ネオンブルー/ネオンレッド',
          volume: 22800,
          price: 32800,
          growth: 132,
          positive: true
        },
        {
          title: 'Nintendo Switch Lite ターコイズ',
          volume: 19500,
          price: 21980,
          growth: 98,
          positive: true
        },
        {
          title: 'Nintendo Switch Proコントローラー',
          volume: 15700,
          price: 7480,
          growth: 85,
          positive: true
        },
        {
          title: 'Nintendo Switch Joy-Con ネオンパープル/ネオンオレンジ',
          volume: 12400,
          price: 8200,
          growth: 74,
          positive: true
        }
      ];
      
      // 関連キーワード
      data.relatedKeywords = [
        'Nintendo Switch 有機EL', 'Nintendo Switch Lite', 'Nintendo Switch 本体', 
        'Nintendo Switch ゲームソフト', 'Nintendo Switch コントローラー',
        'Nintendo Switch 充電スタンド', 'Nintendo Switch 周辺機器', 'Nintendo Switch ケース'
      ];
      
      // インサイト
      data.insights = [
        {
          title: 'Nintendo Switchの需要急上昇',
          description: '昨日からの検索量が156%増加。新作ゲームの発売や年末商戦の影響と考えられます。'
        },
        {
          title: 'Joy-Conの人気色はネオンパープル/オレンジ',
          description: '最も検索されているJoy-Conの色はネオンパープル/オレンジで、先月比で74%増加しています。'
        },
        {
          title: 'Switch Liteは女性ユーザーに人気',
          description: '検索ユーザーの60%が女性で、特にターコイズカラーへの関心が高いようです。'
        },
        {
          title: '有機ELモデルの価格が安定化',
          description: '初期の品薄状態から供給が追いつき、平均価格が先月から8%下落しています。'
        }
      ];
      
    } else if (lowercaseQuery.includes('playstation') || lowercaseQuery.includes('ps5')) {
      // PlayStation関連の検索結果
      data.topItems = [
        {
          title: 'PlayStation 5 ディスクドライブ搭載モデル',
          volume: 23700,
          price: 65800,
          growth: 143,
          positive: true
        },
        {
          title: 'PlayStation 5 デジタル・エディション',
          volume: 21500,
          price: 49500,
          growth: 127,
          positive: true
        },
        {
          title: 'PlayStation 5 DualSenseワイヤレスコントローラー',
          volume: 16800,
          price: 7980,
          growth: 92,
          positive: true
        },
        {
          title: 'PlayStation 5 PULSE 3Dワイヤレスヘッドセット',
          volume: 14200,
          price: 12800,
          growth: 78,
          positive: true
        },
        {
          title: 'PlayStation 5 ファイナルファンタジー16',
          volume: 11600,
          price: 8800,
          growth: 65,
          positive: true
        }
      ];
      
      // 関連キーワード
      data.relatedKeywords = [
        'PlayStation 5', 'PS5 デジタルエディション', 'PS5 ディスクドライブ', 
        'PS5 コントローラー', 'PS5 充電スタンド', 'PS5 周辺機器',
        'PS5 ソフト', 'PS5 ヘッドセット'
      ];
      
      // インサイト
      data.insights = [
        {
          title: 'PlayStation 5の入手性が改善',
          description: '供給量の増加により平均価格が5%下落。出品数も33%増加しています。'
        },
        {
          title: '人気ソフトはFF16とホグワーツ・レガシー',
          description: '両タイトルが市場の45%を占め、中古価格も定価に近い水準を維持しています。'
        },
        {
          title: 'コントローラーの需要増加',
          description: '2台目コントローラーの需要が急増しており、中古美品の価格は新品の80%の水準です。'
        },
        {
          title: 'デジタルエディションの人気上昇',
          description: 'ディスクなしモデルへの関心が高まり、検索数は前年比で127%増加しています。'
        }
      ];
      
    } else {
      // 一般的な検索結果（デフォルト）
      data.topItems = generateGenericSearchResults(query);
      
      // 関連キーワード
      data.relatedKeywords = [
        `${query} 中古`, `${query} 新品`, `${query} 激安`, 
        `${query} 送料無料`, `${query} セット`, `${query} 公式`,
        `${query} 正規品`, `${query} 限定`
      ];
      
      // インサイト
      data.insights = [
        {
          title: `${query}の検索動向`,
          description: '過去7日間で検索量が徐々に増加しており、市場の関心が高まっています。'
        },
        {
          title: '価格の傾向',
          description: '平均価格は緩やかに下降傾向にあり、過去1ヶ月で約5%下落しています。'
        },
        {
          title: '注目の関連キーワード',
          description: `「${query} 新品」と「${query} 送料無料」の検索が増加しており、品質と配送への関心が高いことが分かります。`
        },
        {
          title: '購入チャンス',
          description: '週末に向けて価格が下がる傾向があり、金曜日が最も安価な傾向にあります。'
        }
      ];
    }
    
    // カテゴリ分布データを追加
    data.categoryDistribution = generateCategoryDistribution(lowercaseQuery);
    
    // Amazon比較データを追加
    data.amazonComparison = generateAmazonComparison(data.topItems.slice(0, 5));
    
    return data;
  }
  
  // カテゴリ分布データを生成する関数
  function generateCategoryDistribution(query) {
    let categories;
    
    if (query.includes('nintendo') || query.includes('playstation') || query.includes('ゲーム')) {
      categories = [
        { name: 'ゲーム・ホビー', value: 65 },
        { name: '家電・スマホ', value: 15 },
        { name: 'エンタメ', value: 8 },
        { name: 'おもちゃ', value: 7 },
        { name: 'その他', value: 5 }
      ];
    } else if (query.includes('スマホ') || query.includes('airpods') || query.includes('カメラ')) {
      categories = [
        { name: '家電・スマホ', value: 68 },
        { name: 'PC・タブレット', value: 12 },
        { name: 'ゲーム・ホビー', value: 9 },
        { name: 'オーディオ', value: 7 },
        { name: 'その他', value: 4 }
      ];
    } else {
      // 一般的なカテゴリ分布
      categories = [
        { name: 'ファッション', value: 35 },
        { name: '家電・スマホ', value: 25 },
        { name: 'ゲーム・ホビー', value: 15 },
        { name: 'コスメ・美容', value: 10 },
        { name: 'スポーツ', value: 7 },
        { name: 'インテリア', value: 5 },
        { name: 'その他', value: 3 }
      ];
    }
    
    return categories;
  }
  
  // Amazon比較データを生成する関数
  function generateAmazonComparison(items) {
    return items.map(item => {
      // Amazonの価格（メルカリより5-20%高い）
      const priceDiff = 1.05 + Math.random() * 0.15;
      
      return {
        name: item.title.length > 20 ? item.title.substring(0, 20) + '...' : item.title,
        mercariPrice: item.price,
        amazonPrice: Math.round(item.price * priceDiff)
      };
    });
  }
  
  // 一般的な検索結果を生成する関数
  function generateGenericSearchResults(query) {
    const items = [];
    
    // トップ20の商品を生成
    for (let i = 0; i < 20; i++) {
      const baseVolume = 25000 - i * 1000;
      const randomVariation = Math.random() * 2000 - 1000;
      const volume = Math.max(1000, Math.round(baseVolume + randomVariation));
      
      const basePrice = 10000 + Math.random() * 50000;
      const price = Math.round(basePrice);
      
      const baseGrowth = 150 - i * 7;
      const growthVariation = Math.random() * 20 - 10;
      const growth = Math.round(baseGrowth + growthVariation);
      
      items.push({
        title: generateProductTitle(query, i),
        volume: volume,
        price: price,
        growth: growth,
        positive: growth > 0
      });
    }
    
    return items;
  }
  
  // 商品タイトルを生成する関数
  function generateProductTitle(query, index) {
    const conditions = ['新品未使用', '中古美品', '未開封', '限定モデル', '正規品'];
    const colors = ['ブラック', 'ホワイト', 'レッド', 'ブルー', 'ゴールド', 'シルバー'];
    const years = ['2023年', '2022年', '2021年'];
    const types = ['モデル', 'シリーズ', 'バージョン', 'タイプ'];
    
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomYear = years[Math.floor(Math.random() * years.length)];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    // 様々なバリエーションを生成
    switch (index % 5) {
      case 0:
        return `${query} ${randomColor} ${randomCondition}`;
      case 1:
        return `${query} ${randomYear}${randomType} ${randomCondition}`;
      case 2:
        return `${randomCondition} ${query} ${randomColor}`;
      case 3:
        return `${query} 限定${randomColor} ${randomYear}モデル`;
      case 4:
        return `${randomCondition} ${query} 特別セット`;
      default:
        return `${query} ${randomCondition}`;
    }
  }
  
  // モックデータを生成する関数
  function generateMockData() {
    return {
      query: '',
      timestamp: Date.now(),
      topItems: [
        {
          title: 'Nintendo Switch 有機ELモデル',
          volume: 24500,
          price: 32800,
          growth: 156,
          positive: true
        },
        {
          title: 'PlayStation 5 デジタル・エディション',
          volume: 22300,
          price: 49500,
          growth: 132,
          positive: true
        },
        {
          title: 'AirPods Pro (第2世代)',
          volume: 18900,
          price: 27500,
          growth: 98,
          positive: true
        },
        {
          title: 'ダイソン Airwrap Complete',
          volume: 16700,
          price: 46800,
          growth: 85,
          positive: true
        },
        {
          title: 'Apple Watch Series 8',
          volume: 15200,
          price: 42300,
          growth: 74,
          positive: true
        },
        {
          title: 'NIKE エアジョーダン1 レトロ ハイ OG',
          volume: 14600,
          price: 28900,
          growth: 67,
          positive: true
        },
        {
          title: 'iPad Pro M2 12.9インチ',
          volume: 13800,
          price: 148000,
          growth: 62,
          positive: true
        },
        {
          title: 'ポケモンカード スカーレット&バイオレット 拡張パック',
          volume: 12900,
          price: 6500,
          growth: 59,
          positive: true
        },
        {
          title: 'Canon EOS R10 ボディ',
          volume: 11500,
          price: 95700,
          growth: 52,
          positive: true
        },
        {
          title: 'ZARA オーバーサイズトレンチコート',
          volume: 10800,
          price: 12300,
          growth: 48,
          positive: true
        },
        {
          title: 'ソニー ワイヤレスノイズキャンセリングヘッドホン WH-1000XM5',
          volume: 10200,
          price: 38500,
          growth: 45,
          positive: true
        },
        {
          title: 'ユニクロ ウルトラライトダウン',
          volume: 9700,
          price: 4900,
          growth: 42,
          positive: true
        },
        {
          title: 'Nintendo Switch Lite ターコイズ',
          volume: 9300,
          price: 19800,
          growth: 39,
          positive: true
        },
        {
          title: 'Kindle Paperwhite 第11世代',
          volume: 8900,
          price: 14800,
          growth: 36,
          positive: true
        },
        {
          title: 'ゼルダの伝説 ティアーズ オブ ザ キングダム',
          volume: 8500,
          price: 6300,
          growth: 33,
          positive: true
        },
        {
          title: 'サムソナイト スーツケース 28インチ',
          volume: 8100,
          price: 32500,
          growth: 30,
          positive: true
        },
        {
          title: 'Apple MacBook Air M2 13インチ',
          volume: 7800,
          price: 128000,
          growth: 28,
          positive: true
        },
        {
          title: 'リモワ クラシックフライト',
          volume: 7400,
          price: 89000,
          growth: 25,
          positive: true
        },
        {
          title: 'バレンシアガ スピード トレーナー',
          volume: 7100,
          price: 54800,
          growth: 23,
          positive: true
        },
        {
          title: 'BOSE QuietComfort Earbuds II',
          volume: 6800,
          price: 29800,
          growth: 21,
          positive: true
        }
      ],
      relatedKeywords: [
        'Nintendo Switch', 'PlayStation 5', 'AirPods Pro', 
        'ダイソン Airwrap', 'Apple Watch', 'エアジョーダン',
        'iPad Pro', 'ポケモンカード'
      ],
      categoryDistribution: [
        { name: 'ゲーム・ホビー', value: 35 },
        { name: '家電・スマホ', value: 28 },
        { name: 'ファッション', value: 15 },
        { name: 'コスメ・美容', value: 10 },
        { name: 'スポーツ・レジャー', value: 7 },
        { name: 'インテリア・住まい', value: 3 },
        { name: 'その他', value: 2 }
      ],
      insights: [
        {
          title: 'Nintendo Switchの需要急上昇',
          description: '昨日からの検索量が156%増加。新作ゲームの発売や年末商戦の影響と考えられます。'
        },
        {
          title: 'PlayStation 5の入手性が改善',
          description: '供給量の増加により平均価格が5%下落。出品数も33%増加しています。'
        },
        {
          title: 'AirPodsは販売サイクルの終盤',
          description: '新モデル発売の噂により中古市場での出品が27%増加。購入を検討している方は価格下落を待つことをお勧めします。'
        },
        {
          title: '冬物アパレルの需要増加',
          description: '急な気温低下により冬物アパレルの検索量が42%増加。特にZARAやUNIQLOのアウターが人気です。'
        }
      ],
      amazonComparison: [
        {
          name: 'Nintendo Switch 有機EL',
          mercariPrice: 32800,
          amazonPrice: 35680
        },
        {
          name: 'PlayStation 5 デジタル',
          mercariPrice: 49500,
          amazonPrice: 54200
        },
        {
          name: 'AirPods Pro (第2世代)',
          mercariPrice: 27500,
          amazonPrice: 31980
        },
        {
          name: 'ダイソン Airwrap',
          mercariPrice: 46800,
          amazonPrice: 59800
        },
        {
          name: 'Apple Watch Series 8',
          mercariPrice: 42300,
          amazonPrice: 45900
        }
      ]
    };
  }