'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Volume2, Loader2, X, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react'

// ── Configuração de línguas ───────────────────────────────────────
const LANG_LABELS: Record<string, string> = {
  pt: 'Português', kg: 'Kikongo', fr: 'Francês',
  en: 'Inglês',   es: 'Espanhol', ln: 'Lingala', sw: 'Swahili',
}

// Línguas com suporte nativo no Web Speech API (STT no browser)
const WEB_SPEECH_SUPPORTED = new Set(['pt', 'en', 'fr', 'es', 'sw'])

// BCP-47 para Web Speech API
const STT_LANG: Record<string, string> = {
  pt: 'pt-PT', en: 'en-US', fr: 'fr-FR', es: 'es-ES', sw: 'sw-TZ',
}

// BCP-47 para TTS
const TTS_LANG: Record<string, string> = {
  pt: 'pt-PT', en: 'en-US', fr: 'fr-FR',
  es: 'es-ES', sw: 'sw-TZ', kg: 'fr-FR', ln: 'fr-FR',
}

// ── TTS ───────────────────────────────────────────────────────────
function speak(text: string, lang: string): Promise<void> {
  return new Promise(resolve => {
    if (typeof window === 'undefined' || !window.speechSynthesis) { resolve(); return }
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang   = TTS_LANG[lang] || 'pt-PT'
    utt.rate   = 0.88
    utt.pitch  = 1
    const voices = window.speechSynthesis.getVoices()
    const prefix = utt.lang.split('-')[0]
    const match  = voices.find(v => v.lang === utt.lang) || voices.find(v => v.lang.startsWith(prefix))
    if (match) utt.voice = match
    utt.onend  = () => resolve()
    utt.onerror = () => resolve()
    window.speechSynthesis.speak(utt)
    setTimeout(resolve, Math.max(3000, text.split(/\s+/).length * 600))
  })
}

// ── STT via Web Speech API (línguas suportadas) ───────────────────
function transcribeWebSpeech(langCode: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { reject(new Error('Web Speech não disponível')); return }
    const rec = new SR()
    rec.lang            = STT_LANG[langCode] || 'pt-PT'
    rec.continuous      = false
    rec.interimResults  = false
    rec.maxAlternatives = 1
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(' ').trim()
      resolve(text)
    }
    rec.onerror = (e: any) => reject(new Error(e.error))
    rec.onend   = () => resolve('')
    rec.start()
  })
}

// ── STT via MediaRecorder + Groq Whisper (línguas africanas) ─────
function transcribeWhisper(
  langCode: string,
  onStateChange: (s: 'recording' | 'stopped') => void
): { stop: () => void; result: Promise<string> } {
  let resolveResult!: (v: string) => void
  let rejectResult!: (e: Error) => void
  const result = new Promise<string>((res, rej) => { resolveResult = res; rejectResult = rej })

  let mediaRecorder: MediaRecorder
  const chunks: Blob[] = []

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    // Prefere webm/opus; fallback para ogg/opus; fallback para default
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : ''

    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      onStateChange('stopped')
      try {
        const blob     = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' })
        const ext      = blob.type.includes('ogg') ? 'ogg' : 'webm'
        const file     = new File([blob], `audio.${ext}`, { type: blob.type })
        const fd       = new FormData()
        fd.append('audio', file)
        fd.append('lang', langCode)
        const res  = await fetch('/api/transcribe', { method: 'POST', body: fd })
        const data = await res.json()
        resolveResult(data.text || '')
      } catch (err: any) {
        rejectResult(new Error(err.message || 'Erro Whisper'))
      }
    }

    mediaRecorder.start(250) // chunks a cada 250ms
    onStateChange('recording')
  }).catch(err => rejectResult(new Error('Microfone não acessível: ' + err.message)))

  return {
    stop: () => { if (mediaRecorder?.state === 'recording') mediaRecorder.stop() },
    result,
  }
}

// ── Tradução ──────────────────────────────────────────────────────
async function callTranslate(text: string, from: string, to: string): Promise<string> {
  const res  = await fetch('/api/translate', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text, sourceLang: from, targetLang: to }),
  })
  const d = await res.json()
  return d.translated || text
}

