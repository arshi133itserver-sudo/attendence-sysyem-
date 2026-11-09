import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
  Check,
  Heart,
  Music,
  Radio
} from 'lucide-react';
import {
  getAvailableVoices,
  getVoiceSettings,
  saveVoiceSettings,
  speakStaffGreeting,
  generateGreetingText
} from '../services/greetingService';

export default function VoiceSettingsModal({ isOpen, onClose }) {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [style, setStyle] = useState('sweet_hinglish');
  const [rate, setRate] = useState(0.90);
  const [pitch, setPitch] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [testSampleType, setTestSampleType] = useState('IN'); // 'IN' or 'OUT'

  useEffect(() => {
    if (isOpen) {
      const updateVoiceList = () => {
        const available = getAvailableVoices();
        setVoices(available);
      };

      updateVoiceList();

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = updateVoiceList;
      }

      const current = getVoiceSettings();
      setSelectedVoice(current.voiceName);
      setStyle(current.style);
      setRate(current.rate);
      setPitch(current.pitch);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveVoiceSettings({
      voiceName: selectedVoice,
      style,
      rate,
      pitch
    });
    if (onClose) onClose();
  };

  const handleTestVoice = (sampleType = testSampleType) => {
    setIsPlaying(true);

    // Save temporary settings for test preview
    saveVoiceSettings({
      voiceName: selectedVoice,
      style,
      rate,
      pitch
    });

    speakStaffGreeting('Parbhat', sampleType, {
      style,
      rate,
      pitch,
      totalHours: '8h 15m'
    });

    setTimeout(() => {
      setIsPlaying(false);
    }, 4500);
  };

  const handleResetDefaults = () => {
    setRate(0.90);
    setPitch(1.0);
    setStyle('sweet_hinglish');
    setSelectedVoice('');
    saveVoiceSettings({
      voiceName: '',
      style: 'sweet_hinglish',
      rate: 0.90,
      pitch: 1.0
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center border border-pink-500/20">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                Human & Sweet Voice Settings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Meethi aur natural aawaz (sweet human greeting) customize karein
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 py-4 text-xs">
          {/* Greeting Style / Language */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Greeting Tone & Language Style:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStyle('sweet_hinglish')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  style === 'sweet_hinglish'
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <span>🌸</span> Polite Hinglish
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  "Welcome Parbhat ji! Wishing you a very Good morning..."
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStyle('sweet_english')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  style === 'sweet_english'
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <span>💼</span> Sweet English
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  "Welcome, Parbhat! Wishing you a wonderful morning..."
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStyle('pure_hindi')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  style === 'pure_hindi'
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <span>🇮🇳</span> Pure Hindi
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  "नमस्ते प्रभात जी! शुभ प्रभात, आर्शी एंटरप्राइजेज में आपका स्वागत है..."
                </div>
              </button>
            </div>
          </div>

          {/* Voice Model Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Voice Model (Aawaz Chunein):
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                {voices.length} voices found
              </span>
            </div>

            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-pink-500 outline-none text-xs"
            >
              <option value="">
                ⭐ Auto Recommended: Sweetest Natural Female Voice
              </option>
              {voices.map((v) => {
                const isNatural = v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online');
                const isFemale = v.name.includes('Zira') || v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Neerja') || v.name.includes('Swara') || v.name.includes('Female');
                const isDavid = v.name.includes('David') || v.name.includes('Mark') || v.name.includes('Desktop');

                let badge = '';
                if (isNatural) badge = '🌟 [Natural Neural] ';
                else if (isFemale) badge = '🌸 [Sweet Female] ';
                else if (isDavid) badge = '🤖 [Robotic Male] ';

                return (
                  <option key={v.name} value={v.name}>
                    {badge}{v.name} ({v.lang})
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Tip: Microsoft Zira, Jenny, Neerja, Swara, ya Google Female voice sabse meethi aur human lagti hain.
            </p>
          </div>

          {/* Speed & Pitch Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Bolne Ki Raftaar (Speed):
                </span>
                <span className="font-mono text-pink-600 dark:text-pink-400 font-bold">
                  {rate.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.20"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Dheema (Calm)</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Aawaz Ki Meethas (Pitch):
                </span>
                <span className="font-mono text-pink-600 dark:text-pink-400 font-bold">
                  {pitch.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.85"
                max="1.20"
                step="0.05"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Deep</span>
                <span>Natural (1.0)</span>
                <span>Softer</span>
              </div>
            </div>
          </div>

          {/* Test Voice Section */}
          <div className="border border-pink-200 dark:border-pink-900/60 bg-pink-50/50 dark:bg-pink-950/20 p-4 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-pink-900 dark:text-pink-200 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-pink-600" />
                Live Voice Test (Sun kar dekhein):
              </span>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setTestSampleType('IN')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                    testSampleType === 'IN'
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-500'
                  }`}
                >
                  Entry (IN)
                </button>
                <button
                  type="button"
                  onClick={() => setTestSampleType('OUT')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                    testSampleType === 'OUT'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500'
                  }`}
                >
                  Checkout (OUT)
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-pink-100 dark:border-pink-950">
              "{generateGreetingText('Parbhat', testSampleType, { style, time: '10:30 AM', totalHours: '8h 15m' })}"
            </p>

            <button
              type="button"
              onClick={() => handleTestVoice(testSampleType)}
              disabled={isPlaying}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold shadow-md shadow-pink-500/25 transition-all text-xs"
            >
              <Play className={`w-4 h-4 ${isPlaying ? 'animate-spin' : 'fill-current'}`} />
              <span>{isPlaying ? 'Bol raha hai (Speaking...)' : '▶️ Abhi Aawaz Suniye (Listen Now)'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply (Aawaz Set Karein)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
