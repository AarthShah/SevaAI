import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export const LanguagePicker = () => {
  const { language, setLanguage, languages } = useLanguage();

  return (
    <div className="flex h-7 items-start justify-end px-3 pt-1 sm:px-5" aria-label="Language selection">
      <select
        aria-label="Language"
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        className="h-5 max-w-[82px] rounded border border-slate-200 bg-white/95 px-1 text-[10px] leading-none text-slate-500 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        {languages.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>
    </div>
  );
};
