/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Anchor, Download, Save, Play, Info, Eye, X } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface MarkResult {
  bearing: number;
  range: number;
}

interface CalculationRow {
  dtg: number;
  marks: (MarkResult | null)[];
}

interface MarkInput {
  name: string;
  bearing: string;
  range: string;
}

export default function App() {
  const [marks, setMarks] = useState<MarkInput[]>([
    { name: '', bearing: '', range: '' },
    { name: '', bearing: '', range: '' },
    { name: '', bearing: '', range: '' },
  ]);
  const [course, setCourse] = useState('');
  const [legLength, setLegLength] = useState('');
  const [results, setResults] = useState<CalculationRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    let hasAtLeastOneMark = false;
    marks.forEach((mark, index) => {
      const isAnyFieldFilled = mark.name.trim() || mark.bearing.trim() || mark.range.trim();
      if (isAnyFieldFilled) {
        hasAtLeastOneMark = true;
        if (!mark.name.trim()) newErrors[`markName_${index}`] = 'Name required';
        
        const fbVal = parseFloat(mark.bearing);
        if (isNaN(fbVal)) newErrors[`finalBearing_${index}`] = 'Invalid';
        else if (fbVal < 0 || fbVal >= 360) newErrors[`finalBearing_${index}`] = '0-359.9';

        const frVal = parseFloat(mark.range);
        if (isNaN(frVal)) newErrors[`finalRange_${index}`] = 'Invalid';
        else if (frVal <= 0) newErrors[`finalRange_${index}`] = '> 0';
      }
    });

    if (!hasAtLeastOneMark) {
      newErrors.markName_0 = 'At least one mark required';
    }
    
    const cVal = parseFloat(course);
    if (isNaN(cVal)) newErrors.course = 'Enter a valid course (0-360)';
    else if (cVal < 0 || cVal >= 360) newErrors.course = 'Course should be 0-359.9';

    const llVal = parseFloat(legLength);
    if (isNaN(llVal)) newErrors.legLength = 'Enter a valid length';
    else if (llVal <= 0) newErrors.legLength = 'Length must be positive';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = () => {
    if (!validate()) return;

    const rows: CalculationRow[] = [];
    const cVal = parseFloat(course);
    const llVal = parseFloat(legLength);
    const cRad = (cVal * Math.PI) / 180;

    const points: number[] = [];
    for (let d = llVal; d > 1; d--) {
      points.push(d);
    }
    if (llVal >= 1) points.push(1);
    points.push(0.5);
    points.push(0);

    points.forEach((d) => {
      const xs = -d * Math.sin(cRad);
      const ys = -d * Math.cos(cRad);

      const markResults: (MarkResult | null)[] = marks.map((mark) => {
        if (!mark.name.trim()) return null;
        
        const fbVal = parseFloat(mark.bearing);
        const frVal = parseFloat(mark.range);
        const fbRad = (fbVal * Math.PI) / 180;

        const xm = frVal * Math.sin(fbRad);
        const ym = frVal * Math.cos(fbRad);

        const dx = xm - xs;
        const dy = ym - ys;

        const range = Math.sqrt(dx * dx + dy * dy);
        let bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
        if (bearing < 0) bearing += 360;

        return {
          bearing: Number(bearing.toFixed(1)),
          range: Number(range.toFixed(2)),
        };
      });

      rows.push({
        dtg: d,
        marks: markResults,
      });
    });
    setResults(rows);
    setPdfPreviewUrl(null); // Reset preview when new data is generated
  };

  const generatePDFDoc = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const activeMarks = marks.filter(m => m.name.trim());
    const tableWidth = 170;
    const startX = (210 - tableWidth) / 2;
    let currentY = 20;

    // Main Blue Header
    doc.setFillColor(51, 122, 183);
    doc.rect(startX, currentY, tableWidth, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`LEG - ${course}`, startX + tableWidth / 2, currentY + 7, { align: 'center' });
    currentY += 10;

    // Table Background (Light Blue)
    const rowHeight = 8; // Increased slightly for font size 12
    const headerHeight = 25; // Increased for font size 12
    const totalDataHeight = results.length * rowHeight;
    const totalTableHeight = headerHeight + totalDataHeight;
    
    doc.setFillColor(230, 242, 255);
    doc.rect(startX, currentY, tableWidth, totalTableHeight, 'F');

    // Column Widths
    const col1Width = 20; // CO LOL SP (Widened slightly)
    const col2Width = 20; // DTWO
    const remarksWidth = 25;
    const visualObjectsWidth = tableWidth - col1Width - col2Width - remarksWidth;
    const markColWidth = visualObjectsWidth / activeMarks.length;

    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.setTextColor(0);
    doc.setFontSize(12);

    // Header Row 1
    doc.rect(startX, currentY, col1Width, headerHeight);
    doc.rect(startX + col1Width, currentY, col2Width, headerHeight);
    doc.rect(startX + col1Width + col2Width, currentY, visualObjectsWidth, 10);
    doc.rect(startX + tableWidth - remarksWidth, currentY, remarksWidth, headerHeight);

    doc.setFont('helvetica', 'bold');
    doc.text('CO', startX + col1Width / 2, currentY + 6, { align: 'center' });
    doc.text('LOL', startX + col1Width / 2, currentY + 12, { align: 'center' });
    doc.text('SP', startX + col1Width / 2, currentY + 18, { align: 'center' });

    doc.text('DTWO', startX + col1Width + col2Width / 2, currentY + 15, { align: 'center' });
    doc.text('VISUAL OBJECTS', startX + col1Width + col2Width + visualObjectsWidth / 2, currentY + 7, { align: 'center' });
    doc.text('REMARKS', startX + tableWidth - remarksWidth / 2, currentY + 15, { align: 'center' });

    // Header Row 2 (Mark Names)
    let markX = startX + col1Width + col2Width;
    activeMarks.forEach((m) => {
      doc.rect(markX, currentY + 10, markColWidth, 15);
      
      doc.setTextColor(200, 0, 0);
      const nameLines = doc.splitTextToSize(m.name.toUpperCase(), markColWidth - 2);
      doc.text(nameLines, markX + markColWidth / 4, currentY + 16, { align: 'center' });
      
      const rangeLabelLines = doc.splitTextToSize(`RANGE ${m.name.toUpperCase()}`, markColWidth / 2 - 2);
      doc.text(rangeLabelLines, markX + (3 * markColWidth) / 4, currentY + 16, { align: 'center' });
      
      doc.line(markX + markColWidth / 2, currentY + 10, markX + markColWidth / 2, currentY + 25);
      markX += markColWidth;
    });

    const dataStartY = currentY + headerHeight;
    currentY = dataStartY;

    // First Column Merged Box (Data Area)
    doc.rect(startX, dataStartY, col1Width, totalDataHeight);
    
    // Center Course and Leg Length in the merged first column
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(course, startX + col1Width / 2, dataStartY + (totalDataHeight / 2) - 2, { align: 'center' });
    doc.text(`${legLength}C`, startX + col1Width / 2, dataStartY + (totalDataHeight / 2) + 6, { align: 'center' });

    // Data Rows
    doc.setFont('helvetica', 'normal');

    results.forEach((row, rowIndex) => {
      const isWO = row.dtg === 0;
      if (isWO) {
        doc.setFillColor(173, 216, 230);
        doc.rect(startX + col1Width, currentY, tableWidth - col1Width, rowHeight, 'F');
      }

      // Draw row borders (except first column which is merged)
      doc.rect(startX + col1Width, currentY, col2Width, rowHeight);
      doc.rect(startX + tableWidth - remarksWidth, currentY, remarksWidth, rowHeight);

      // DTWO Column
      doc.setFont('helvetica', 'bold');
      doc.text(isWO ? 'W/O' : `${row.dtg}C`, startX + col1Width + col2Width / 2, currentY + 6, { align: 'center' });
      doc.setFont('helvetica', 'normal');

      // Marks Data
      let rowMarkX = startX + col1Width + col2Width;
      row.marks.forEach((m, i) => {
        if (marks[i].name.trim()) {
          doc.rect(rowMarkX, currentY, markColWidth / 2, rowHeight);
          doc.rect(rowMarkX + markColWidth / 2, currentY, markColWidth / 2, rowHeight);
          
          if (m) {
            doc.text(m.bearing.toFixed(1), rowMarkX + markColWidth / 4, currentY + 6, { align: 'center' });
            doc.text(m.range.toFixed(2), rowMarkX + (3 * markColWidth) / 4, currentY + 6, { align: 'center' });
          }
          rowMarkX += markColWidth;
        }
      });

      currentY += rowHeight;
    });

    return doc;
  };

  const handleExport = () => {
    if (results.length === 0) {
      alert('Please generate the output first!');
      return;
    }
    const doc = generatePDFDoc();
    doc.save(`WOP_Navigator_Report.pdf`);
  };

  const handlePreview = () => {
    if (results.length === 0) {
      alert('Please generate the output first!');
      return;
    }
    const doc = generatePDFDoc();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfPreviewUrl(url);
  };

  const handleSave = () => {
    if (!validate()) {
      alert('Please fix the errors before saving.');
      return;
    }
    localStorage.setItem('wop_last_data', JSON.stringify({
      marks, course, legLength
    }));
    alert('Data saved successfully!');
  };

  const updateMark = (index: number, field: keyof MarkInput, value: string) => {
    const newMarks = [...marks];
    newMarks[index][field] = value;
    setMarks(newMarks);
    if (errors[`${field}_${index}`]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[`${field}_${index}`];
        return next;
      });
    }
  };

  const inputClasses = (fieldName: string) => {
    const hasError = !!errors[fieldName];
    return `w-full border-2 ${hasError ? 'border-red-400 bg-red-50 hover:border-red-500' : 'border-gray-400 hover:border-gray-500'} rounded-lg px-2 py-[2px] text-[12px] text-gray-900 focus:outline-none ${hasError ? 'focus:border-red-500' : 'focus:border-blue-500'} transition-all duration-200 placeholder:text-gray-900/50`;
  };

  const ErrorMessage = ({ fieldName }: { fieldName: string }) => {
    if (!errors[fieldName]) return null;
    return <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors[fieldName]}</p>;
  };

  const Tooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-1 align-middle">
      <Info size={12} className="text-gray-400 cursor-help hover:text-blue-500 transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-[10px] font-normal rounded shadow-lg z-50 text-center pointer-events-none normal-case tracking-normal">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4 md:p-6 font-sans">
      <div className="w-full max-w-4xl space-y-3">
        
        {/* Header 1: Title */}
        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl p-3 flex items-center justify-center relative shadow-sm border border-black/5">
          <div className="absolute left-3 bg-white/20 p-1.5 rounded-full">
            <Anchor className="text-white" size={24} />
          </div>
          <div className="text-center">
            <h1 className="text-white text-xl md:text-2xl font-bold tracking-wide">WOP NAVIGATOR APP</h1>
            <p className="text-white/90 text-[10px] mt-0.5">Developed by Asst Comdt Arun Tomar</p>
          </div>
        </div>

        {/* Introduction Text */}
        <div className="text-center px-4 py-1">
          <p className="text-[#043383] text-[11px] font-medium italic leading-relaxed bg-white pl-0 mt-0">
            This app helps navigators quickly calculate bearing and range of fixing marks at each cable.
          </p>
        </div>

        {/* Header 2: Buttons */}
        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl p-2 flex justify-between items-center px-4 shadow-sm border border-black/5 gap-2">
          <button 
            onClick={handleSave}
            className="bg-white text-blue-600 px-4 md:px-6 py-1.5 rounded-full font-bold text-xs hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-sm flex items-center gap-2"
          >
            <Save size={14} /> SAVE
          </button>
          <button 
            onClick={handlePreview}
            className="bg-white text-blue-600 px-4 md:px-6 py-1.5 rounded-full font-bold text-xs hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-sm flex items-center gap-2"
          >
            <Eye size={14} /> PREVIEW
          </button>
          <button 
            onClick={handleExport}
            className="bg-white text-blue-600 px-4 md:px-6 py-1.5 rounded-full font-bold text-xs hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-sm flex items-center gap-2"
          >
            <Download size={14} /> EXPORT
          </button>
        </div>

        {/* Main Content: Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-8 shadow-md space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Global Params */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b pb-2 mb-2">Approach Parameters</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Course</label>
                  <Tooltip text="The steady course the vessel is steering towards the Wheel Over Point (WOP). Unit: Degrees (°)" />
                </div>
                <input 
                  type="text"
                  value={course}
                  onChange={(e) => {
                    setCourse(e.target.value);
                    if (errors.course) setErrors(prev => ({ ...prev, course: '' }));
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="Eg., 185°"
                  className={inputClasses('course')}
                />
                <ErrorMessage fieldName="course" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">length of Leg</label>
                  <Tooltip text="The distance before the WOP for which you want to calculate approach data. Unit: Cables" />
                </div>
                <input 
                  type="text"
                  value={legLength}
                  onChange={(e) => {
                    setLegLength(e.target.value);
                    if (errors.legLength) setErrors(prev => ({ ...prev, legLength: '' }));
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="Eg., 20 C"
                  className={inputClasses('legLength')}
                />
                <ErrorMessage fieldName="legLength" />
              </div>
            </div>

            {/* Marks Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b pb-2 mb-2">Visual Marks (Up to 3)</h3>
              {marks.map((mark, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-xl space-y-3 bg-white shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Mark {index + 1}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="space-y-1">
                      <input 
                        type="text"
                        value={mark.name}
                        onChange={(e) => updateMark(index, 'name', e.target.value)}
                        placeholder="Mark Name (e.g. Nanwell Pt.)"
                        className={inputClasses(`markName_${index}`)}
                      />
                      <ErrorMessage fieldName={`markName_${index}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <input 
                          type="text"
                          value={mark.bearing}
                          onChange={(e) => updateMark(index, 'bearing', e.target.value)}
                          placeholder="Final Brg (°)"
                          className={inputClasses(`finalBearing_${index}`)}
                        />
                        <ErrorMessage fieldName={`finalBearing_${index}`} />
                      </div>
                      <div className="space-y-1">
                        <input 
                          type="text"
                          value={mark.range}
                          onChange={(e) => updateMark(index, 'range', e.target.value)}
                          placeholder="Final Rng (C)"
                          className={inputClasses(`finalRange_${index}`)}
                        />
                        <ErrorMessage fieldName={`finalRange_${index}`} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:from-cyan-600 hover:to-blue-700 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shadow-md flex items-center justify-center gap-2"
          >
            <Play size={20} fill="currentColor" /> GENERATE OUTPUT
          </button>

          {/* Note */}
          <div className="pt-2">
            <p className="text-cyan-600 text-[11px] font-medium leading-tight">
              <span className="font-bold">Note-</span> Approach data is calculated backward from the WOP, along the approach course vector.
            </p>
          </div>
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-lg overflow-hidden">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                <h3 className="text-blue-600 text-sm font-bold uppercase tracking-widest">Full Calculation Log</h3>
                <span className="text-gray-400 text-[10px] font-mono">{results.length} Points Calculated</span>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-[10px]">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-200">
                      <th className="pb-2 font-bold text-gray-600 uppercase w-16">DTG (C)</th>
                      {marks.map((m, i) => m.name.trim() ? (
                        <th key={i} colSpan={2} className="pb-2 font-bold text-blue-600 uppercase text-center border-l border-gray-100">
                          {m.name}
                        </th>
                      ) : null)}
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="py-1"></th>
                      {marks.map((m, i) => m.name.trim() ? (
                        <React.Fragment key={i}>
                          <th className="py-1 font-semibold text-gray-400 text-center border-l border-gray-100">Brg (°)</th>
                          <th className="py-1 font-semibold text-gray-400 text-center">Rng (C)</th>
                        </React.Fragment>
                      ) : null)}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row) => (
                      <tr key={row.dtg} className="border-b border-gray-50 last:border-0 hover:bg-blue-50 transition-colors">
                        <td className="py-2 text-gray-500 font-mono font-bold">{row.dtg === 0 ? 'WOP' : row.dtg}</td>
                        {row.marks.map((m, i) => marks[i].name.trim() ? (
                          <React.Fragment key={i}>
                            <td className="py-2 text-center border-l border-gray-100 font-bold text-gray-800">{m ? m.bearing.toFixed(1) : '-'}</td>
                            <td className="py-2 text-center font-bold text-gray-800">{m ? m.range.toFixed(2) : '-'}</td>
                          </React.Fragment>
                        ) : null)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PDF Preview Section */}
            {pdfPreviewUrl && (
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                  <h3 className="text-blue-600 text-sm font-bold uppercase tracking-widest">Report Preview</h3>
                  <button 
                    onClick={() => setPdfPreviewUrl(null)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="w-full aspect-[1/1.414] border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                  <iframe 
                    src={pdfPreviewUrl} 
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                </div>
                <div className="mt-4 flex justify-center">
                  <button 
                    onClick={handleExport}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md"
                  >
                    <Download size={16} /> DOWNLOAD PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
          background-color: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />
    </div>
  );
}
