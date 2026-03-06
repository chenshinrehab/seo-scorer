import * as cheerio from 'cheerio';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { url } = await request.json();
    let html = '';
    let usedProxy = false;
    
    // --- 策略 1：正常存取 (限時 5 秒) ---
    try {
      const directResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        signal: AbortSignal.timeout(5000) 
      });

      if (directResponse.ok) {
        html = await directResponse.text();
      } else if (directResponse.status === 403 || directResponse.status === 401) {
        // 主動識別阻擋，立刻觸發 Error 進入 Catch 切換 Proxy
        throw new Error('BLOCKED_BY_WAF');
      } else {
        // 其他真實的伺服器錯誤則直接回報
        return Response.json({ error: `無法存取網址 (Status: ${directResponse.status})` }, { status: 400 });
      }
    } catch (err) {
      // --- 策略 2：直接存取失敗 (Timeout 或 403)，立刻轉向 Proxy ---
      usedProxy = true;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&disableCache=true`;
      
      try {
        // 給 Proxy 充裕的 20 秒時間突破 Cloudflare 類型的防護
        const proxyResponse = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
        
        if (!proxyResponse.ok) {
          return Response.json({ error: '直接存取被阻擋，且代理服務亦無法解析' }, { status: 400 });
        }
        
        const proxyData = await proxyResponse.json();
        if (!proxyData.contents) {
          return Response.json({ error: '代理服務回傳空內容，請確認目標網址是否正確' }, { status: 400 });
        }
        html = proxyData.contents;
      } catch (proxyErr) {
        return Response.json({ error: '連線逾時，請檢查網址有效性 (目標網站可能啟用強烈防護)' }, { status: 400 });
      }
    }

    if (!html) return Response.json({ error: '未能獲取網頁內容' }, { status: 400 });
    
    const $ = cheerio.load(html);
    const results = [];
    let earnedPoints = 0;
    let maxPoints = 0;
    
    const addResult = (category, name, score, status, message) => {
      if (score !== null) { 
        earnedPoints += score; 
        maxPoints += 5; 
      }
      results.push({ category, name, score, status, message });
    };

    // --- SEO 基礎分析 (計分) ---
    const title = $('title').text();
    addResult('General', 'Title Tag', (title.length >= 30 && title.length <= 65) ? 5 : (title.length > 0 ? 2.5 : 0), (title.length >= 30 && title.length <= 65) ? 'pass' : (title.length > 0 ? 'warning' : 'fail'), `長度: ${title.length} 字元`);
    const desc = $('meta[name="description"]').attr('content') || "";
    addResult('General', 'Meta Description', (desc.length >= 70 && desc.length <= 155) ? 5 : (desc.length > 0 ? 2.5 : 0), (desc.length >= 70 && desc.length <= 155) ? 'pass' : (desc.length > 0 ? 'warning' : 'fail'), `長度: ${desc.length} 字元`);
    addResult('General', 'Meta Keywords', $('meta[name="keywords"]').attr('content') ? 5 : 0, $('meta[name="keywords"]').attr('content') ? 'pass' : 'fail', $('meta[name="keywords"]').attr('content') ? '已設定' : '缺失');
    addResult('General', 'Canonical', $('link[rel="canonical"]').attr('href') ? 5 : 0, $('link[rel="canonical"]').attr('href') ? 'pass' : 'fail', $('link[rel="canonical"]').attr('href') ? '已設定標準連結' : '未設定');
    
    const h1 = $('h1');
    addResult('Headings', 'H1 Tag', h1.length === 1 ? 5 : 0, h1.length === 1 ? 'pass' : 'fail', `數量: ${h1.length}`);
    const h2Count = $('h2').length;
    addResult('Headings', 'H2 Tags', h2Count > 0 ? 5 : 2.5, h2Count > 0 ? 'pass' : 'warning', `數量: ${h2Count}`);
    const h3Count = $('h3').length;
    addResult('Headings', 'H3 Tags', h3Count > 0 ? 5 : 2.5, h3Count > 0 ? 'pass' : 'warning', `數量: ${h3Count}`);
    
    const missingAlt = $('img').filter((i, el) => !$(el).attr('alt')).length;
    addResult('Content', 'Image Alt', missingAlt === 0 ? 5 : 2.5, missingAlt === 0 ? 'pass' : 'warning', `缺失 Alt: ${missingAlt}`);
    const internal = $('a[href^="/"], a[href^="' + url + '"]').length;
    addResult('Content', 'Internal Links', internal > 0 ? 5 : 2.5, internal > 0 ? 'pass' : 'warning', `數量: ${internal}`);
    const external = $('a[href^="http"]').filter((i, el) => {
      const href = $(el).attr('href');
      try { return href && !href.includes(new URL(url).hostname); } catch { return false; }
    }).length;
    addResult('Content', 'External Links', external > 0 ? 5 : 2.5, external > 0 ? 'pass' : 'warning', `數量: ${external}`);
    
    const lang = $('html').attr('lang');
    addResult('Content', 'HTML Lang', lang ? 5 : 0, lang ? 'pass' : 'fail', `語系: ${lang || '未設定'}`);
    
    addResult('Social', 'OG Title', $('meta[property="og:title"]').attr('content') ? 5 : 0, $('meta[property="og:title"]').attr('content') ? 'pass' : 'fail', 'OG 標題');
    addResult('Social', 'OG Image', $('meta[property="og:image"]').attr('content') ? 5 : 0, $('meta[property="og:image"]').attr('content') ? 'pass' : 'fail', 'OG 圖片');
    addResult('Social', 'Publisher', ($('meta[name="author"]').attr('content') || $('link[rel="publisher"]').attr('href')) ? 5 : 0, 'pass', '作者資訊');
    
    addResult('Technical', 'SSL/HTTPS', url.startsWith('https') ? 5 : 0, url.startsWith('https') ? 'pass' : 'fail', '加密連線');
    addResult('Technical', 'Favicon', $('link[rel*="icon"]').length > 0 ? 5 : 0, 'pass', '網站圖示');
    addResult('Technical', 'Charset', $('meta[charset]').length > 0 ? 5 : 0, 'pass', '編碼設定');
    addResult('Technical', 'Viewport', $('meta[name="viewport"]').length > 0 ? 5 : 0, 'pass', '行動裝置優化');

    // --- 結構化資料偵測 (不計分，精確列出名稱，無深層遞迴) ---
    const schemas = $('script[type="application/ld+json"]');
    let schemaObjCount = 0;
    let detectedTypes = [];
    
    if (schemas.length > 0) {
      schemas.each((i, el) => {
        try {
          const content = JSON.parse($(el).html());
          const extractType = (node) => {
            if (node && node['@type']) { 
              schemaObjCount++; 
              if (Array.isArray(node['@type'])) {
                detectedTypes.push(...node['@type']);
              } else {
                detectedTypes.push(node['@type']); 
              }
            }
          };
          // 僅尋找頂層與 @graph，不把底層小屬性算入
          if (Array.isArray(content)) {
            content.forEach(extractType);
          } else if (content['@graph'] && Array.isArray(content['@graph'])) {
            content['@graph'].forEach(extractType);
          } else {
            extractType(content);
          }
        } catch (e) {
          // 忽略單一區塊解析失敗
        }
      });
      
      const uniqueTypes = [...new Set(detectedTypes)].filter(Boolean);
      
      if (schemaObjCount > 0) {
        addResult('Schema Validation', '結構化資料', null, 'pass', `偵測到 ${schemaObjCount} 個物件: ${uniqueTypes.join(', ')}`);
      } else {
        addResult('Schema Validation', '結構化資料', null, 'warning', '偵測到 JSON-LD 標籤，但缺少有效的 @type 屬性');
      }
    } else {
      addResult('Schema Validation', '結構化資料', null, 'fail', '未偵測到結構化資料');
    }

    const totalScore = Math.round((earnedPoints / maxPoints) * 100);
    // 回傳加入 usedProxy 幫助除錯
    return Response.json({ url, totalScore, results, usedProxy });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}