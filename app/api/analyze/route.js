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
        if (!proxyResponse.ok) return Response.json({ error: '無法解析該網址，目標網站可能阻擋外部讀取，請改用本地端運作或安裝Detailed SEO Extension' }, { status: 400 });
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
    
    // 新增 maxScore 參數，讓總合嚴格等於 100 分
    const addResult = (category, name, score, maxScore, status, message) => {
      if (score !== null && maxScore !== null) { 
        earnedPoints += score; 
        maxPoints += maxScore; 
      }
      results.push({ category, name, score, maxScore, status, message });
    };

    // --- SEO 基礎分析 (計分，滿分共 100 分) ---
    const title = $('title').text();
    const titleLen = title.length;
    const titleScore = (titleLen >= 30 && titleLen <= 65) ? 10 : (titleLen > 0 ? 5 : 0);
    const titleStatus = (titleLen >= 30 && titleLen <= 65) ? 'pass' : (titleLen > 0 ? 'warning' : 'fail');
    addResult('General', 'Title Tag', titleScore, 10, titleStatus, `長度: ${titleLen} 字元`);

    const desc = $('meta[name="description"]').attr('content') || "";
    const descLen = desc.length;
    const descScore = (descLen >= 70 && descLen <= 155) ? 10 : (descLen > 0 ? 5 : 0);
    const descStatus = (descLen >= 70 && descLen <= 155) ? 'pass' : (descLen > 0 ? 'warning' : 'fail');
    addResult('General', 'Meta Description', descScore, 10, descStatus, `長度: ${descLen} 字元`);

    const hasKeywords = !!$('meta[name="keywords"]').attr('content');
    addResult('General', 'Meta Keywords', hasKeywords ? 5 : 0, 5, hasKeywords ? 'pass' : 'fail', hasKeywords ? '已設定' : '缺失');

    const hasCanonical = !!$('link[rel="canonical"]').attr('href');
    addResult('General', 'Canonical', hasCanonical ? 5 : 0, 5, hasCanonical ? 'pass' : 'fail', hasCanonical ? '已設定標準連結' : '未設定');
    
    const h1Count = $('h1').length;
    addResult('Headings', 'H1 Tag', h1Count === 1 ? 10 : (h1Count > 1 ? 5 : 0), 10, h1Count === 1 ? 'pass' : (h1Count > 1 ? 'warning' : 'fail'), `數量: ${h1Count}`);

    const h2Count = $('h2').length;
    addResult('Headings', 'H2 Tags', h2Count > 0 ? 5 : 0, 5, h2Count > 0 ? 'pass' : 'fail', `數量: ${h2Count}`);

    const h3Count = $('h3').length;
    addResult('Headings', 'H3 Tags', h3Count > 0 ? 5 : 0, 5, h3Count > 0 ? 'pass' : 'fail', `數量: ${h3Count}`);
    
    const missingAlt = $('img').filter((i, el) => !$(el).attr('alt')).length;
    const hasImg = $('img').length > 0;
    const altScore = missingAlt === 0 ? 5 : 0;
    const altStatus = missingAlt === 0 ? 'pass' : 'fail';
    addResult('Content', 'Image Alt', altScore, 5, altStatus, hasImg ? `缺失 Alt: ${missingAlt}` : '無圖片');

    const internal = $('a[href^="/"], a[href^="' + url + '"]').length;
    addResult('Content', 'Internal Links', internal > 0 ? 5 : 0, 5, internal > 0 ? 'pass' : 'fail', `數量: ${internal}`);

    const external = $('a[href^="http"]').filter((i, el) => {
      const href = $(el).attr('href');
      try { return href && !href.includes(new URL(url).hostname); } catch { return false; }
    }).length;
    addResult('Content', 'External Links', external > 0 ? 5 : 0, 5, external > 0 ? 'pass' : 'fail', `數量: ${external}`);
    
    const lang = $('html').attr('lang');
    addResult('Content', 'HTML Lang', lang ? 5 : 0, 5, lang ? 'pass' : 'fail', `語系: ${lang || '未設定'}`);
    
    const hasOgTitle = !!$('meta[property="og:title"]').attr('content');
    addResult('Social', 'OG Title', hasOgTitle ? 5 : 0, 5, hasOgTitle ? 'pass' : 'fail', hasOgTitle ? '已設定' : '缺失');

    const hasOgImage = !!$('meta[property="og:image"]').attr('content');
    addResult('Social', 'OG Image', hasOgImage ? 5 : 0, 5, hasOgImage ? 'pass' : 'fail', hasOgImage ? '已設定' : '缺失');

    // 修正點 1：依據是否有抓取到來決定是 pass 還是 fail，不再硬標記 'pass'
    const hasPublisher = !!($('meta[name="author"]').attr('content') || $('link[rel="publisher"]').attr('href'));
    addResult('Social', 'Publisher', hasPublisher ? 5 : 0, 5, hasPublisher ? 'pass' : 'fail', hasPublisher ? '已設定' : '缺失');
    
    const isHttps = url.startsWith('https');
    addResult('Technical', 'SSL/HTTPS', isHttps ? 5 : 0, 5, isHttps ? 'pass' : 'fail', isHttps ? '加密連線 (HTTPS)' : '未加密');

    // 修正點 2：拔除硬標記 'pass' 的 bug，檢查邏輯修改
    const hasFavicon = $('link[rel*="icon"]').length > 0;
    addResult('Technical', 'Favicon', hasFavicon ? 5 : 0, 5, hasFavicon ? 'pass' : 'fail', hasFavicon ? '已設定' : '缺失');

    // 修正點 3：修正 Charset
    const hasCharset = $('meta[charset]').length > 0;
    addResult('Technical', 'Charset', hasCharset ? 2 : 0, 2, hasCharset ? 'pass' : 'fail', hasCharset ? '已設定' : '缺失');

    // 修正點 4：修正 Viewport
    const hasViewport = $('meta[name="viewport"]').length > 0;
    addResult('Technical', 'Viewport', hasViewport ? 3 : 0, 3, hasViewport ? 'pass' : 'fail', hasViewport ? '已設定' : '缺失');

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
        // maxScore 給 null，代表不計入總分計算
        addResult('Schema Validation', '結構化資料', null, null, 'pass', `偵測到 ${schemaObjCount} 個物件: ${uniqueTypes.join(', ')}`);
      } else {
        addResult('Schema Validation', '結構化資料', null, null, 'warning', '偵測到 JSON-LD 標籤，但缺少有效的 @type 屬性');
      }
    } else {
      addResult('Schema Validation', '結構化資料', null, null, 'fail', '未偵測到結構化資料');
    }

    // 此時 maxPoints 會精準等同於 100，所以上面和下面的分數將完全吻合
    const totalScore = Math.round((earnedPoints / maxPoints) * 100);
    return Response.json({ url, totalScore, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}