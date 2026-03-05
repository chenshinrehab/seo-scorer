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
  const criticalFixes = report?.results.filter(item => item.status === 'fail');
  const warnings = report?.results.filter(item => item.status === 'warning');

  // 2. 分組邏輯
  const groupedResults = report?.results.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // 3. PDF 匯出功能 (利用 Print API)
  const exportPDF = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 搜尋區塊 - 列印時隱藏 */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center print:hidden">
          <h1 className="text-3xl font-black mb-6 tracking-tight text-blue-600">Detailed SEO Scorer</h1>
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
          {error && <p className="text-red-500 mt-4 font-bold">⚠️ {error}</p>}
        </div>

        {report && (
          <div className="space-y-8 pb-20">
            
            {/* 報告標題與操作按鈕 */}
            <div className="flex justify-between items-center px-2">
              <div>
                <h2 className="text-2xl font-black text-slate-800">網頁SEO評估報告</h2>
                <p className="text-slate-400 text-sm font-mono">{report.url}</p>
              </div>
              <button 
                onClick={exportPDF}
                className="bg-slate-800 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-slate-900 transition-all print:hidden"
              >
                匯出 PDF 報告
              </button>
            </div>

            {/* 總分卡片 */}
            <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center border-b-8 border-blue-500 print:shadow-none print:border-slate-200">
              <span className="text-slate-400 font-black uppercase text-xs tracking-widest">Global SEO Score</span>
              <div className={`text-7xl font-black my-2 ${report.totalScore >= 80 ? 'text-green-500' : report.totalScore >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                {report.totalScore}
              </div>
            </div>

            {/* --- 改善建議統整 --- */}
            {(criticalFixes.length > 0 || warnings.length > 0) && (
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 print:shadow-none">
                <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                  <span className="bg-blue-600 text-white p-1 rounded">📋</span> 改善建議統整
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 嚴重錯誤 */}
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

                  {/* 警告建議 */}
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
              </div>
            )}

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