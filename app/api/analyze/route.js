import * as cheerio from 'cheerio';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { url } = await request.json();
    let html = '';
    
    // --- 速度優先策略 1：直接連線 (嚴格限時 5 秒) ---
    try {
      const directResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        signal: AbortSignal.timeout(5000) 
      });

      if (directResponse.ok) {
        html = await directResponse.text();
      } else {
        throw new Error('DIRECT_FAILED');
      }
    } catch (err) {
      // --- 速度優先策略 2：快速代理 (嚴格限時 5 秒，失敗立刻放棄，不拖延) ---
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&disableCache=true&time=${Date.now()}`;
      try {
        const proxyResponse = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
        if (!proxyResponse.ok) return Response.json({ error: '無法解析該網址，目標網站可能阻擋外部讀取' }, { status: 400 });
        const proxyData = await proxyResponse.json();
        
        if (!proxyData.contents) {
          throw new Error('EMPTY_CONTENTS');
        }
        html = proxyData.contents;
      } catch (proxyErr) {
        // 立刻回報錯誤，不再苦等
        return Response.json({ error: '連線逾時或遭阻擋 (為確保分析速度，已為您主動取消等待)' }, { status: 400 });
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
    return Response.json({ url, totalScore, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}