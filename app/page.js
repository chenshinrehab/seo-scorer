'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('last_seo_report');
    if (saved) setReport(JSON.parse(saved));
  }, []);

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
      sessionStorage.setItem('last_seo_report', JSON.stringify(data));
    } catch (err) {
      setError(err.message || '發生未知錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    window.print();
  };

  const criticalFixes = report?.results.filter(item => item.status === 'fail') || [];
  const warnings = report?.results.filter(item => item.status === 'warning') || [];

  const groupedResults = report?.results.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 print:bg-white print:p-0 overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 搜尋與標題區塊 */}
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 text-center print:hidden">
          <div className="mb-6 flex justify-center">
            <a 
              href="https://ai-zeta-dusky-55.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-3 group transition-transform hover:scale-105"
            >
              <img src="/favicon.svg" alt="智網 Logo" className="w-10 h-10 md:w-12 md:h-12 drop-shadow-sm" />
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-blue-600 group-hover:text-blue-700 transition-colors">
                智網 網站 SEO 評估
              </h1>
            </a>
          </div>

          <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-3 justify-center max-w-2xl mx-auto">
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
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-md active:scale-95 disabled:opacity-50 transition-all min-w-[140px]"
            >
              {loading ? '分析中...' : '開始分析'}
            </button>
          </form>
          
          {!report && !loading && (
            <div className="mt-6 flex justify-center">
              <a 
                href="https://ai-zeta-dusky-55.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full md:w-auto px-8 py-3 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 shadow-md transition-all"
              >
                💡 需要建立具備強大 SEO 的網站？點擊了解智網服務
              </a>
            </div>
          )}
          {error && <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-bold">⚠️ {error}</div>}
        </div>

        {report && (
          <div className="space-y-6 pb-20 report-container">
            
            {/* 報告標題與匯出按鈕 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 pb-2 border-b-2 border-slate-200 gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800">網頁 SEO 評估報告</h2>
                <p className="text-slate-500 text-sm font-mono mt-1">{report.url}</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto print:hidden">
                <button 
                  onClick={() => {sessionStorage.removeItem('last_seo_report'); setReport(null);}} 
                  className="flex-1 md:flex-none bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors"
                >
                  清除重測
                </button>
                <button 
                  onClick={exportPDF} 
                  className="flex-1 md:flex-none bg-red-600 text-white px-8 py-2.5 rounded-xl font-black text-sm hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
                >
                  🖨️ 匯出 PDF 報告
                </button>
              </div>
            </div>

            {/* 總分展示區塊 (包含修正後的進度條) */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-8 print:shadow-none print:border-slate-100">
              <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
                <span className="text-slate-400 font-black uppercase text-xs tracking-widest mb-1">On-Page SEO Score</span>
                <div className="flex items-baseline gap-2">
                  <div className={`text-6xl font-black ${report.totalScore >= 80 ? 'text-green-500' : report.totalScore >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                    {report.totalScore}
                  </div>
                  <span className="text-slate-400 font-bold">/ 100</span>
                </div>
              </div>

              <div className="w-full flex-1 md:max-w-md">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>基礎優化起步</span>
                  <span className="text-slate-700">體質完成度 {report.totalScore}%</span>
                  <span>完美</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner print:border print:border-slate-100">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out print-force-color ${report.totalScore >= 80 ? 'bg-green-500' : report.totalScore >= 60 ? 'bg-orange-500' : 'bg-red-500'}`} 
                    style={{ width: `${report.totalScore}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 改善建議統整 */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 print:shadow-none">
              <h2 className="text-lg font-black mb-5 flex items-center gap-2 text-slate-800">📋 改善建議統整</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-red-600 font-black text-sm border-b border-red-100 pb-2">🚨 優先修正項目 ({criticalFixes.length})</h3>
                  {criticalFixes.length > 0 ? criticalFixes.map((item, i) => (
                    <div key={i} className="px-3 py-2 bg-red-50 rounded-lg text-xs font-bold text-red-700 border border-red-100 print:bg-white print:border-red-200">
                      {item.name}: {item.message}
                    </div>
                  )) : <div className="text-xs text-slate-400 font-medium">目前無嚴重錯誤</div>}
                </div>
                <div className="space-y-3">
                  <h3 className="text-orange-600 font-black text-sm border-b border-orange-100 pb-2">⚠️ 優化建議 ({warnings.length})</h3>
                  {warnings.length > 0 ? warnings.map((item, i) => (
                    <div key={i} className="px-3 py-2 bg-orange-50 rounded-lg text-xs font-bold text-orange-700 border border-orange-100 print:bg-white print:border-orange-200">
                      {item.name}: {item.message}
                    </div>
                  )) : <div className="text-xs text-slate-400 font-medium">目前無優化建議</div>}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 print:hidden">
                <a href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(report.url)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold border border-blue-100 hover:bg-blue-600 hover:text-white transition-colors">🚀 官方 PageSpeed 測速</a>
                <a href={`https://validator.schema.org/#url=${encodeURIComponent(report.url)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-100 hover:bg-emerald-500 hover:text-white transition-colors">🛠️ 官方 Schema 報告</a>
                <a href="https://ai-zeta-dusky-55.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 text-orange-700 rounded-xl text-sm font-bold border border-orange-100 hover:bg-orange-500 hover:text-white transition-colors">💡 智網 網頁製作與SEO</a>
              </div>
            </div>

            {/* 詳細檢測項目 */}
            <div className="space-y-6">
              {Object.keys(groupedResults).map((category) => (
                <div key={category} className="space-y-3 break-inside-avoid section-card">
                  <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center">
                    <span className="w-6 h-1 bg-blue-500 mr-2 rounded-full"></span>{category}
                  </h2>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none">
                    {groupedResults[category].map((item, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b last:border-0 border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 pr-4 mb-2 md:mb-0">
                          <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
                          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{item.message}</p>
                        </div>
                        <div className="flex items-center justify-between md:justify-end min-w-[140px] gap-4">
                          <span className={`px-2.5 py-1 rounded border text-[10px] font-black uppercase tracking-wider print-force-color ${
                            item.status === 'pass' ? 'bg-green-50 text-green-700 border-green-200' : 
                            item.status === 'warning' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {item.status}
                          </span>
                          <div className="w-[45px] text-right">
                            {item.score !== null ? (
                              <><span className="font-bold text-slate-700">{item.score}</span><span className="text-slate-300 text-xs font-bold">/5</span></>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">不計分</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .report-container > * {
          opacity: 0;
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .report-container > *:nth-child(1) { animation-delay: 0.1s; }
        .report-container > *:nth-child(2) { animation-delay: 0.2s; }
        .report-container > *:nth-child(3) { animation-delay: 0.3s; }
        .report-container > *:nth-child(4) .section-card:nth-child(1) { animation-delay: 0.4s; }
        .report-container > *:nth-child(4) .section-card:nth-child(2) { animation-delay: 0.5s; }

        /* 重要：強制在列印 PDF 時顯示色彩 */
        .print-force-color {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .shadow-sm, .shadow-lg { box-shadow: none !important; }
          .rounded-3xl, .rounded-2xl, .rounded-xl { border-radius: 8px !important; }
          .break-inside-avoid { break-inside: avoid; }
          .report-container > * { opacity: 1 !important; transform: none !important; animation: none !important; }
        }
      `}</style>
    </main>
  );
}