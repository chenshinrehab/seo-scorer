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
        signal: AbortSignal.timeout(7000) 
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
        return Response.json({ error: '無法解析該網址，目標網站可能阻擋外部讀取，請改用本地端運作或安裝Detailed SEO Extension' }, { status: 400 });
      }
    }

    if (!html) return Response.json({ error: '未能獲取網頁內容' }, { status: 400 });
    
    const $ = cheerio.load(html);
    const results = [];
    let earnedPoints = 0;
    let maxPoints = 0;
    
    // 新增 explanation 參數，用於在前端顯示意義與建議數值
    const addResult = (category, name, explanation, score, maxScore, status, message) => {
      if (score !== null && maxScore !== null) { 
        earnedPoints += score; 
        maxPoints += maxScore; 
      }
      results.push({ category, name, explanation, score, maxScore, status, message });
    };

    // --- SEO 基礎分析 (計分，滿分共 100 分) ---
    const title = $('title').text();
    const titleLen = title.length;
    const titleScore = (titleLen >= 30 && titleLen <= 65) ? 10 : (titleLen > 0 ? 5 : 0);
    const titleStatus = (titleLen >= 30 && titleLen <= 65) ? 'pass' : (titleLen > 0 ? 'warning' : 'fail');
    addResult('General', 'Title Tag', '建議30-65字元，作為網頁最核心的主題標題', titleScore, 10, titleStatus, `長度: ${titleLen} 字元`);

    const desc = $('meta[name="description"]').attr('content') || "";
    const descLen = desc.length;
    const descScore = (descLen >= 70 && descLen <= 155) ? 10 : (descLen > 0 ? 5 : 0);
    const descStatus = (descLen >= 70 && descLen <= 155) ? 'pass' : (descLen > 0 ? 'warning' : 'fail');
    addResult('General', 'Meta Description', '建議70-155字元，用於吸引搜尋結果的點擊率', descScore, 10, descStatus, `長度: ${descLen} 字元`);

    // 新增：Robots Meta Tag (配分5分)
    const robots = $('meta[name="robots"]').attr('content') || '';
    let robotsScore = 0;
    let robotsStatus = 'fail';
    let robotsMsg = '';
    if (robots) {
      if (robots.toLowerCase().includes('noindex')) {
        robotsScore = 0;
        robotsStatus = 'fail';
        robotsMsg = `警告：設定為限制收錄 (${robots})`;
      } else {
        robotsScore = 5;
        robotsStatus = 'pass';
        robotsMsg = `已設定: ${robots}`;
      }
    } else {
      robotsScore = 5;
      robotsStatus = 'pass';
      robotsMsg = '未設定 (搜尋引擎預設為允許收錄)';
    }
    addResult('General', 'Robots Meta Tag', '建議保持預設或設為 index, follow 確保網頁能被收錄', robotsScore, 5, robotsStatus, robotsMsg);

    const hasKeywords = !!$('meta[name="keywords"]').attr('content');
    addResult('General', 'Meta Keywords', '舊式SEO標籤，主流搜尋引擎參考性降低', hasKeywords ? 3 : 0, 3, hasKeywords ? 'pass' : 'fail', hasKeywords ? '已設定' : '缺失');

    const hasCanonical = !!$('link[rel="canonical"]').attr('href');
    addResult('General', 'Canonical', '建議設定標準網址，避免重複內容分散SEO權重', hasCanonical ? 5 : 0, 5, hasCanonical ? 'pass' : 'fail', hasCanonical ? '已設定標準連結' : '未設定');
    
    const h1Count = $('h1').length;
    addResult('Headings', 'H1 Tag', '建議每頁僅有1個，作為該網頁最主要的大標題', h1Count === 1 ? 10 : (h1Count > 1 ? 5 : 0), 10, h1Count === 1 ? 'pass' : (h1Count > 1 ? 'warning' : 'fail'), `數量: ${h1Count}`);

    const h2Count = $('h2').length;
    addResult('Headings', 'H2 Tags', '建議數量約四個，建立內容主要階層與段落標題', h2Count > 0 ? 5 : 0, 5, h2Count > 0 ? 'pass' : 'fail', `數量: ${h2Count}`);

    const h3Count = $('h3').length;
    addResult('Headings', 'H3 Tags', '輔助H2向下細分內容區塊，讓文章結構更完整清晰', h3Count > 0 ? 5 : 0, 5, h3Count > 0 ? 'pass' : 'fail', `數量: ${h3Count}`);
    
    const missingAlt = $('img').filter((i, el) => !$(el).attr('alt')).length;
    const hasImg = $('img').length > 0;
    const altScore = missingAlt === 0 ? 5 : 0;
    const altStatus = missingAlt === 0 ? 'pass' : 'fail';
    addResult('Content', 'Image Alt', '圖片替代文字，幫助搜尋引擎理解圖片內容及提升無障礙閱讀', altScore, 5, altStatus, hasImg ? `缺失 Alt: ${missingAlt}` : '無圖片');

    const internal = $('a[href^="/"], a[href^="' + url + '"]').length;
    addResult('Content', 'Internal Links', '內部連結建議3個以上，幫助爬蟲深入抓取全站與引導使用者瀏覽', internal > 0 ? 5 : 0, 5, internal > 0 ? 'pass' : 'fail', `數量: ${internal}`);

    const external = $('a[href^="http"]').filter((i, el) => {
      const href = $(el).attr('href');
      try { return href && !href.includes(new URL(url).hostname); } catch { return false; }
    }).length;
    addResult('Content', 'External Links', '外部連結，建議連向高權威網站引用政府(.gov)、學術(.edu)、機構(.org) 或知名學術/醫療網站（如 PubMed, 衛福部）來源，大幅增強內容信任度', external > 0 ? 5 : 0, 5, external > 0 ? 'pass' : 'fail', `數量: ${external}`);
    
    const lang = $('html').attr('lang');
    addResult('Content', 'HTML Lang', '語系宣告，幫助搜尋引擎確認目標網站的語言市場', lang ? 5 : 0, 5, lang ? 'pass' : 'fail', `語系: ${lang || '未設定'}`);
    
    const hasOgTitle = !!$('meta[property="og:title"]').attr('content');
    addResult('Social', 'OG Title', '社群分享標題，優化在FB/Line等社群平台轉貼時的呈現', hasOgTitle ? 5 : 0, 5, hasOgTitle ? 'pass' : 'fail', hasOgTitle ? '已設定' : '缺失');

    const hasOgImage = !!$('meta[property="og:image"]').attr('content');
    addResult('Social', 'OG Image', '社群分享圖片，提升社群平台轉貼時的視覺吸引力', hasOgImage ? 5 : 0, 5, hasOgImage ? 'pass' : 'fail', hasOgImage ? '已設定' : '缺失');

    const hasPublisher = !!($('meta[name="author"]').attr('content') || $('link[rel="publisher"]').attr('href'));
    addResult('Social', 'Publisher', '發布者或作者資訊，建立文章來源權威性連結', hasPublisher ? 5 : 0, 5, hasPublisher ? 'pass' : 'fail', hasPublisher ? '已設定' : '缺失');
    
    const isHttps = url.startsWith('https');
    addResult('Technical', 'SSL/HTTPS', '加密連線，為基礎安全性與Google官方明言的排名因素', isHttps ? 5 : 0, 5, isHttps ? 'pass' : 'fail', isHttps ? '加密連線 (HTTPS)' : '未加密');

    const hasFavicon = $('link[rel*="icon"]').length > 0;
    addResult('Technical', 'Favicon', '網站小圖示，加強品牌識別與瀏覽器分頁體驗', hasFavicon ? 2 : 0, 2, hasFavicon ? 'pass' : 'fail', hasFavicon ? '已設定' : '缺失');

    const hasCharset = $('meta[charset]').length > 0;
    addResult('Technical', 'Charset', '字元編碼，建議設為 UTF-8 確保各國語言不亂碼', hasCharset ? 2 : 0, 2, hasCharset ? 'pass' : 'fail', hasCharset ? '已設定' : '缺失');

    const hasViewport = $('meta[name="viewport"]').length > 0;
    addResult('Technical', 'Viewport', '可視區域設定，響應式網頁(RWD)必備元素，確保手機正常顯示', hasViewport ? 3 : 0, 3, hasViewport ? 'pass' : 'fail', hasViewport ? '已設定' : '缺失');

    // --- 網站權威性 (E-E-A-T) (不計分) ---
    const schemaText = $('script[type="application/ld+json"]').text() || '';
    
    const hasFAQPage = schemaText.includes('FAQPage');
    addResult('網站權威性 (E-E-A-T)', 'FAQPage', '問答結構化資料，有機會在搜尋結果直接呈現問答版位', null, null, hasFAQPage ? 'pass' : 'fail', hasFAQPage ? '已設定' : '缺失');

    const hasDateModified = schemaText.includes('dateModified') || $('meta[property*="modified_time"]').length > 0;
    addResult('網站權威性 (E-E-A-T)', 'dateModified', '文章最後更新時間，讓搜尋引擎了解內容新鮮度', null, null, hasDateModified ? 'pass' : 'fail', hasDateModified ? '已設定' : '缺失');

    const hasHasCredential = schemaText.includes('hasCredential');
    addResult('網站權威性 (E-E-A-T)', 'hasCredential', '專業認證與學經歷資訊，提升內容可信度 E-E-A-T', null, null, hasHasCredential ? 'pass' : 'fail', hasHasCredential ? '已設定' : '缺失');

    const hasSameAs = schemaText.includes('sameAs');
    addResult('網站權威性 (E-E-A-T)', 'sameAs', '社群或權威連結關聯，幫助搜尋引擎建立品牌或作者實體', null, null, hasSameAs ? 'pass' : 'fail', hasSameAs ? '已設定' : '缺失');

    const hasAuthLink = $('a').toArray().some(el => {
      const href = $(el).attr('href');
      if (!href) return false;
      try {
        const hostname = new URL(href, url).hostname;
        return hostname.endsWith('.edu') || hostname.endsWith('.gov') || hostname.endsWith('.org');
      } catch(e) { return false; }
    });
    addResult('網站權威性 (E-E-A-T)', '權威外部連結', '引用政府(.gov)、學術(.edu)、機構(.org) 或知名學術/醫療網站（如 PubMed, 衛福部）來源，大幅增強內容信任度', null, null, hasAuthLink ? 'pass' : 'fail', hasAuthLink ? '已設定' : '缺失');

    const hasCoreContent = $('main, article, section').length > 0;
    addResult('網站權威性 (E-E-A-T)', '核心內文', '具備 main/article/section 標籤，便於網路爬蟲快速識別主要內容區塊', null, null, hasCoreContent ? 'pass' : 'fail', hasCoreContent ? '已設定' : '缺失');

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
        addResult('Schema Validation', '結構化資料', '用機讀格式(JSON-LD)精準告訴爬蟲網頁的實體屬性，建議有MedicalClinic, LocalBusiness, Person 或 FAQPage', null, null, 'pass', `偵測到 ${schemaObjCount} 個物件: ${uniqueTypes.join(', ')}`);
      } else {
        addResult('Schema Validation', '結構化資料', '用機讀格式(JSON-LD)精準告訴爬蟲網頁的實體屬性，建議有MedicalClinic, LocalBusiness, Person 或 FAQPage', null, null, 'warning', '偵測到 JSON-LD 標籤，但缺少有效的 @type 屬性');
      }
    } else {
      addResult('Schema Validation', '結構化資料', '用機讀格式(JSON-LD)精準告訴爬蟲網頁的實體屬性，建議有MedicalClinic, LocalBusiness, Person 或 FAQPage', null, null, 'fail', '未偵測到結構化資料');
    }

    // 此時 maxPoints 會精準等同於 100
    const totalScore = Math.round((earnedPoints / maxPoints) * 100);
    return Response.json({ url, totalScore, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}