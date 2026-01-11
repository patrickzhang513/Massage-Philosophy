
import React, { useState, useEffect } from 'react';
import { TRANS } from './constants';
import { FormData, Language, ViewMode, ClientRecord } from './types';
import { generateAssessmentReport } from './services/geminiService';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [mode, setMode] = useState<ViewMode>('client');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState('');
  
  // Local storage based persistence
  const [records, setRecords] = useState<ClientRecord[]>([]);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    insurance: '',
    painArea: [],
    painSide: '',
    duration: '',
    painDesc: [],
    painLevel: 5,
    activity: '',
    sitting: '<2h',
    goals: [],
    notes: '',
    consent: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('mp_records_v2');
    if (saved) setRecords(JSON.parse(saved));
  }, []);

  const saveRecords = (newRecords: ClientRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('mp_records_v2', JSON.stringify(newRecords));
  };

  const t = TRANS[lang];

  const toggleLanguage = () => setLang(prev => prev === 'en' ? 'zh' : 'en');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMultiSelect = (name: keyof FormData, value: string) => {
    setFormData(prev => {
      const current = prev[name] as string[];
      if (current.includes(value)) {
        return { ...prev, [name]: current.filter(i => i !== value) };
      }
      if (name === 'painArea' && current.length >= 3) return prev;
      return { ...prev, [name]: [...current, value] };
    });
  };

  const resetApp = () => {
    setSubmitted(false);
    setWarning('');
    setFormData({
      name: '', email: '', insurance: '', painArea: [], painSide: '', duration: '',
      painDesc: [], painLevel: 5, activity: '', sitting: '<2h', goals: [], notes: '', consent: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.painArea.length === 0) {
      setWarning(t.required_warning);
      return;
    }
    if (!formData.consent) {
      setWarning(t.consent_warning);
      return;
    }

    setLoading(true);
    // V2 Logic: Save locally, do not generate AI yet.
    const newRecord: ClientRecord = {
      ...formData,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
    };
    saveRecords([newRecord, ...records]);
    setSubmitted(true);
    setLoading(false);
  };

  const handleStaffGenReport = async (record: ClientRecord) => {
    setLoading(true);
    try {
      const result = await generateAssessmentReport(record, lang);
      const updated = records.map(r => r.id === record.id ? { ...r, aiResult: result } : r);
      saveRecords(updated);
    } catch (err) {
      alert("AI Generation failed. Check your API configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (record: ClientRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Therapy Plan - ${record.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Noto Sans SC', sans-serif; padding: 40px; color: #333; line-height: 1.6; background: #fff; }
            .header { border-bottom: 3px solid #9e2a2b; padding-bottom: 15px; margin-bottom: 30px; }
            .header h1 { color: #9e2a2b; margin: 0; font-size: 28px; }
            .header p { margin: 5px 0 0; color: #666; font-weight: bold; }
            .info-card { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; background: #fdfbf7; padding: 20px; border: 1px solid #eee; border-radius: 12px; }
            .info-box b { display: block; font-size: 10px; color: #9e2a2b; text-transform: uppercase; margin-bottom: 2px; }
            .info-box span { font-size: 16px; font-weight: 700; }
            .report-section { white-space: pre-wrap; margin-top: 20px; font-size: 15px; }
            .report-section h1, .report-section h2, .report-section h3 { font-size: 18px; color: #2c1e1c; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 25px; }
            .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #999; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Massage Philosophy</h1>
            <p>Clinical Assessment & Treatment Strategy</p>
          </div>
          <div class="info-card">
            <div class="info-box"><b>Name</b><span>${record.name}</span></div>
            <div class="info-box"><b>Date</b><span>${record.timestamp}</span></div>
            <div class="info-box"><b>Chief Complaint</b><span>${record.painArea.join(', ')}</span></div>
            <div class="info-box"><b>Intensity</b><span>${record.painLevel}/10</span></div>
            <div class="info-box"><b>Side/Pattern</b><span>${record.painSide}</span></div>
            <div class="info-box"><b>Duration</b><span>${record.duration}</span></div>
            <div class="info-box"><b>Activity</b><span>${record.activity} (Sit: ${record.sitting})</span></div>
            <div class="info-box"><b>Today's Goal</b><span>${record.goals.join(', ')}</span></div>
          </div>
          <div class="report-section">${record.aiResult || 'Assessment pending generation.'}</div>
          <div class="footer">Confidential Patient Document - Massage Philosophy Clinical AI Suite</div>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderClientMode = () => {
    if (submitted) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-20 animate-fade-in text-center">
          <div className="mb-10"><h2 className="text-4xl font-black text-[#9e2a2b]">Massage Philosophy</h2></div>
          <div className="bg-white border-2 border-green-200 p-10 rounded-3xl shadow-xl">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
            <h3 className="text-3xl font-bold mb-4 text-[#2c1e1c]">{t.success}</h3>
            <p className="text-xl text-gray-600 leading-relaxed font-medium">
              Thank you, {formData.name}.<br/>Your clinical details have been received.<br/>Our reception will assist you momentarily.
            </p>
          </div>
          <button onClick={resetApp} className="mt-12 w-full bg-[#9e2a2b] hover:bg-[#7f1d1d] text-white font-black py-8 rounded-2xl text-2xl transition-all shadow-lg uppercase tracking-widest">{t.btn_new}</button>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-16 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div><h1 className="text-[40px] md:text-[50px] font-black text-[#2c1e1c] leading-tight">Massage Philosophy</h1><p className="text-2xl text-gray-500 font-bold">{t.subtitle}</p></div>
          <button onClick={toggleLanguage} className="text-[#666] underline hover:text-[#2c1e1c] font-bold text-[14px] bg-gray-100 px-3 py-1.5 rounded-lg whitespace-nowrap">{t.lang_btn}</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col"><label className="text-[22px] font-bold text-[#2c1e1c] mb-3">{t.lbl_name}</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="bg-white border-2 border-[#d1d1d1] p-4 rounded-xl text-xl focus:border-[#9e2a2b] outline-none" /></div>
            <div className="flex flex-col"><label className="text-[22px] font-bold text-[#2c1e1c] mb-3">{t.lbl_email}</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} className="bg-white border-2 border-[#d1d1d1] p-4 rounded-xl text-xl focus:border-[#9e2a2b] outline-none" /></div>
          </div>

          <div className="flex flex-col"><label className="text-[22px] font-bold text-[#2c1e1c] mb-2">{t.lbl_ins}</label><input type="text" name="insurance" value={formData.insurance} onChange={handleInputChange} className="bg-white border-2 border-[#d1d1d1] p-4 rounded-xl text-xl focus:border-[#9e2a2b] outline-none" /><p className="text-sm text-gray-400 mt-2 italic">{t.privacy}</p></div>

          <div className="flex flex-col">
            <label className="text-[22px] font-bold text-[#2c1e1c] mb-4">{t.lbl_area}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {t.opt_area.map(area => (
                <button key={area} type="button" onClick={() => handleMultiSelect('painArea', area)} className={`p-3 border-2 rounded-xl text-lg font-bold transition-all ${formData.painArea.includes(area) ? 'bg-[#9e2a2b] text-white border-[#9e2a2b]' : 'bg-white text-gray-600 border-[#d1d1d1]'}`}>{area}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col"><label className="text-[22px] font-bold text-[#2c1e1c] mb-3">{t.lbl_side}</label><select name="painSide" value={formData.painSide} onChange={handleInputChange} className="bg-white border-2 border-[#d1d1d1] p-4 rounded-xl text-xl cursor-pointer"><option value=""></option>{t.opt_side.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="flex flex-col"><label className="text-[22px] font-bold text-[#2c1e1c] mb-3">{t.lbl_duration}</label><select name="duration" value={formData.duration} onChange={handleInputChange} className="bg-white border-2 border-[#d1d1d1] p-4 rounded-xl text-xl cursor-pointer"><option value=""></option>{t.opt_dur.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
          </div>

          <div className="bg-white p-8 rounded-3xl border-2 border-gray-100">
            <label className="text-[22px] font-bold text-[#2c1e1c] mb-4 block">{t.lbl_level}</label>
            <input type="range" name="painLevel" min="0" max="10" step="1" value={formData.painLevel} onChange={handleInputChange} className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#9e2a2b]" />
            <p className="text-center font-black text-4xl text-[#9e2a2b] mt-4">{formData.painLevel}/10</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col"><label className="text-[22px] font-bold text-[#2c1e1c] mb-3">{t.lbl_job}</label><select name="activity" value={formData.activity} onChange={handleInputChange} className="bg-white border-2 border-[#d1d1d1] p-4 rounded-xl text-xl cursor-pointer"><option value=""></option>{t.opt_job.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="flex flex-col"><label className="text-[22px] font-bold text-[#2c1e1c] mb-3">{t.lbl_sit}</label>
              <div className="flex gap-2">
                {t.opt_sit.map(o => (<button key={o} type="button" onClick={() => setFormData(p => ({...p, sitting: o}))} className={`flex-1 p-4 border-2 rounded-xl text-lg font-bold transition-all ${formData.sitting === o ? 'bg-[#9e2a2b] text-white border-[#9e2a2b]' : 'bg-white text-gray-600 border-[#d1d1d1]'}`}>{o}</button>))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 mt-6 bg-[#f7f5f2] p-6 rounded-2xl border border-gray-100">
            <input type="checkbox" name="consent" checked={formData.consent} onChange={handleInputChange} className="mt-1 w-7 h-7 accent-[#9e2a2b] cursor-pointer" id="consent-check" />
            <label htmlFor="consent-check" className="text-[22px] font-bold text-[#2c1e1c] leading-tight select-none cursor-pointer">{t.lbl_consent}</label>
          </div>

          {warning && <div className="bg-red-50 border-l-8 border-red-500 p-6 text-red-800 font-bold text-xl rounded-r-xl shadow-sm animate-shake">{warning}</div>}

          <button type="submit" disabled={loading} style={{fontSize: '50px'}} className={`w-full bg-[#9e2a2b] hover:bg-[#7f1d1d] text-white font-black py-12 rounded-3xl transition-all shadow-2xl uppercase tracking-widest active:scale-95 ${loading ? 'opacity-50' : ''}`}>
            {loading ? t.loading : t.btn_submit}
          </button>
        </form>
      </div>
    );
  };

  const renderStaffMode = () => {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div><h2 className="text-[40px] font-black text-[#2c1e1c] leading-tight">{t.staff_title}</h2><button onClick={() => { if(confirm(t.lbl_clear_all + "?")) saveRecords([]); }} className="text-red-700 font-bold underline text-sm mt-2">{t.lbl_clear_all}</button></div>
          <button onClick={toggleLanguage} className="text-[#666] underline hover:text-[#2c1e1c] font-bold text-[14px] bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 whitespace-nowrap">{t.lang_btn}</button>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-24 bg-white border-2 border-dashed border-gray-300 rounded-3xl text-gray-400 text-2xl font-bold">{t.no_records}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {records.map(record => (
              <div key={record.id} className="bg-white border-2 border-[#d1d1d1] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="p-6 border-b-2 border-gray-100 bg-[#fbf9f6] flex justify-between items-start">
                  <div>
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px] block mb-1">{record.timestamp}</span>
                    <h3 className="text-2xl font-black text-[#2c1e1c] leading-tight">{record.name}</h3>
                    <p className="text-sm text-gray-500 font-medium truncate max-w-[200px]">{record.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border-2 ${record.aiResult ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>{record.aiResult ? t.status_done : t.status_pending}</span>
                    <div className="flex gap-2">
                      {record.aiResult && (
                        <button onClick={() => handlePrint(record)} className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-sm">
                          {t.btn_print}
                        </button>
                      )}
                      <button onClick={() => handleStaffGenReport(record)} disabled={loading} className="bg-[#9e2a2b] hover:bg-[#7f1d1d] text-white px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-sm disabled:opacity-50">
                        {loading ? t.loading : (record.aiResult ? "Regenerate" : t.btn_gen_report)}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-7 flex-1">
                   <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Pain Area</p><p className="font-bold text-base text-gray-800">{record.painArea.join(', ')}</p><p className="text-xs text-gray-500 mt-1 font-medium">{record.painSide} | {record.painLevel}/10</p></div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Duration & Goals</p><p className="font-bold text-sm text-gray-800 leading-tight">{record.duration}</p><p className="text-xs text-gray-500 mt-1 font-medium">{record.goals.join(', ')}</p></div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Lifestyle</p><p className="font-bold text-sm text-gray-800">{record.activity}</p><p className="text-xs text-gray-500 mt-1">Sit: {record.sitting}</p></div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">History / Type</p><p className="text-sm font-medium text-gray-700">{record.painDesc.join(', ') || 'N/A'}</p></div>
                   </div>

                   {record.aiResult ? (
                      <div className="mt-2 border-t border-gray-100 pt-5">
                        <div className="flex justify-between items-center mb-3"><h4 className="text-xs font-black text-[#9e2a2b] uppercase tracking-widest">Assessment & Strategy</h4></div>
                        <div className="bg-[#fdfbf7] p-5 border-l-4 border-[#9e2a2b] rounded-r-xl text-sm text-gray-700 h-80 overflow-y-auto scrollbar-thin whitespace-pre-wrap leading-relaxed shadow-inner">
                          {record.aiResult}
                        </div>
                      </div>
                   ) : record.notes && (
                      <div className="mt-4 p-4 bg-blue-50/50 rounded-xl text-xs italic text-blue-800 border-l-4 border-blue-200">Notes: "{record.notes}"</div>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 bg-[#fdfbf7]">
      <div className="sticky top-0 z-50 bg-[#fdfbf7]/90 backdrop-blur-md border-b-2 border-gray-100 mb-2 no-print">
        <div className="max-w-7xl mx-auto flex justify-center py-4">
          <div className="flex p-1 bg-gray-200/50 rounded-full shadow-inner">
            <button onClick={() => { setMode('client'); resetApp(); }} className={`px-8 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${mode === 'client' ? 'bg-white text-[#9e2a2b] shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>{t.nav_client}</button>
            <button onClick={() => setMode('staff')} className={`px-8 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${mode === 'staff' ? 'bg-white text-[#9e2a2b] shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>{t.nav_staff}</button>
          </div>
        </div>
      </div>
      {mode === 'client' ? renderClientMode() : renderStaffMode()}
      {loading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center no-print">
          <div className="bg-white p-12 rounded-3xl shadow-2xl flex flex-col items-center gap-8 border-t-8 border-[#9e2a2b]">
            <div className="w-20 h-20 border-[8px] border-[#9e2a2b] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-2xl font-black text-[#2c1e1c] tracking-widest uppercase">{t.loading}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
