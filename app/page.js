'use client';
import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. 改善建議統整邏輯
  const criticalFixes = report?.results.filter(item => item.status === 'fail') || [];
  const warnings = report?.results.filter(item => item.status === 'warning') || [];

  // 2. 分組邏輯
  const groupedResults = report?.results.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // 3. PDF 匯出功能 - 加入手機版判斷
  const exportPDF = () => {
    // 偵測是否為行動裝置
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      alert('請使用電腦版本下載 PDF 報告');
    } else {
      window.print();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 搜尋區塊 - 列印時隱藏 */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center print:hidden">
          <h1 className="text-3xl font-black mb-6 tracking-tight text-blue-600">智網 網站 SEO 評估</h1>
          <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-3 justify-center">
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="flex-1 px-5 py-3 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all bg-slate-50"
            />
            <button
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? '分析中...' : '立即分析'}
            </button>
          </form>

          {/* 新增的推廣按鈕：手機版跟搜尋框一樣大，顏色明顯 */}
          {!report && !loading && (
            <div className="mt-6 flex justify-center">
              <a 
                href="https://ai-zeta-dusky-55.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto inline-flex items-center justify-center px-10 py-3 bg-orange-500 text-white font-black rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-200 active:scale-95 transition-all text-lg"
              >
                💡 智網 網頁製作與SEO
              </a>
            </div>
          )}

          {error && <p className="text-red-500 mt-4 font-bold">⚠️ {error}</p>}
        </div>

        {report && (
          <div className="space-y-8 pb-20">
            
            {/* 報告標題與操作按鈕 */}
            <div className="flex justify-between items-center px-2">
              <div>
                <h2 className="text-2xl font-black text-slate-800">我的網頁評估分數</h2>
                <p className="text-slate-400 text-sm font-mono">{report.url}</p>
              </div>
              <button 
                onClick={exportPDF}
                className="bg-red-600 text-white px-5 py-2 md:px-8 md:py-3 rounded-xl font-bold text-sm md:text-base hover:bg-red-700 shadow-lg shadow-red-200 transition-all print:hidden"
              >
                匯出報告
              </button>
            </div>

            {/* 總分卡片 */}
            <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center border-b-8 border-blue-500 print:shadow-none print:border-slate-200">
              <span className="text-slate-400 font-black uppercase text-xs tracking-widest">Global SEO Score</span>
              <div className={`text-7xl font-black my-2 ${report.totalScore >= 80 ? 'text-green-500' : report.totalScore >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                {report.totalScore}
              </div>
            </div>

            {/* --- 改善建議與進階連結 --- */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 print:shadow-none">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <span className="bg-blue-600 text-white p-1 rounded">📋</span> 改善建議統整
              </h2>
              
              {/* 顯示錯誤與警告 (如果有) */}
              {(criticalFixes.length > 0 || warnings.length > 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-3">
                    <h3 className="text-red-600 font-black text-sm uppercase tracking-wider">🚨 優先修正 ({criticalFixes.length})</h3>
                    {criticalFixes.length > 0 ? (
                      criticalFixes.map((item, i) => (
                        <div key={i} className="p-3 bg-red-50 rounded-xl text-xs font-bold text-red-700 border border-red-100">
                          {item.category}: {item.name} 缺失或錯誤
                        </div>
                      ))
                    ) : <p className="text-xs text-slate-400">目前無嚴重錯誤</p>}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-orange-600 font-black text-sm uppercase tracking-wider">⚠️ 優化建議 ({warnings.length})</h3>
                    {warnings.length > 0 ? (
                      warnings.map((item, i) => (
                        <div key={i} className="p-3 bg-orange-50 rounded-xl text-xs font-bold text-orange-700 border border-orange-100">
                          {item.name}: {item.message}
                        </div>
                      ))
                    ) : <p className="text-xs text-slate-400">目前無優化建議</p>}
                  </div>
                </div>
              ) : (
                <div className="mb-8 p-4 bg-green-50 border border-green-100 rounded-2xl text-center">
                  <p className="text-green-700 font-bold text-sm">✨ 太棒了！您的網站基礎 SEO 表現非常出色。</p>
                </div>
              )}

              {/* --- 外部進階檢測與學習連結 (一律顯示) --- */}
              <div className="bg-slate-50 p-6 rounded-2xl print:hidden border border-slate-100">
                <h3 className="text-sm font-black text-slate-500 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  進階優化與學習資源
                </h3>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                  除了基礎 SEO 指標，<b>網路載入速度</b>、<b>Schema 結構完整性</b>以及<b>專業的網頁製作技術</b>也是成功的關鍵。請參考以下資源：
                </p>
                <div className="flex flex-wrap gap-4">
                  <a 
                    href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(report.url)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-blue-100 hover:scale-[1.02] active:scale-95"
                  >
                    🚀 PageSpeed 速度檢測
                  </a>
                  <a 
                    href={`https://validator.schema.org/#url=${encodeURIComponent(report.url)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-emerald-100 hover:scale-[1.02] active:scale-95"
                  >
                    🛠️ Schema 結構化驗證
                  </a>
                  <a 
                    href="https://ai-zeta-dusky-55.vercel.app/"
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-orange-100 hover:scale-[1.02] active:scale-95"
                  >
                    💡 學習加強與製作網頁
                  </a>
                </div>
              </div>
            </div>

            {/* --- 詳細分組項目 --- */}
            {Object.keys(groupedResults).map((category) => (
              <div key={category} className="space-y-4 break-inside-avoid">
                <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center">
                  <span className="w-8 h-1 bg-blue-500 mr-2 rounded-full"></span>
                  {category}
                </h2>
                <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden print:shadow-none print:border-slate-200">
                  {groupedResults[category].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-5 border-b last:border-0 border-slate-50 hover:bg-slate-50 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800">{item.name}</h3>
                        <p className="text-xs text-slate-400 font-medium">{item.message}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                          item.status === 'pass' ? 'bg-green-100 text-green-600' : 
                          item.status === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {item.status}
                        </span>
                        <div className="text-right min-w-[50px]">
                          <span className="font-bold text-slate-700">{item.score}</span>
                          <span className="text-slate-300 text-xs font-bold">/5</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CSS 針對列印優化 */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .shadow-xl, .shadow-lg { box-shadow: none !important; }
          .rounded-3xl { border-radius: 12px !important; }
          .break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
    </main>
  );
}