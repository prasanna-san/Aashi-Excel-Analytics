"use client"


import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const PREVIEW_ROWS = 10;

function getFileExtension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function isSupportedFileType(file: File) {
  const ext = getFileExtension(file.name);
  return [
    'xls', 'xlsx', 'csv', 'tsv', 'txt', 'ods', 'xml', 'json', 'html', 'htm',
  ].includes(ext);
}

function readFileAsync(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export default function HomePage() {
  const [history, setHistory] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [graphType, setGraphType] = useState<'Bar' | 'Line' | 'Pie' | 'Area'>('Bar');
  const [xKey, setXKey] = useState<string>('');
  const [yKey, setYKey] = useState<string>('');

  // Prepare data for recharts
  const chartData = React.useMemo(() => {
    if (!previewHeaders.length || !preview.length) return [];
    // Convert preview (array of arrays) to array of objects
    return preview.map((row: any[]) => {
      const obj: any = {};
      previewHeaders.forEach((header, idx) => {
        obj[header] = row[idx];
      });
      return obj;
    });
  }, [preview, previewHeaders]);

  // Helper: check if a column is numeric in the preview data
  const isNumericColumn = (col: string) => {
    if (!col || !chartData.length) return false;
    return chartData.some(row => !isNaN(Number(row[col])) && row[col] !== '' && row[col] !== null && row[col] !== undefined);
  };

  // Prepare numeric chart data for recharts (for Y/value columns)
  const numericChartData = React.useMemo(() => {
    if (!xKey || !yKey || !isNumericColumn(yKey)) return [];
    return chartData.map(row => ({
      ...row,
      [yKey]: isNaN(Number(row[yKey])) ? null : Number(row[yKey])
    })).filter(row => row[yKey] !== null);
  }, [chartData, xKey, yKey]);

  // For Pie chart, use first two columns by default
  React.useEffect(() => {
    if (previewHeaders.length) {
      setXKey(previewHeaders[0]);
      setYKey(previewHeaders[1] || '');
    }
  }, [previewHeaders]);

  // Colors for Pie chart
  const pieColors = ['#16a34a', '#22c55e', '#4ade80', '#bbf7d0', '#166534', '#65a30d', '#a3e635', '#bef264'];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 2MB limit.');
      return;
    }
    if (!isSupportedFileType(file)) {
      setError('Unsupported file type.');
      return;
    }
    try {
      const data = await readFileAsync(file);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const headers = (json[0] as string[]) || [];
      const rows = json.slice(1, PREVIEW_ROWS + 1);
      setPreviewHeaders(headers);
      setPreview(rows);
      setHistory(prev => [
        {
          name: file.name,
          size: file.size,
          type: file.type,
          data,
          headers,
          rows,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
    } catch (err) {
      setError('Failed to parse file.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = (item: any) => {
    const blob = new Blob([item.data], { type: item.type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (timestamp: number) => {
    setHistory(prev => prev.filter(item => item.timestamp !== timestamp));
    setPreview([]);
    setPreviewHeaders([]);
  };

  const handleHistoryPreview = (item: any) => {
    setPreviewHeaders(item.headers);
    setPreview(item.rows);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-white to-yellow-100 flex flex-col font-sans">
      {/* Header with logo */}
      <header className="flex items-center justify-between px-8 py-6 bg-gradient-to-br from-green-800 to-green-600 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-green-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
            {/* Placeholder logo */}
            <span className="text-green-900 font-extrabold text-3xl tracking-tight">XL</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow">Excel File Uploader</h1>
        </div>
        <nav className="flex gap-8">
          <a href="#about" className="text-white-300 hover:text-white font-semibold transition">About</a>
          <a href="#contact" className="text-white-300 hover:text-white font-semibold transition">Contact</a>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col md:flex-row gap-10 px-4 md:px-10 py-10 max-w-7xl mx-auto w-full">
        {/* Upload & Preview */}
        <section className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-2xl bg-white/90 rounded-2xl shadow-xl p-8 mb-8 border border-green-200">
            <h2 className="text-2xl font-bold text-green-900 mb-6 tracking-tight">Upload a File</h2>
            <label className="block w-full cursor-pointer mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx,.csv,.tsv,.txt,.ods,.xml,.json,.html,.htm"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-700 to-green-500 text-white font-semibold py-3 rounded-lg shadow hover:from-green-800 hover:to-green-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
                <span>Choose File</span>
              </div>
            </label>
            {error && <div className="text-red-600 mb-2 font-semibold">{error}</div>}
            <div className="text-xs text-gray-500 mb-2">Supported: Excel, CSV, TSV, TXT, ODS, XML, JSON, HTML. Max 2MB.</div>
          </div>

          {preview.length > 0 && (
            <>
              <div className="w-full flex justify-center">
                <div className="w-full max-w-2xl overflow-x-auto mt-4 max-h-[320px] overflow-y-auto rounded-xl border-2 border-green-700 bg-white shadow-lg">
                  <table className="min-w-full text-base">
                    <thead className="sticky top-0 bg-green-800 z-10">
                      <tr>
                        {previewHeaders.map((header, idx) => (
                          <th key={idx} className="px-5 py-3 border-b border-green-300 text-yellow-300 text-base font-bold whitespace-nowrap uppercase tracking-wide">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="hover:bg-yellow-50">
                          {row.map((cell: any, j: number) => (
                            <td key={j} className="px-5 py-2 border-b border-green-100 text-green-900 text-base whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-xs text-green-700 mt-2 px-4 pb-2">Showing first {PREVIEW_ROWS} rows (if available)</div>
                </div>
              </div>

              {/* Graph Controls & Visualization */}
              <div className="w-full flex flex-col items-center mt-10">
                <div className="w-full max-w-2xl bg-gradient-to-r from-green-800 to-green-600 rounded-xl shadow-lg p-6 mb-6 border border-yellow-200 flex flex-wrap gap-6 items-end">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-yellow-200 text-sm font-bold mb-1">Graph Type</label>
                    <select
                      className="border-2 border-yellow-300 rounded-lg px-3 py-2 w-full bg-white text-green-900 font-semibold focus:ring-2 focus:ring-yellow-400 transition"
                      value={graphType}
                      onChange={e => setGraphType(e.target.value as any)}
                    >
                      <option value="Bar">Bar</option>
                      <option value="Line">Line</option>
                      <option value="Pie">Pie</option>
                      <option value="Area">Area</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-yellow-200 text-sm font-bold mb-1">X Axis / Category</label>
                    <select
                      className="border-2 border-yellow-300 rounded-lg px-3 py-2 w-full bg-white text-green-900 font-semibold focus:ring-2 focus:ring-yellow-400 transition"
                      value={xKey}
                      onChange={e => setXKey(e.target.value)}
                    >
                      {previewHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  {graphType !== 'Pie' && (
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-yellow-200 text-sm font-bold mb-1">Y Axis / Value</label>
                      <select
                        className="border-2 border-yellow-300 rounded-lg px-3 py-2 w-full bg-white text-green-900 font-semibold focus:ring-2 focus:ring-yellow-400 transition"
                        value={yKey}
                        onChange={e => setYKey(e.target.value)}
                      >
                        {previewHeaders.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="w-full max-w-2xl h-80 bg-white rounded-xl shadow-xl flex items-center justify-center border-2 border-green-800">
                  {graphType === 'Bar' && xKey && yKey && isNumericColumn(yKey) && numericChartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={numericChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={xKey} stroke="#166534" tick={{ fill: '#166534', fontWeight: 600 }} />
                        <YAxis stroke="#166534" tick={{ fill: '#166534', fontWeight: 600 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey={yKey} fill="#facc15" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {graphType === 'Line' && xKey && yKey && isNumericColumn(yKey) && numericChartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={numericChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={xKey} stroke="#166534" tick={{ fill: '#166534', fontWeight: 600 }} />
                        <YAxis stroke="#166534" tick={{ fill: '#166534', fontWeight: 600 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey={yKey} stroke="#facc15" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  {graphType === 'Area' && xKey && yKey && isNumericColumn(yKey) && numericChartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={numericChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={xKey} stroke="#166534" tick={{ fill: '#166534', fontWeight: 600 }} />
                        <YAxis stroke="#166534" tick={{ fill: '#166534', fontWeight: 600 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey={yKey} stroke="#facc15" strokeWidth={3} fill="#fef9c3" fillOpacity={0.7} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  {graphType === 'Pie' && xKey && yKey && isNumericColumn(yKey) && numericChartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip />
                        <Legend />
                        <Pie
                          data={numericChartData}
                          dataKey={yKey}
                          nameKey={xKey}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          fill="#facc15"
                          label
                        >
                          {numericChartData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {/* Fallbacks and user-friendly messages */}
                  {((graphType === 'Pie' && (!xKey || !yKey)) || ((graphType !== 'Pie') && (!xKey || !yKey))) && (
                    <span className="text-yellow-600 font-semibold">Select columns to visualize the data.</span>
                  )}
                  {yKey && !isNumericColumn(yKey) && (
                    <span className="text-red-500 text-base font-semibold">Selected Y/value column is not numeric. Please select a numeric column.</span>
                  )}
                  {yKey && isNumericColumn(yKey) && numericChartData.length === 0 && (
                    <span className="text-red-500 text-base font-semibold">No numeric data found in the selected column for plotting.</span>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {/* History */}
        <section className="w-full md:w-1/3 flex flex-col">
          <div className="bg-white/90 rounded-2xl shadow-xl p-6 border border-green-200 flex flex-col flex-1">
            <h2 className="text-xl font-bold text-green-900 mb-4 tracking-tight">Upload History</h2>
            {history.length === 0 ? (
              <div className="text-green-400 text-xs">No files uploaded yet.</div>
            ) : (
              <ul className="space-y-2 h-48 overflow-y-auto pr-1">
                {history.map(item => (
                  <li key={item.timestamp} className="flex items-center justify-between border-b border-green-100 py-1">
                    <div className="flex-1 min-w-0">
                      <span className="block text-green-900 text-xs truncate cursor-pointer hover:underline" title={item.name} onClick={() => handleHistoryPreview(item)}>{item.name}</span>
                      <span className="text-green-400 text-[10px]">{(item.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button className="p-1 hover:bg-green-100 rounded text-xs font-semibold text-green-700" title="Download" onClick={() => handleDownload(item)}>Download</button>
                      <button className="p-1 hover:bg-red-100 rounded text-xs font-semibold text-red-500" title="Delete" onClick={() => handleDelete(item.timestamp)}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      {/* About & Contact */}
      <footer className="bg-gradient-to-br from-green-800 to-green-600 text-white px-8 py-12 mt-8 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-10">
          <section id="about" className="flex-1">
            <h3 className="font-extrabold text-2xl mb-2 text-white-300 tracking-tight">About</h3>
            <p className="text-green-100 text-lg">This is a placeholder for the About section. Describe your Excel file uploading service here.</p>
          </section>
          <section id="contact" className="flex-1">
            <h3 className="font-extrabold text-2xl mb-2 text-white-300 tracking-tight">Contact</h3>
            <p className="text-green-100 text-lg">This is a placeholder for the Contact section. Add your contact information or a form here.</p>
          </section>
        </div>
      </footer>
    </div>
  );
}