// ── Tipos ─────────────────────────────────────────────────────────
type Step = 'idle'
  | 'patient_listening' | 'patient_processing'
  | 'attendant_reading'
  | 'attendant_listening' | 'attendant_processing'
  | 'speaking_to_patient'

interface Exchange {
  id: string
  patientOriginal: string
  patientInPt: string
  attendantInPt: string
  attendantInPatientLang: string
}

interface Props {
  patientLang: string
  patientName?: string
  onClose: () => void
}

// ── Componente ────────────────────────────────────────────────────
export default function VoiceInterpreter({ patientLang, patientName, onClose }: Props) {
  const [step,        setStep]        = useState<Step>('idle')
  const [exchanges,   setExchanges]   = useState<Exchange[]>([])
  const [patOrig,     setPatOrig]     = useState('')
  const [patPt,       setPatPt]       = useState('')
  const [attPt,       setAttPt]       = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  const whisperStopRef = useRef<(() => void) | null>(null)
  const bottomRef      = useRef<HTMLDivElement>(null)

  const isPortuguese     = patientLang === 'pt'
  const useWhisper       = !WEB_SPEECH_SUPPORTED.has(patientLang)
  const patLangLabel     = LANG_LABELS[patientLang] || patientLang

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [exchanges, step])

  // ── Ouvir paciente ───────────────────────────────────────────────
  const listenPatient = useCallback(async () => {
    setError(null)
    setPatOrig(''); setPatPt(''); setAttPt('')
    setStep('patient_listening')
    setIsRecording(true)

    try {
      let spoken = ''

      if (useWhisper) {
        // Grava e envia para Whisper
        const { stop, result } = transcribeWhisper(patientLang, state => {
          setIsRecording(state === 'recording')
        })
        whisperStopRef.current = stop
        spoken = await result
        whisperStopRef.current = null
      } else {
        spoken = await transcribeWebSpeech(patientLang)
        setIsRecording(false)
      }

      if (!spoken) { setStep('idle'); setIsRecording(false); return }
      setPatOrig(spoken)
      setStep('patient_processing')

      const inPt = isPortuguese ? spoken : await callTranslate(spoken, patientLang, 'pt')
      setPatPt(inPt)

      await speak(inPt, 'pt')
      setStep('attendant_reading')
    } catch (e: any) {
      setError(e.message || 'Erro ao capturar voz do paciente')
      setStep('idle'); setIsRecording(false)
    }
  }, [patientLang, useWhisper, isPortuguese])

  // Para a gravação Whisper manualmente
  const stopWhisperRecording = useCallback(() => {
    whisperStopRef.current?.()
    setIsRecording(false)
  }, [])

  // ── Ouvir atendente (sempre PT → Web Speech) ────────────────────
  const listenAttendant = useCallback(async () => {
    setError(null)
    setStep('attendant_listening')
    setIsRecording(true)

    try {
      const spoken = await transcribeWebSpeech('pt')
      setIsRecording(false)

      if (!spoken) { setStep('attendant_reading'); return }
      setAttPt(spoken)
      setStep('attendant_processing')

      const inPatLang = isPortuguese ? spoken : await callTranslate(spoken, 'pt', patientLang)

      const ex: Exchange = {
        id: crypto.randomUUID(),
        patientOriginal: patOrig, patientInPt: patPt,
        attendantInPt: spoken, attendantInPatientLang: inPatLang,
      }
      setExchanges(prev => [...prev, ex])

      setStep('speaking_to_patient')
      await speak(inPatLang, patientLang)
      setStep('idle')
    } catch (e: any) {
      setError(e.message || 'Erro ao capturar resposta')
      setIsRecording(false); setStep('attendant_reading')
    }
  }, [patientLang, isPortuguese, patOrig, patPt])

  const replayPt         = (ex: Exchange) => speak(ex.patientInPt, 'pt')
  const replayPatientLang = (ex: Exchange) => speak(ex.attendantInPatientLang, patientLang)

  // ── Labels de estado ─────────────────────────────────────────────
  const stepLabel: Record<Step, string> = {
    idle:                 '',
    patient_listening:    useWhisper ? `A gravar ${patLangLabel}… Prima ■ para terminar` : `A ouvir em ${patLangLabel}…`,
    patient_processing:   'A transcrever e traduzir…',
    attendant_reading:    'Leu a tradução? Prima para responder.',
    attendant_listening:  'A ouvir em Português…',
    attendant_processing: `A traduzir para ${patLangLabel}…`,
    speaking_to_patient:  `A reproduzir em ${patLangLabel}…`,
  }

  const busy = !['idle', 'attendant_reading'].includes(step)

  // Estilos reutilizáveis
  const btn = (color: 'violet' | 'blue', disabled = false) => ({
    display: 'flex' as const, alignItems: 'center' as const,
    justifyContent: 'center' as const, gap: 10,
    padding: '15px', borderRadius: 14, cursor: disabled ? 'not-allowed' as const : 'pointer' as const,
    fontSize: 14, fontWeight: 500, opacity: disabled ? 0.5 : 1, transition: 'all 0.2s',
    background: color === 'violet' ? 'rgba(124,58,237,0.18)' : 'rgba(37,99,235,0.18)',
    border: `2px solid ${color === 'violet' ? 'rgba(124,58,237,0.45)' : 'rgba(37,99,235,0.45)'}`,
    color: color === 'violet' ? '#c4b5fd' : '#93c5fd',
  })

  const recBtn = (color: 'violet' | 'blue') => ({
    ...btn(color),
    background: color === 'violet' ? 'rgba(124,58,237,0.3)' : 'rgba(37,99,235,0.3)',
    border: `2px solid ${color === 'violet' ? '#7c3aed' : '#1d4ed8'}`,
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.93)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans, sans-serif)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div>
          <p style={{ color: '#fff', fontWeight: 500, fontSize: 15, margin: 0 }}>🌐 Intérprete de Voz</p>
          <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0' }}>
            {patLangLabel} ↔ Português{patientName ? ` · ${patientName}` : ''}
            {useWhisper && <span style={{ marginLeft: 8, color: '#f59e0b', fontSize: 11 }}>● Whisper AI</span>}
          </p>
        </div>
        <button onClick={() => { window.speechSynthesis?.cancel(); onClose() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 6 }}>
          <X size={20} />
        </button>
      </div>

      {/* Aviso Whisper para línguas africanas */}
      {useWhisper && (
        <div style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.15)', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={13} color="#f59e0b" />
          <p style={{ color: '#fbbf24', fontSize: 12, margin: 0 }}>
            {patLangLabel} usa reconhecimento Whisper AI — prima o microfone, fale, depois prima ■ para terminar a gravação.
          </p>
        </div>
      )}

      {/* Historial */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {exchanges.length === 0 && step === 'idle' && (
          <div style={{ textAlign: 'center', color: '#475569', marginTop: 48, fontSize: 13 }}>
            Prima <strong style={{ color: '#a78bfa' }}>Ouvir paciente</strong> para começar
          </div>
        )}

        {exchanges.map(ex => (
          <div key={ex.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Paciente */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 12, padding: '10px 14px' }}>
                <p style={{ color: '#a78bfa', fontSize: 11, fontWeight: 500, margin: '0 0 3px' }}>{patientName || 'Paciente'} ({patLangLabel})</p>
                <p style={{ color: '#cbd5e1', fontSize: 13, margin: 0 }}>{ex.patientOriginal}</p>
                {!isPortuguese && <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '7px 0 3px' }}>
                    <ArrowRight size={10} color="#64748b" /><span style={{ color: '#64748b', fontSize: 11 }}>Em Português (para si)</span>
                  </div>
                  <p style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 500, margin: 0 }}>{ex.patientInPt}</p>
                </>}
              </div>
              <button onClick={() => replayPt(ex)} title="Ouvir em PT"
                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#a78bfa', flexShrink: 0 }}>
                <Volume2 size={14} />
              </button>
            </div>
            {/* Atendente */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingLeft: 24 }}>
              <button onClick={() => replayPatientLang(ex)} title={`Ouvir em ${patLangLabel}`}
                style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#93c5fd', flexShrink: 0 }}>
                <Volume2 size={14} />
              </button>
              <div style={{ flex: 1, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.22)', borderRadius: 12, padding: '10px 14px' }}>
                <p style={{ color: '#93c5fd', fontSize: 11, fontWeight: 500, margin: '0 0 3px' }}>Atendente (Português)</p>
                <p style={{ color: '#cbd5e1', fontSize: 13, margin: 0 }}>{ex.attendantInPt}</p>
                {!isPortuguese && <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '7px 0 3px' }}>
                    <ArrowRight size={10} color="#64748b" /><span style={{ color: '#64748b', fontSize: 11 }}>Em {patLangLabel} (para o paciente)</span>
                  </div>
                  <p style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 500, margin: 0 }}>{ex.attendantInPatientLang}</p>
                </>}
              </div>
            </div>
          </div>
        ))}

        {/* Estado em curso */}
        {step !== 'idle' && (
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {patOrig && step !== 'attendant_listening' && step !== 'attendant_processing' && (
              <div>
                <p style={{ color: '#a78bfa', fontSize: 11, margin: '0 0 2px' }}>{patientName || 'Paciente'}</p>
                <p style={{ color: '#e2e8f0', fontSize: 13, margin: 0 }}>{patOrig}</p>
              </div>
            )}
            {patPt && step === 'attendant_reading' && (
              <div>
                <p style={{ color: '#6ee7b7', fontSize: 11, margin: '0 0 2px' }}>🇦🇴 Tradução para si</p>
                <p style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 500, margin: 0 }}>{patPt}</p>
              </div>
            )}
            {attPt && (step === 'attendant_processing' || step === 'speaking_to_patient') && (
              <div>
                <p style={{ color: '#93c5fd', fontSize: 11, margin: '0 0 2px' }}>A sua resposta</p>
                <p style={{ color: '#e2e8f0', fontSize: 13, margin: 0 }}>{attPt}</p>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(step === 'patient_processing' || step === 'attendant_processing') &&
                <Loader2 size={13} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} />}
              {step === 'speaking_to_patient' && <Volume2 size={13} color="#a78bfa" />}
              {isRecording && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 0.8s ease-in-out infinite' }} />}
              <span style={{ color: '#64748b', fontSize: 12 }}>{stepLabel[step]}</span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', padding: '8px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <AlertCircle size={13} />{error}
            <button onClick={() => setError(null)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>fechar</button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Botões */}
      <div style={{ flexShrink: 0, padding: '14px 16px 26px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Passo 1: Ouvir paciente */}
        {step === 'idle' && (
          <button onClick={listenPatient} style={btn('violet')}>
            <Mic size={20} color="#a78bfa" />
            {useWhisper ? `● Gravar ${patientName || 'paciente'} (${patLangLabel})` : `Ouvir ${patientName || 'paciente'} (${patLangLabel})`}
          </button>
        )}

        {/* A gravar com Whisper — botão para parar */}
        {step === 'patient_listening' && useWhisper && (
          <button onClick={stopWhisperRecording} style={recBtn('violet')}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: '#ef4444', display: 'inline-block' }} />
            Parar gravação
          </button>
        )}

        {/* A ouvir com Web Speech — indicador passivo */}
        {step === 'patient_listening' && !useWhisper && (
          <div style={recBtn('violet')}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 0.8s ease-in-out infinite' }} />
            A ouvir {patientName || 'paciente'}…
          </div>
        )}

        {/* Passo 2: Atendente responde */}
        {step === 'attendant_reading' && (
          <button onClick={listenAttendant} style={btn('blue')}>
            <Mic size={20} color="#60a5fa" />
            Responder em Português
          </button>
        )}

        {step === 'attendant_listening' && (
          <div style={recBtn('blue')}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 0.8s ease-in-out infinite' }} />
            A ouvir em Português…
          </div>
        )}

        {/* Nova interação */}
        {step === 'idle' && exchanges.length > 0 && (
          <button onClick={listenPatient}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#64748b', fontSize: 12 }}>
            <RefreshCw size={13} />Nova interação
          </button>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
    </div>
  )
}