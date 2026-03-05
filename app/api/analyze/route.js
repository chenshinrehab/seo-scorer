import * as cheerio from 'cheerio';

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    // 增加更完整的 Headers 模擬真實瀏覽器，避免被 Vercel IP 阻擋
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      redirect: 'follow'
    });
    
    if (!response.ok) return Response.json({ error: `無法存取該網址 (Status: ${response.status})` }, { status: 400 });

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];
    let totalScore = 0;

    const addScore = (category, name, score, status, message) => {
      totalScore += score;
      results.push({ category, name, score, status, message });
    };

    // --- 按照 Detailed SEO 分組 (20項，每項5分) ---

    // [GROUP: General]
    const title = $('title').text();
    addScore('General', 'Title Tag', (title.length >= 30 && title.length <= 65) ? 5 : (title.length > 0 ? 2.5 : 0), (title.length >= 30 && title.length <= 65) ? 'pass' : 'warning', `長度: ${title.length} 字元`);
    
    const desc = $('meta[name="description"]').attr('content') || "";
    addScore('General', 'Meta Description', (desc.length >= 70 && desc.length <= 155) ? 5 : (desc.length > 0 ? 2.5 : 0), (desc.length >= 70 && desc.length <= 155) ? 'pass' : 'warning', `長度: ${desc.length} 字元`);
    
    const keywords = $('meta[name="keywords"]').attr('content');
    addScore('General', 'Meta Keywords', keywords ? 5 : 0, keywords ? 'pass' : 'fail', keywords ? '已設定' : '缺失');
    
    const canonical = $('link[rel="canonical"]').attr('href');
    addScore('General', 'Canonical', canonical ? 5 : 0, canonical ? 'pass' : 'fail', canonical ? '已設定' : '缺失');
    
    const robots = $('meta[name="robots"]').attr('content');
    addScore('General', 'Meta Robots', 5, 'pass', robots || 'index, follow');

    // [GROUP: Headings]
    const h1 = $('h1');
    addScore('Headings', 'H1 Tag', h1.length === 1 ? 5 : 0, h1.length === 1 ? 'pass' : 'fail', `數量: ${h1.length}`);
    
    const h2 = $('h2').length;
    addScore('Headings', 'H2 Tags', h2 > 0 ? 5 : 2.5, h2 > 0 ? 'pass' : 'warning', `數量: ${h2}`);
    
    const h3 = $('h3').length;
    addScore('Headings', 'H3 Tags', h3 > 0 ? 5 : 2.5, h3 > 0 ? 'pass' : 'warning', `數量: ${h3}`);

    // [GROUP: Content]
    const images = $('img');
    const missingAlt = images.filter((i, el) => !$(el).attr('alt')).length;
    addScore('Content', 'Image Alt', missingAlt === 0 ? 5 : 2.5, missingAlt === 0 ? 'pass' : 'warning', `缺失 Alt: ${missingAlt}`);
    
    const internal = $('a[href^="/"], a[href^="' + url + '"]').length;
    addScore('Content', 'Internal Links', internal > 0 ? 5 : 2.5, 'pass', `數量: ${internal}`);
    
    const external = $('a[href^="http"]').filter((i, el) => {
      const href = $(el).attr('href');
      return href && !href.includes(new URL(url).hostname);
    }).length;
    addScore('Content', 'External Links', external > 0 ? 5 : 2.5, 'pass', `數量: ${external}`);
    
    const lang = $('html').attr('lang');
    addScore('Content', 'HTML Lang', lang ? 5 : 0, lang ? 'pass' : 'fail', `語系: ${lang || '未設定'}`);

    // [GROUP: Social]
    addScore('Social', 'OG Title', $('meta[property="og:title"]').attr('content') ? 5 : 0, 'pass', 'Facebook 分享標題');
    addScore('Social', 'OG Image', $('meta[property="og:image"]').attr('content') ? 5 : 0, 'pass', 'Facebook 分享圖');
    addScore('Social', 'Publisher', ($('meta[name="author"]').attr('content') || $('link[rel="publisher"]').attr('href')) ? 5 : 0, 'pass', '作者/發布者');
    addScore('Social', 'Schema.org', $('script[type="application/ld+json"]').length > 0 ? 5 : 0, 'pass', 'JSON-LD 資料');

    // [GROUP: Technical]
    addScore('Technical', 'SSL/HTTPS', url.startsWith('https') ? 5 : 0, url.startsWith('https') ? 'pass' : 'fail', '加密連線');
    addScore('Technical', 'Favicon', $('link[rel*="icon"]').length > 0 ? 5 : 0, 'pass', '網站圖示');
    addScore('Technical', 'Charset', ($('meta[charset]').length > 0 || $('meta[http-equiv="Content-Type"]').length > 0) ? 5 : 0, 'pass', '編碼設定');
    addScore('Technical', 'Viewport', $('meta[name="viewport"]').length > 0 ? 5 : 0, 'pass', '行動裝置優化');

    return Response.json({ url, totalScore, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}