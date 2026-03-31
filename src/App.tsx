/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Anchor, Download, Save, Play } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface CalculationRow {
  dtg: number;
  bearing: number;
  range: number;
}

export default function App() {
  const [markName, setMarkName] = useState('');
  const [course, setCourse] = useState('');
  const [finalBearing, setFinalBearing] = useState('');
  const [finalRange, setFinalRange] = useState('');
  const [legLength, setLegLength] = useState('');
  const [results, setResults] = useState<CalculationRow[]>([]);

  const handleGenerate = () => {
    const rows: CalculationRow[] = [];
    const cVal = parseFloat(course) || 0;
    const fbVal = parseFloat(finalBearing) || 0;
    const frVal = parseFloat(finalRange) || 0;
    const llVal = Math.max(0, parseInt(legLength) || 0);

    const cRad = (cVal * Math.PI) / 180;
    const fbRad = (fbVal * Math.PI) / 180;

    const xm = frVal * Math.sin(fbRad);
    const ym = frVal * Math.cos(fbRad);

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

      const dx = xm - xs;
      const dy = ym - ys;

      const range = Math.sqrt(dx * dx + dy * dy);
      let bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
      if (bearing < 0) bearing += 360;

      rows.push({
        dtg: d,
        bearing: Number(bearing.toFixed(1)),
        range: Number(range.toFixed(2)),
      });
    });
    setResults(rows);
  };

  const handleExport = () => {
    if (results.length === 0) {
      alert('Please generate the output first!');
      return;
    }
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 150, 200);
    doc.text('WOP NAVIGATOR APP', 105, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 25, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Parameters:', 20, 35);

    doc.setFont('helvetica', 'normal');
    doc.text(`Visual Mark Name: ${markName}`, 20, 42);
    doc.text(`Present Course: ${course}°`, 20, 48);
    doc.text(`Final Bearing: ${finalBearing}°`, 20, 54);
    doc.text(`Final Range: ${finalRange} cables`, 20, 60);
    doc.text(`Length of Leg: ${legLength} cables`, 20, 66);

    doc.setFillColor(240, 240, 240);
    doc.rect(20, 75, 170, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('DTG (Cables)', 25, 80);
    doc.text('Bearing (°)', 85, 80);
    doc.text('Range (Cables)', 145, 80);

    doc.setFont('helvetica', 'normal');
    let y = 88;
    results.forEach((row, index) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(20, y - 5, 170, 7, 'F');
      }
      doc.text(row.dtg === 0 ? 'WOP' : row.dtg.toString(), 25, y);
      doc.text(row.bearing.toFixed(1), 85, y);
      doc.text(row.range.toFixed(2), 145, y);
      y += 7;
    });

    doc.setFontSize(7);
    doc.setTextColor(0, 100, 150);
    doc.text('Note: Approach data is calculated backward from the WOP, along the approach course vector.', 105, 290, { align: 'center' });

    doc.save(`WOP_Navigator_${markName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleSave = () => {
    localStorage.setItem('wop_last_data', JSON.stringify({
      markName, course, finalBearing, finalRange, legLength
    }));
    alert('Data saved successfully!');
  };

  const inputClasses = "w-full border-2 border-gray-400 rounded-lg p-2 text-base text-gray-900 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-900/50";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4 md:p-6 font-sans">
      <div className="w-full max-w-xl space-y-3">
        
        {/* Header 1: Title */}
        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl p-3 flex items-center justify-center relative shadow-sm border border-black/5">
          <div className="absolute left-3 bg-white/20 p-1.5 rounded-full">
            <Anchor className="text-white" size={24} />
          </div>
          <div className="text-center">
            <h1 className="text-white text-xl md:text-2xl font-bold tracking-wide">WOP NAVIGATOR APP</h1>
            <p className="text-white/90 text-[10px] mt-0.5">by Arun Tomar</p>
          </div>
        </div>

        {/* Header 2: Buttons */}
        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl p-2 flex justify-between items-center px-6 shadow-sm border border-black/5">
          <button 
            onClick={handleSave}
            className="bg-white text-blue-600 px-8 py-1.5 rounded-full font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <Save size={16} /> SAVE
          </button>
          <button 
            onClick={handleExport}
            className="bg-white text-blue-600 px-8 py-1.5 rounded-full font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <Download size={16} /> EXPORT
          </button>
        </div>

        {/* Main Content: Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-8 shadow-md space-y-5">
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Visual Mark Name</label>
              <input 
                type="text"
                value={markName}
                onChange={(e) => setMarkName(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Eg., Nanwell Pt."
                className={inputClasses}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Course</label>
              <input 
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Eg., 185°"
                className={inputClasses}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Final bearing of Visual mark</label>
              <input 
                type="text"
                value={finalBearing}
                onChange={(e) => setFinalBearing(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Eg., 270°"
                className={inputClasses}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Final range of visual mark</label>
              <input 
                type="text"
                value={finalRange}
                onChange={(e) => setFinalRange(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Eg., 12.5 Cable"
                className={inputClasses}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">length of Leg</label>
              <input 
                type="text"
                value={legLength}
                onChange={(e) => setLegLength(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Eg., 20 C"
                className={inputClasses}
              />
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-md flex items-center justify-center gap-2"
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
          <div className="mt-6 bg-white rounded-2xl p-5 border border-gray-200 shadow-lg">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
              <h3 className="text-blue-600 text-sm font-bold uppercase tracking-widest">Full Calculation Log</h3>
              <span className="text-gray-400 text-[10px] font-mono">{results.length} Points Calculated</span>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="pb-2 font-bold text-gray-600 uppercase">DTG (C)</th>
                    <th className="pb-2 font-bold text-gray-600 uppercase">Bearing (°)</th>
                    <th className="pb-2 font-bold text-gray-600 uppercase">Range (C)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row) => (
                    <tr key={row.dtg} className="border-b border-gray-50 last:border-0 hover:bg-blue-50 transition-colors">
                      <td className="py-2 text-gray-500 font-mono">{row.dtg === 0 ? 'WOP' : row.dtg}</td>
                      <td className="py-2 font-bold text-gray-800">{row.bearing.toFixed(1)}°</td>
                      <td className="py-2 font-bold text-gray-800">{row.range.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
