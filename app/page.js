'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  
  // 手機版專用：純提示 Modal 狀態 (不含信件功能)
  const [showPromptModal, setShowPromptModal] = useState(false);

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
      setError(err.message || '連線發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 匯出按鈕邏輯：手機版跳提示，電腦版直接列印
  const handleExportClick = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      setShowPromptModal(true); 
    } else {
      window.print();          
    }
  };

  const criticalFixes = report?.results.filter(item => item.status === 'fail') || [];
  const warnings = report?.results.filter(item => item.status === 'warning') || [];
  const groupedResults = report?.results.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[#f8fafc] p-4 md:p-8 text-slate-900 print:bg-white print:p-0 overflow-x-hidden relative">
      {/* 動態背景裝飾 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden print:hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50 animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[0%] w-[30%] h-[30%] bg-indigo-100 rounded-full blur-[100px] opacity-40"></div>
      </div>

      {/* 手機版：純提示使用電腦下載的視窗 */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 print:hidden">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm animate-bounce-in text-center border border-slate-100">
            <div className="text-5xl mb-4">💻</div>
            <h3 className="text-xl font-black text-slate-800 mb-4">請使用電腦版本下載</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              手機版瀏覽器目前無法輸出完美的報告排版。<br/><br/>
              建議您改用 <b className="text-blue-600">電腦端瀏覽器</b> 開啟此網頁，即可取得完整的 PDF 報告。
            </p>
            <button 
              onClick={() => setShowPromptModal(false)} 
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl text-base shadow-lg hover:bg-blue-700 transition-all active:scale-95"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        {/* 搜尋與雙行標題區塊 */}
        <div className="bg-white/80 backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] border border-white text-center print:hidden animate-bounce-in">
          
          <div className="mb-8 flex justify-center">
            <a 
              href="https://ai-zeta-dusky-55.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-4 group transition-all duration-500 hover:scale-105"
            >
              <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-600 group-hover:rotate-12 transition-all duration-500">
                <img src="/favicon.svg" alt="智網 Logo" className="w-10 h-10 md:w-12 md:h-12 drop-shadow-sm group-hover:invert transition-all" />
              </div>
              <div className="flex flex-col text-left">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  網站自我評估
                </h1>
                <span className="text-sm md:text-base text-slate-500 font-bold mt-1 tracking-widest uppercase">
                  智網AI引擎
                </span>
              </div>
            </a>
          </div>

          <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-4 justify-center max-w-2xl mx-auto">
            <input
              type="url"
              placeholder="輸入網址，例如 https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="flex-1 px-6 py-4 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all bg-white/50 text-lg shadow-inner"
            />
            <button
              disabled={loading}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl hover:shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] hover:-translate-y-1 active:scale-95 disabled:opacity-50 transition-all text-lg whitespace-nowrap"
            >
              {loading ? '探測中...' : '開始探測'}
            </button>
          </form>
          
          {/* 首頁下方的教學推廣按鈕 */}
          {!report && !loading && (
            <div className="mt-8 flex justify-center animate-in fade-in duration-500">
              <a 
                href="https://ai-zeta-dusky-55.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full md:w-auto px-10 py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all text-base"
              >
                💡 學習更多網頁架設及 SEO
              </a>
            </div>
          )}

          {error && <div className="mt-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-2xl text-red-600 font-bold animate-shake">⚠️ {error}</div>}
        </div>

        {report && (
          <div className="space-y-6 md:space-y-8 pb-24 report-container">
            
            {/* 標題欄與操作按鈕 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end px-2 md:px-4 gap-4 md:gap-6 border-b-2 border-slate-100 pb-4">
              <div className="space-y-1 overflow-hidden w-full md:w-auto">
                <h2 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight truncate">分析完成！</h2>
                <div className="flex items-center gap-2 text-blue-600 font-mono text-[10px] md:text-sm bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100/50 break-all w-fit max-w-full">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="truncate">{report.url}</span>
                </div>
              </div>

              {/* 扁平化同一行按鈕 (手機板與電腦版通用) */}
              <div className="flex flex-row gap-2 w-full md:w-auto print:hidden shrink-0">
                <button 
                  onClick={() => {sessionStorage.removeItem('last_seo_report'); setReport(null);}} 
                  className="flex-1 md:flex-none bg-slate-200 text-slate-700 px-3 py-2 md:px-6 md:py-3 rounded-lg md:rounded-2xl font-bold text-xs md:text-base border border-slate-200 hover:bg-slate-300 transition-all shadow-sm whitespace-nowrap"
                >
                  重新測試
                </button>
                <button 
                  onClick={handleExportClick} 
                  className="flex-1 md:flex-none bg-red-600 text-white px-3 py-2 md:px-8 md:py-3 rounded-lg md:rounded-2xl font-black text-xs md:text-base hover:bg-red-700 hover:shadow-xl transition-all shadow-md flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  🖨️ 匯出報告
                </button>
              </div>
            </div>

            {/* 分數與進度條 */}
            <div className="group bg-gradient-to-br from-white via-white to-blue-50/30 p-8 md:p-10 rounded-3xl md:rounded-[2.5rem] shadow-xl border border-white flex flex-col md:flex-row items-center gap-8 md:gap-10 print:shadow-none print:border-slate-200">
              <div className="relative">
                <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-[10px] md:border-[12px] flex flex-col items-center justify-center transition-all duration-1000 ${report.totalScore >= 80 ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : report.totalScore >= 60 ? 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)]' : 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]'} print-force-color`}>
                  <span className="text-4xl md:text-5xl font-black">{report.totalScore}</span>
                  <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Score</span>
                </div>
              </div>

              <div className="flex-1 space-y-4 md:space-y-6 w-full text-center md:text-left">
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <h3 className="text-lg md:text-xl font-black text-slate-800">優化完成度</h3>
                    <span className="text-slate-500 font-bold text-xs md:text-sm">基礎優化起步 · {report.totalScore}%</span>
                  </div>
                  <div className="w-full h-4 md:h-5 bg-slate-100 rounded-2xl overflow-hidden p-0.5 md:p-1 shadow-inner print:border print:border-slate-100">
                    <div 
                      className={`h-full rounded-xl transition-all duration-1000 ease-out print-force-color ${report.totalScore >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' : report.totalScore >= 60 ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-gradient-to-r from-red-400 to-red-600'}`} 
                      style={{ width: `${report.totalScore}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">我們對網頁的 Meta、標題結構、內容品質及技術 SEO 進行了全面掃描。以下是您的優化建議：</p>
              </div>
            </div>

            {/* 建議區塊與重要三大按鈕 */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-lg border border-slate-50 print:shadow-none">
              
              <h3 className="text-lg md:text-xl font-black mb-6 flex items-center gap-2 text-slate-800">📋 改善建議統整</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
                <div className="space-y-4">
                  <h4 className="text-red-600 font-black text-sm flex items-center gap-2 border-b border-red-100 pb-2">🚨 優先修正 ({criticalFixes.length})</h4>
                  <div className="space-y-3">
                    {criticalFixes.length > 0 ? criticalFixes.map((item, i) => (
                      <div key={i} className="p-3 md:p-4 bg-red-50/50 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-red-700 border border-red-100/50 hover:bg-red-50 transition-colors print:bg-white print:border-red-200">
                        {item.name}: {item.message}
                      </div>
                    )) : <div className="text-slate-400 font-bold py-4 italic text-sm">完美無缺，繼續保持！</div>}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-orange-600 font-black text-sm flex items-center gap-2 border-b border-orange-100 pb-2">⚠️ 優化建議 ({warnings.length})</h4>
                  <div className="space-y-3">
                    {warnings.length > 0 ? warnings.map((item, i) => (
                      <div key={i} className="p-3 md:p-4 bg-orange-50/50 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-orange-700 border border-orange-100/50 hover:bg-orange-50 transition-colors print:bg-white print:border-orange-200">
                        {item.name}: {item.message}
                      </div>
                    )) : <div className="text-slate-400 font-bold py-4 italic text-sm">無優化建議</div>}
                  </div>
                </div>
              </div>

              {/* 三大重要按鈕區塊 */}
              <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-3 md:gap-4 print:hidden">
                <a 
                  href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(report.url)}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 bg-blue-50 text-blue-700 rounded-xl md:rounded-[1.5rem] text-sm font-black border border-blue-100 hover:bg-blue-600 hover:text-white transition-colors shadow-sm hover:shadow-md hover:-translate-y-1"
                >
                  🚀 官方 PageSpeed 測速
                </a>
                <a 
                  href={`https://validator.schema.org/#url=${encodeURIComponent(report.url)}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 bg-emerald-50 text-emerald-700 rounded-xl md:rounded-[1.5rem] text-sm font-black border border-emerald-100 hover:bg-emerald-500 hover:text-white transition-colors shadow-sm hover:shadow-md hover:-translate-y-1"
                >
                  🛠️ 官方 Schema 報告
                </a>
                <a 
                  href="https://ai-zeta-dusky-55.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 bg-orange-50 text-orange-700 rounded-xl md:rounded-[1.5rem] text-sm font-black border border-orange-100 hover:bg-orange-500 hover:text-white transition-colors shadow-sm hover:shadow-md hover:-translate-y-1"
                >
                  💡 學習網頁架設與SEO
                </a>
              </div>
            </div>

            {/* 詳細檢測項目列表 (保留了完整的 5/5 與不計分徽章) */}
            <div className="space-y-8 md:space-y-10 text-left">
              {Object.keys(groupedResults).map((category) => (
                <div key={category} className="space-y-4 break-inside-avoid section-card">
                  <div className="flex items-center gap-4 px-2">
                    <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">{category}</h2>
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-slate-200 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedResults[category].map((item, idx) => (
                      <div key={idx} className="bg-white p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all flex flex-col md:flex-row justify-between items-start gap-4 print:shadow-none print:border-slate-200">
                        <div className="space-y-1 flex-1 pr-0 md:pr-4">
                          <h4 className="font-black text-slate-800 text-sm md:text-base">{item.name}</h4>
                          <p className="text-[10px] md:text-xs text-slate-500 font-medium leading-relaxed">{item.message}</p>
                        </div>
                        
                        <div className="flex items-center justify-between w-full md:w-auto md:justify-end min-w-[140px] gap-4">
                          <span className={`px-2.5 py-1 rounded border text-[9px] md:text-[10px] font-black uppercase tracking-widest print-force-color ${
                            item.status === 'pass' ? 'bg-green-50 text-green-700 border-green-200' : 
                            item.status === 'warning' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {item.status}
                          </span>
                          
                          <div className="w-[45px] text-right">
                            {item.score !== null ? (
                              <>
                                <span className="font-bold text-slate-700">{item.score}</span>
                                <span className="text-slate-300 text-xs font-bold"> / 5</span>
                              </>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">不計分</span>
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
        /* 完整的 CSS 動畫與列印樣式 */
        @keyframes bounceIn {
          0% { opacity: 0; transform: translateY(-50px) scale(0.9); }
          70% { opacity: 1; transform: translateY(10px) scale(1.02); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-bounce-in { animation: bounceIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-shake { animation: shake 0.3s ease-in-out infinite; }
        
        .report-container > * { opacity: 0; animation: fadeInUp 0.7s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .report-container > *:nth-child(1) { animation-delay: 0.1s; }
        .report-container > *:nth-child(2) { animation-delay: 0.25s; }
        .report-container > *:nth-child(3) { animation-delay: 0.4s; }
        .report-container > .section-card:nth-child(n+4) { animation-delay: 0.5s; }

        /* 強制在列印 PDF 時顯示色彩 */
        .print-force-color {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .report-container > * { opacity: 1 !important; transform: none !important; animation: none !important; }
          .shadow-xl, .shadow-lg, .shadow-md, .shadow-sm { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
          .rounded-[2.5rem], .rounded-[2rem], .rounded-[1.5rem], .rounded-3xl, .rounded-2xl, .rounded-xl { border-radius: 12px !important; }
          .break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
    </main>
  );
}