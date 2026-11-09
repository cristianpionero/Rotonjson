import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Check, AlertCircle, Globe, Copy, Download, RotateCcw, ShieldCheck } from 'lucide-react';
import { MorphingVerificationCard } from './components/MorphingVerificationCard';

interface CodeLine {
  id: number;
  content: React.ReactNode;
}

interface RobotsBoxProps {
  shouldStart: boolean;
}

const RobotsConstructedBox: React.FC<RobotsBoxProps> = ({ shouldStart }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 104 });
  const [stage, setStage] = useState<'idle' | 'drawing' | 'drawn' | 'typing' | 'completed'>('idle');
  const [drawProgress, setDrawProgress] = useState(0); // 0 a 1
  const [tracer, setTracer] = useState<{ x: number; y: number } | null>(null);
  const [typedText, setTypedText] = useState('');
  const animFrameRef = useRef<number | null>(null);
  const typewriterTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Medir ancho exacto del contenedor responsive
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setDimensions({ width: Math.round(rect.width), height: 104 });
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', updateSize);
      observer.disconnect();
    };
  }, []);

  const r = 16;
  const inset = 1.5;
  const w = dimensions.width || 540;
  const h = dimensions.height;

  // El trazo parte de la esquina superior izquierda (tras el arco) y recorre en sentido horario los 4 lados y 4 esquinas
  const pathD = `M ${r + inset} ${inset} ` +
    `H ${w - inset - r} ` +
    `A ${r} ${r} 0 0 1 ${w - inset} ${r + inset} ` +
    `V ${h - inset - r} ` +
    `A ${r} ${r} 0 0 1 ${w - inset - r} ${h - inset} ` +
    `H ${r + inset} ` +
    `A ${r} ${r} 0 0 1 ${inset} ${h - inset - r} ` +
    `V ${r + inset} ` +
    `A ${r} ${r} 0 0 1 ${r + inset} ${inset} ` +
    `Z`;

  const totalLength = (2 * (w - 2 * inset - 2 * r)) + (2 * (h - 2 * inset - 2 * r)) + (2 * Math.PI * r);

  const startAnimation = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);

    setStage('drawing');
    setDrawProgress(0);
    setTypedText('');
    setTracer(null);

    const startTime = performance.now();
    const duration = 1600; // 1.6 segundos para seguir visualmente la construcción completa del borde

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Curva suave cúbica
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setDrawProgress(ease);

      if (pathRef.current) {
        try {
          const pt = pathRef.current.getPointAtLength(totalLength * ease);
          setTracer({ x: pt.x, y: pt.y });
        } catch {}
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setDrawProgress(1);
        setTracer(null);
        setStage('drawn');

        // Pausa breve tras cerrar el recuadro para apreciar la forma y luego escribir
        setTimeout(() => {
          setStage('typing');
          const fullText = "User-agent: Robotaylon\nAllow: /\nCrawl-delay: 15";
          let charIndex = 0;
          typewriterTimerRef.current = setInterval(() => {
            charIndex++;
            setTypedText(fullText.slice(0, charIndex));
            if (charIndex >= fullText.length) {
              if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
              setStage('completed');
            }
          }, 32);
        }, 250);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    if (shouldStart && stage === 'idle') {
      const timer = setTimeout(() => {
        startAnimation();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [shouldStart, stage]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    };
  }, []);

  const renderRobotsContent = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, idx) => {
      let content: React.ReactNode = line;
      if (line.startsWith('User-agent:')) {
        const val = line.substring(11);
        content = (
          <>
            <span className="text-sky-600 font-medium">User-agent:</span>
            <span className="text-neutral-900 font-medium">{val}</span>
          </>
        );
      } else if (line.startsWith('Allow:')) {
        const val = line.substring(6);
        content = (
          <>
            <span className="text-sky-600 font-medium">Allow:</span>
            <span className="text-emerald-600 font-medium">{val}</span>
          </>
        );
      } else if (line.startsWith('Crawl-delay:')) {
        const val = line.substring(12);
        content = (
          <>
            <span className="text-sky-600 font-medium">Crawl-delay:</span>
            <span className="text-amber-600 font-medium">{val}</span>
          </>
        );
      }
      return (
        <React.Fragment key={idx}>
          {idx > 0 && '\n'}
          {content}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="w-full text-left">
      <div
        ref={containerRef}
        className={`relative w-full h-[104px] p-5 rounded-2xl flex flex-col justify-center transition-all duration-500 overflow-visible ${
          stage === 'idle'
            ? 'bg-transparent'
            : stage === 'drawing'
            ? 'bg-white/40'
            : 'bg-white shadow-xs'
        }`}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          width={w}
          height={h}
        >
          {stage !== 'idle' && (
            <path
              ref={pathRef}
              d={pathD}
              fill="none"
              stroke={stage === 'drawing' ? '#0284c7' : '#E5E7EB'}
              strokeWidth={stage === 'drawing' ? '2' : '1.5'}
              strokeDasharray={`${totalLength} ${totalLength}`}
              strokeDashoffset={totalLength * (1 - drawProgress)}
              strokeLinecap="round"
              className="transition-colors duration-300"
            />
          )}

          {stage === 'drawing' && tracer && (
            <g>
              <circle
                cx={tracer.x}
                cy={tracer.y}
                r="7"
                fill="#38bdf8"
                opacity="0.4"
              />
              <circle
                cx={tracer.x}
                cy={tracer.y}
                r="3.5"
                fill="#0284c7"
              />
              <circle
                cx={tracer.x}
                cy={tracer.y}
                r="1.5"
                fill="#ffffff"
              />
            </g>
          )}
        </svg>

        <pre className="relative z-10 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto no-scrollbar">
          <code>
            {renderRobotsContent(typedText)}
            {stage === 'typing' && (
              <span className="inline-block w-1.5 h-3.5 bg-neutral-900 ml-0.5 align-[-2px] animate-pulse" />
            )}
          </code>
        </pre>

        {stage === 'completed' && (
          <button
            type="button"
            onClick={startAnimation}
            title="Reconstruir recuadro"
            className="absolute top-2.5 right-2.5 p-1 rounded-full text-neutral-300 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [url, setUrl] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'verified' | 'error'>('idle');
  const [statusDetails, setStatusDetails] = useState<{ code?: number; message?: string }>({});
  
  // Favicon y dominio
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [faviconError, setFaviconError] = useState(false);
  const [showFavicon, setShowFavicon] = useState(false);
  const [detectedDomain, setDetectedDomain] = useState<string>('');

  // Animación del recuadro de código
  const [codePhase, setCodePhase] = useState<'initial' | 'clearing' | 'writing_favicon' | 'favicon_ready'>('initial');
  const [visibleLineCount, setVisibleLineCount] = useState<number>(7);

  // Animación de la descripción (borrado inverso y máquina de escribir humana)
  const [descPhase, setDescPhase] = useState<'original' | 'erasing' | 'typing' | 'completed'>('original');
  const [visibleOriginalLines, setVisibleOriginalLines] = useState<number>(5);
  const [typedText, setTypedText] = useState<string>('');

  // Fase y métricas de Confiabilidad & Ánimo de Robotaylon (Gráfica estilo Google)
  const [showScoreGauge, setShowScoreGauge] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [targetScore, setTargetScore] = useState(0);
  const [showVerifyButton, setShowVerifyButton] = useState(false);
  const [startRobotsBox, setStartRobotsBox] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ID de usuario preventivo en base de datos del navegador (localStorage)
  const [userId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('robotaylon_user_id');
      if (saved) return saved;
      const newId = 'usr_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('robotaylon_user_id', newId);
      return newId;
    } catch {
      return 'usr_guest';
    }
  });

  // Registro de dominios ya verificados guardados en el navegador
  const [verifiedDomains, setVerifiedDomains] = useState<Record<string, { verified: boolean; method: 'meta' | 'file'; timestamp: number }>>(() => {
    try {
      const saved = localStorage.getItem('robotaylon_verified_domains');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Token de verificación con persistencia en localStorage de 5 minutos
  const [authToken, setAuthToken] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('robotaylon_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Date.now() < parsed.expiresAt) {
          return parsed.token;
        }
      }
    } catch {}
    const newToken = 'rt_auth_' + Math.random().toString(36).substring(2, 10);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    try {
      localStorage.setItem('robotaylon_auth_session', JSON.stringify({ token: newToken, expiresAt }));
    } catch {}
    return newToken;
  });

  // Expiración de la sesión de 5 minutos
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('robotaylon_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Date.now() < parsed.expiresAt) {
          return parsed.expiresAt;
        }
      }
    } catch {}
    return Date.now() + 5 * 60 * 1000;
  });

  const [timeLeftSec, setTimeLeftSec] = useState<number>(() => {
    return Math.max(0, Math.floor((sessionExpiresAt - Date.now()) / 1000));
  });

  // Temporizador de cuenta regresiva de 5 minutos
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((sessionExpiresAt - Date.now()) / 1000));
      setTimeLeftSec(remaining);
      if (remaining <= 0) {
        const newToken = 'rt_auth_' + Math.random().toString(36).substring(2, 10);
        const newExpiry = Date.now() + 5 * 60 * 1000;
        try {
          localStorage.setItem('robotaylon_auth_session', JSON.stringify({ token: newToken, expiresAt: newExpiry }));
        } catch {}
        setAuthToken(newToken);
        setSessionExpiresAt(newExpiry);
        setTimeLeftSec(300);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionExpiresAt]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Manejar verificación exitosa
  const handleDomainVerified = (method: 'meta' | 'file') => {
    const domainKey = detectedDomain || (url ? extractDomainName(url) : 'tudominio.com');
    const updated = {
      ...verifiedDomains,
      [domainKey]: {
        verified: true,
        method,
        timestamp: Date.now()
      }
    };
    setVerifiedDomains(updated);
    try {
      localStorage.setItem('robotaylon_verified_domains', JSON.stringify(updated));
    } catch {}

    // 1.5s después de la bola verde en éxito, cerrar el modal para pasar fluidamente a la siguiente interfaz
    setTimeout(() => {
      setIsVerificationModalOpen(false);
    }, 1500);
  };



  const [serverMetrics, setServerMetrics] = useState<{
    latencyMs: number;
    hasSitemap: boolean;
    hasDesc: boolean;
    totalSeconds: string;
  }>({ latencyMs: 0, hasSitemap: false, hasDesc: false, totalSeconds: '0' });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typewriterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scoreCounterRef = useRef<NodeJS.Timeout | null>(null);

  // Copiar al portapapeles con feedback
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Descargar archivo robotaylon.txt generado con el token
  const downloadRobotaylonTxt = () => {
    const content = `# Autorización oficial para Robotaylon\nagent: Robotaylon\ndomain: ${detectedDomain || 'tudominio.com'}\ntoken: ${authToken}\nmode: gentle-human-audit-48h\nallowed: true\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robotaylon.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper para verificar si parece un dominio o URL real
  const isValidDomainFormat = (input: string) => {
    const clean = input.trim();
    if (!clean) return false;
    const domainRegex = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/i;
    return domainRegex.test(clean);
  };

  // Extraer dominio limpio para mostrar
  const extractDomainName = (raw: string) => {
    try {
      let withProtocol = raw.trim();
      if (!/^https?:\/\//i.test(withProtocol)) {
        withProtocol = 'https://' + withProtocol;
      }
      const parsed = new URL(withProtocol);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return raw.replace(/^https?:\/\//, '').split('/')[0] || 'dominio.com';
    }
  };

  const currentDomainKey = detectedDomain || (url ? extractDomainName(url) : 'tudominio.com');
  const isCurrentDomainVerified = !!(currentDomainKey && verifiedDomains[currentDomainKey]?.verified);

  // Estado del editor de código JSON vacío para la interfaz verificada
  const [jsonCommand, setJsonCommand] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reiniciar o cambiar verificación desde el menú
  const resetVerification = () => {
    const domainKey = currentDomainKey;
    const updated = { ...verifiedDomains };
    delete updated[domainKey];
    setVerifiedDomains(updated);
    try {
      localStorage.setItem('robotaylon_verified_domains', JSON.stringify(updated));
    } catch {}
    setMenuOpen(false);
  };

  // Manejar indentación con Tab en el editor
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const val = jsonCommand;
      const updated = val.substring(0, start) + '  ' + val.substring(end);
      setJsonCommand(updated);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };


  // Función de verificación real con mínimo 2 segundos de animación garantizados
  const verifyDomain = async (targetUrl: string) => {
    const clean = targetUrl.trim();
    if (!clean) return;

    const domainName = extractDomainName(clean);
    setDetectedDomain(domainName);
    setStatus('checking');
    setStatusDetails({});
    setShowFavicon(false);
    setFaviconError(false);
    setCodePhase('initial');
    setVisibleLineCount(7);

    // Resetear descripción y gráfica
    setDescPhase('original');
    setVisibleOriginalLines(5);
    setTypedText('');
    setShowScoreGauge(false);
    setAnimatedScore(0);
    setTargetScore(0);
    setStartRobotsBox(false);

    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    if (scoreCounterRef.current) clearInterval(scoreCounterRef.current);

    const startTime = Date.now();

    try {
      const response = await fetch('/api/check-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: clean })
      });

      const data = await response.json();
      const elapsed = Date.now() - startTime;
      const waitTime = Math.max(0, 2000 - elapsed); // Garantiza mínimo 2 segundos de borde azul

      setTimeout(() => {
        if (data.ok && data.status === 200) {
          setStatus('verified');
          setStatusDetails({ code: 200, message: '200 OK' });
          setFaviconUrl(data.favicon || `https://www.google.com/s2/favicons?domain=${domainName}&sz=128`);
          
          const totalSecs = ((Date.now() - startTime) / 1000).toFixed(1);
          setServerMetrics({
            latencyMs: data.latencyMs || 180,
            hasSitemap: !!data.hasSitemap,
            hasDesc: !!(data.description && data.description.length > 5),
            totalSeconds: `${totalSecs}s`
          });

          const finalScore = data.reliabilityScore || 90;
          setTargetScore(finalScore);

          // Iniciar animación del recuadro de código y cadena
          startCodeBoxAnimation(domainName, data.description, finalScore);
        } else {
          setStatus('error');
          setStatusDetails({
            code: data.status || 0,
            message: data.status ? `${data.status} Error` : 'No responde'
          });
        }
      }, waitTime);

    } catch (err) {
      const elapsed = Date.now() - startTime;
      const waitTime = Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        setStatus('error');
        setStatusDetails({ code: 0, message: 'Error de conexión' });
      }, waitTime);
    }
  };

  // Secuencia de animación del recuadro de código
  const startCodeBoxAnimation = (domain: string, extractedDesc: string | null, scoreToDisplay: number) => {
    setCodePhase('clearing');

    // Paso 1: Borrar línea por línea rápidamente (de 7 a 0)
    let currentLines = 7;
    const clearTimer = setInterval(() => {
      currentLines--;
      setVisibleLineCount(currentLines);
      if (currentLines <= 0) {
        clearInterval(clearTimer);
        
        // Paso 2: Pequeña pausa y luego escribir el comando de favicon
        setTimeout(() => {
          setCodePhase('writing_favicon');
          let writeLines = 0;
          const totalNewLines = 5;
          const writeTimer = setInterval(() => {
            writeLines++;
            setVisibleLineCount(writeLines);
            if (writeLines >= totalNewLines) {
              clearInterval(writeTimer);
              setCodePhase('favicon_ready');
              
              // Paso 3: Aparece el favicon al ladito del input
              setTimeout(() => {
                setShowFavicon(true);

                // Paso 4: 100ms después, verificar si hay descripción
                setTimeout(() => {
                  if (extractedDesc && extractedDesc.trim().length > 0) {
                    startDescriptionAnimation(extractedDesc.trim(), scoreToDisplay);
                  } else {
                    // Si no tiene descripción, mostramos directamente la gráfica
                    triggerScoreGauge(scoreToDisplay);
                  }
                }, 100);

              }, 250);
            }
          }, 140);
        }, 150);
      }
    }, 90);
  };

  // Secuencia de borrado de abajo hacia arriba y máquina de escribir humana para la descripción
  const startDescriptionAnimation = (siteDesc: string, scoreToDisplay: number) => {
    setDescPhase('erasing');

    let currentLine = 5;
    const eraseInterval = setInterval(() => {
      currentLine--;
      setVisibleOriginalLines(currentLine);

      if (currentLine <= 0) {
        clearInterval(eraseInterval);

        // Dejar el logo y empezar a escribir la descripción naturalmente
        setTimeout(() => {
          setDescPhase('typing');
          let charIndex = 0;
          setTypedText('');

          typewriterTimerRef.current = setInterval(() => {
            charIndex++;
            setTypedText(siteDesc.slice(0, charIndex));

            if (charIndex >= siteDesc.length) {
              if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
              setDescPhase('completed');

              // Al terminar de escribir, disparar la gráfica de confiabilidad y ánimo
              setTimeout(() => {
                triggerScoreGauge(scoreToDisplay);
              }, 400);
            }
          }, 22);
        }, 120);
      }
    }, 80);
  };

  // Disparar la gráfica circular de Google con conteo ascendente fluido
  const triggerScoreGauge = (score: number) => {
    setShowScoreGauge(true);
    setAnimatedScore(0);
    setShowVerifyButton(false);

    let current = 0;
    const stepTime = Math.max(12, Math.floor(1200 / (score || 1)));

    scoreCounterRef.current = setInterval(() => {
      current += 1;
      setAnimatedScore(current);
      if (current >= score) {
        setAnimatedScore(score);
        if (scoreCounterRef.current) clearInterval(scoreCounterRef.current);

        // 1 segundo después, baja suavemente hacia la sección inferior
        setTimeout(() => {
          setShowVerifyButton(true);
          setTimeout(() => {
            document.getElementById('verify-section')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }, 120);

          // Iniciar la construcción física de los bordes del recuadro
          setTimeout(() => {
            setStartRobotsBox(true);
          }, 600);
        }, 1000);
      }
    }, stepTime);
  };

  // Manejador de pegado (Paste): ejecuta inmediatamente
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (isValidDomainFormat(pastedText)) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setUrl(pastedText);
      verifyDomain(pastedText);
    }
  };

  // Manejador de escritura manual: debounce de 2 segundos sin teclear
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setUrl(newText);
    setStatus('idle');
    setStatusDetails({});
    setShowFavicon(false);
    setCodePhase('initial');
    setVisibleLineCount(7);
    setDescPhase('original');
    setVisibleOriginalLines(5);
    setTypedText('');
    setShowScoreGauge(false);
    setAnimatedScore(0);
    setStartRobotsBox(false);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    if (scoreCounterRef.current) clearInterval(scoreCounterRef.current);

    if (isValidDomainFormat(newText)) {
      debounceTimerRef.current = setTimeout(() => {
        verifyDomain(newText);
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
      if (scoreCounterRef.current) clearInterval(scoreCounterRef.current);
    };
  }, []);

  // Definición de las líneas iniciales
  const initialCodeLines: CodeLine[] = [
    {
      id: 1,
      content: <span className="text-neutral-500">{'{'}</span>
    },
    {
      id: 2,
      content: (
        <>
          {'  '}<span className="text-sky-600 font-medium">"accion"</span>
          <span className="text-neutral-400">: </span>
          <span className="text-emerald-600">"inspeccionar_input"</span>
          <span className="text-neutral-400">,</span>
        </>
      )
    },
    {
      id: 3,
      content: (
        <>
          {'  '}<span className="text-sky-600 font-medium">"campo"</span>
          <span className="text-neutral-400">: </span>
          <span className="text-emerald-600">"input_mensaje"</span>
          <span className="text-neutral-400">,</span>
        </>
      )
    },
    {
      id: 4,
      content: (
        <>
          {'  '}<span className="text-sky-600 font-medium">"escribir"</span>
          <span className="text-neutral-400">: </span>
          <span className="text-emerald-600">"palabra_restringida"</span>
          <span className="text-neutral-400">,</span>
        </>
      )
    },
    {
      id: 5,
      content: (
        <>
          {'  '}<span className="text-sky-600 font-medium">"prueba"</span>
          <span className="text-neutral-400">: </span>
          <span className="text-emerald-600">"verificar_filtro_vulnerabilidad"</span>
          <span className="text-neutral-400">,</span>
        </>
      )
    },
    {
      id: 6,
      content: (
        <>
          {'  '}<span className="text-sky-600 font-medium">"esperado"</span>
          <span className="text-neutral-400">: </span>
          <span className="text-emerald-600">"rechazar_y_no_caer_en_error_500"</span>
        </>
      )
    },
    {
      id: 7,
      content: <span className="text-neutral-500">{'}'}</span>
    }
  ];

  // Definición de las líneas del comando de extracción de favicon
  const faviconCodeLines: CodeLine[] = [
    {
      id: 101,
      content: <span className="text-neutral-500">{'{'}</span>
    },
    {
      id: 102,
      content: (
        <>
          {'  '}<span className="text-sky-600 font-medium">"comando"</span>
          <span className="text-neutral-400">: </span>
          <span className="text-emerald-600">"extraer_favicon"</span>
          <span className="text-neutral-400">,</span>
        </>
      )
    },
    {
      id: 103,
      content: (
        <>
          {'  '}<span className="text-sky-600 font-medium">"dominio"</span>
          <span className="text-neutral-400">: </span>
          <span className="text-emerald-600">"{detectedDomain || 'servidor.com'}"</span>
          <span className="text-neutral-400">,</span>
        </>
      )
    },
    {
      id: 104,
      content: (
        <>
          {'  '}<span className="text-sky-600 font-medium">"recurso"</span>
          <span className="text-neutral-400">: </span>
          <span className="text-emerald-600">"/favicon.ico"</span>
          <span className="text-neutral-400">,</span>
        </>
      )
    },
    {
      id: 105,
      content: (
        <>
          {'  '}<span className="text-sky-600 font-medium">"estado"</span>
          <span className="text-neutral-400">: </span>
          <span className="text-emerald-600">"200_OK_recuperado"</span>
          {'\n'}<span className="text-neutral-500">{'}'}</span>
        </>
      )
    }
  ];

  // Componente del logo vectorial pequeño
  const InlineLogo = (
    <svg
      className="w-3.5 h-3.5 shrink-0 inline-block"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 4C9.37 4 4 9.37 4 16C4 20.2 6.16 23.9 9.47 26.04"
        stroke="#06B6D4"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M22.53 5.96C25.84 8.1 28 11.8 28 16C28 22.63 22.63 28 16 28"
        stroke="#8B5CF6"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="3.5" fill="#10B981" />
      <circle cx="21" cy="11" r="2.2" fill="#EC4899" />
    </svg>
  );

  // Colores dinámicos idénticos a Google PageSpeed
  const getScoreTheme = (score: number) => {
    if (score >= 80) {
      return {
        stroke: '#0CCE6B', // Verde Google
        bgFill: '#E6F8EF',
        text: '#008738',
        moodTitle: 'Ánimo de Robotaylon: Óptimo',
        moodDesc: 'Totalmente dispuesto y motivado para auditar este servidor. La infraestructura es sólida, rápida y confiable.',
        tag: 'Excelente'
      };
    } else if (score >= 50) {
      return {
        stroke: '#FFA400', // Ámbar Google
        bgFill: '#FFF8E6',
        text: '#B06F00',
        moodTitle: 'Ánimo de Robotaylon: Moderado',
        moodDesc: 'Dispuesto a auditar con ritmo cauteloso. El servidor presenta respuestas intermitentes o falta de metadatos.',
        tag: 'Aceptable'
      };
    } else {
      return {
        stroke: '#FF4E42', // Rojo Google
        bgFill: '#FFEBEA',
        text: '#C5221F',
        moodTitle: 'Ánimo de Robotaylon: Precavido',
        moodDesc: 'Ánimo bajo. Servidor lento o inestable; se sugiere resolver la conectividad antes de iniciar las 48 horas.',
        tag: 'Riesgo'
      };
    }
  };

  const scoreTheme = getScoreTheme(targetScore || animatedScore);

  // Parámetros de la gráfica circular SVG idéntica a Google
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans selection:bg-neutral-900 selection:text-white">
      {/* Fila superior pegada a las esquinas */}
      <header className="w-full px-4 pt-3 pb-2 flex items-center justify-between">
        
        {/* Esquina superior izquierda: Logo vectorial colorido + Nombre */}
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 shrink-0"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 4C9.37 4 4 9.37 4 16C4 20.2 6.16 23.9 9.47 26.04"
              stroke="#06B6D4"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M22.53 5.96C25.84 8.1 28 11.8 28 16C28 22.63 22.63 28 16 28"
              stroke="#8B5CF6"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <circle cx="16" cy="16" r="3.5" fill="#10B981" />
            <circle cx="21" cy="11" r="2.2" fill="#EC4899" />
          </svg>

          <span className="text-base font-bold tracking-tight text-neutral-900 leading-none">
            Robotaylon
          </span>
        </div>

        {/* Esquina superior derecha: Ícono de 3 rayitas más pequeño y pegado a la esquina */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
          className="p-1 text-neutral-800 hover:text-black transition-colors cursor-pointer"
        >
          {menuOpen ? <X className="w-4.5 h-4.5 stroke-[2]" /> : <Menu className="w-4.5 h-4.5 stroke-[2]" />}
        </button>
      </header>

      {/* Menú simple de 3 rayitas si se abre */}
      {menuOpen && (
        <div className="mx-4 mt-2 p-4 border border-neutral-200 rounded-2xl bg-white shadow-xs space-y-3 animate-fadeIn">
          <p className="text-xs text-neutral-700">
            <strong>Robotaylon:</strong> Agente de pruebas y comprobación de funciones.
          </p>
          <p className="text-xs text-neutral-500 font-mono">
            User-Agent: Robotaylon/1.0
          </p>
          {isCurrentDomainVerified && (
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-emerald-600 font-medium">✓ Dominio verificado ({currentDomainKey})</span>
              <button
                type="button"
                onClick={resetVerification}
                className="text-xs text-neutral-500 hover:text-neutral-900 underline cursor-pointer"
              >
                Cambiar dominio
              </button>
            </div>
          )}
        </div>
      )}

      {/* CASO A: Si el dominio YA ESTÁ VERIFICADO -> Siguiente interfaz con texto verde y editor de código JSON */}
      {isCurrentDomainVerified ? (
        <div className="w-full animate-fadeIn">
          {/* Texto verde indicando la verificación exitosa (solo texto limpio, sin recuadro) */}
          <div className="w-full px-4 pt-4 pb-1">
            <p className="text-xs sm:text-sm font-medium text-emerald-600 flex items-center gap-1.5">
              <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Ya verificamos que eres el propietario legítimo del código y del dominio ({currentDomainKey}).</span>
            </p>
          </div>

          {/* Sección del recuadro limpio de código vacío para comandos JSON */}
          <main className="w-full px-4 pt-4 pb-12">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Comando JSON
              </h2>
              <span className="text-[11px] font-mono text-neutral-400">
                {currentDomainKey}
              </span>
            </div>

            {/* Recuadro limpio con bordes redondos, del mismo tamaño y estilo que el de la interfaz de inicio */}
            <div className="w-full min-h-[148px] p-5 sm:p-6 border border-neutral-200 rounded-2xl bg-white flex flex-col justify-between">
              <textarea
                ref={textareaRef}
                value={jsonCommand}
                onChange={(e) => setJsonCommand(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                placeholder="// Escribe aquí tu comando en formato JSON..."
                spellCheck={false}
                rows={5}
                className="w-full min-h-[110px] font-mono text-xs sm:text-sm leading-relaxed text-neutral-900 placeholder:text-neutral-300 bg-transparent focus:outline-none resize-none no-scrollbar selection:bg-neutral-200"
              />
            </div>

            {/* Botón de ejecutar comando (por ahora solo estético) */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-medium tracking-tight shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Ejecutar comando</span>
              </button>
            </div>
          </main>
        </div>
      ) : (
        /* CASO B: Flujo inicial de comprobación de dominio */
        <div className="w-full">
          {/* Contenedor del Input: se acorta suavemente a la derecha cuando aparece el favicon */}
          <div className="w-full px-4 pt-2">
            <div className="w-full flex items-center gap-2.5">
              
              {/* El input con bordes animados y transición suave de ancho */}
              <div
                className={`relative flex-1 rounded-full transition-all duration-500 ease-out ${
                  status === 'checking'
                    ? 'p-[2px] overflow-hidden'
                    : status === 'verified'
                    ? 'border-2 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : status === 'error'
                    ? 'border-2 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                    : 'border border-neutral-300 focus-within:border-neutral-900'
                }`}
              >
                {/* Haz azul rotativo que camina rápidamente por los bordes durante mínimo 2 segundos */}
                {status === 'checking' && (
                  <div className="absolute -inset-[150%] w-[400%] h-[400%] m-auto animate-border-beam pointer-events-none bg-[conic-gradient(from_0deg,transparent_0_240deg,#0284c7_270deg,#38bdf8_310deg,#60a5fa_340deg,#93c5fd_360deg)]" />
                )}

                {/* Caja interior limpia del input */}
                <div className="relative bg-white rounded-full flex items-center w-full z-10 h-11.5">
                  <input
                    type="text"
                    value={url}
                    onChange={handleChange}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                        verifyDomain(url);
                      }
                    }}
                    placeholder="https://tudominio.com"
                    className="w-full px-5 py-3 text-sm text-neutral-900 bg-transparent rounded-full focus:outline-none placeholder:text-neutral-400"
                  />

                  {/* Indicador de estado en la parte derecha del input */}
                  <div className="pr-4 shrink-0 flex items-center gap-1.5 text-xs font-mono select-none">
                    {status === 'checking' && (
                      <span className="text-sky-600 font-sans font-medium text-[11px] animate-pulse">
                        Verificando...
                      </span>
                    )}
                    {status === 'verified' && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>200 OK</span>
                      </span>
                    )}
                    {status === 'error' && (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{statusDetails.message || 'Error'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Logo/Favicon del dominio inspeccionado que aparece al ladito derecho del input con la misma altura */}
              {showFavicon && (
                <div
                  title={detectedDomain ? `Favicon de ${detectedDomain}` : 'Favicon'}
                  className="h-11.5 w-11.5 shrink-0 rounded-full border border-neutral-200 bg-white shadow-xs flex items-center justify-center p-2 overflow-hidden animate-fadeIn transition-all duration-300"
                >
                  {faviconUrl && !faviconError ? (
                    <img
                      src={faviconUrl}
                      alt={`Logo de ${detectedDomain}`}
                      onError={() => setFaviconError(true)}
                      className="w-6 h-6 object-contain rounded-sm"
                    />
                  ) : (
                    <Globe className="w-5 h-5 text-neutral-600" />
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Sección del Recuadro Limpio de Código Animado Inicial */}
          <main className="w-full px-4 pt-7 pb-12">

        {/* Título del recuadro */}
        <div className="mb-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {codePhase === 'writing_favicon' || codePhase === 'favicon_ready'
              ? 'Ejecución de Comando: Favicon'
              : 'Ejemplo JSON'}
          </h2>
        </div>

        {/* Recuadro limpio con bordes redondos, sin fondos dentro de otro fondo ni barras de scroll */}
        <div className="w-full min-h-[148px] p-5 sm:p-6 border border-neutral-200 rounded-2xl flex flex-col justify-center">
          <pre className="font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto no-scrollbar touch-pan-x selection:bg-neutral-200">
            <code>
              {/* Fase inicial o borrado línea por línea */}
              {(codePhase === 'initial' || codePhase === 'clearing') && (
                initialCodeLines.slice(0, visibleLineCount).map((line, idx) => (
                  <React.Fragment key={line.id}>
                    {idx > 0 && '\n'}
                    {line.content}
                  </React.Fragment>
                ))
              )}

              {/* Fase de escritura del comando de favicon línea por línea */}
              {(codePhase === 'writing_favicon' || codePhase === 'favicon_ready') && (
                faviconCodeLines.slice(0, visibleLineCount).map((line, idx) => (
                  <React.Fragment key={line.id}>
                    {idx > 0 && '\n'}
                    {line.content}
                  </React.Fragment>
                ))
              )}
            </code>
          </pre>
        </div>

        {/* Descripción métrica original o descripción extraída del sitio web */}
        <div className="mt-6 text-xs sm:text-sm text-neutral-900 leading-relaxed font-normal space-y-2 max-w-full">
          
          {/* Caso 1: Texto original o fase de borrado inverso línea por línea */}
          {(descPhase === 'original' || descPhase === 'erasing') && (
            <>
              {visibleOriginalLines >= 1 && (
                <p className="transition-opacity duration-100">
                  <span className="inline-flex items-center align-[-2px] mr-1.5">
                    {InlineLogo}
                  </span>
                  <span className="font-medium">Robotaylon</span> es un agente autónomo de ciberseguridad y QA para desarrolladores independientes.
                </p>
              )}
              {visibleOriginalLines >= 2 && (
                <p className="transition-opacity duration-100">
                  Evalúa funciones específicas y detecta vulnerabilidades a ritmo humano sin saturar tu servidor.
                </p>
              )}
              {visibleOriginalLines >= 3 && (
                <p className="transition-opacity duration-100">
                  Procesa tu JSON de prueba simulando un usuario real para comprobar la seguridad de tu código.
                </p>
              )}
              {visibleOriginalLines >= 4 && (
                <p className="transition-opacity duration-100">
                  Exige autorización legal previa mediante el archivo plano robotaylon.txt en la raíz del dominio.
                </p>
              )}
              {visibleOriginalLines >= 5 && (
                <p className="transition-opacity duration-100">
                  Opera de forma transparente con la firma de cabecera oficial Robotaylon/1.0 sin bloqueos de red.
                </p>
              )}
            </>
          )}

          {/* Caso 2: Máquina de escribir humana con la descripción real extraída */}
          {(descPhase === 'typing' || descPhase === 'completed') && (
            <p className="animate-fadeIn">
              <span className="inline-flex items-center align-[-2px] mr-1.5">
                {InlineLogo}
              </span>
              <span>{typedText}</span>
              {descPhase === 'typing' && (
                <span className="inline-block w-1.5 h-3.5 bg-neutral-900 ml-0.5 align-[-2px] animate-pulse" />
              )}
            </p>
          )}

        </div>

        {/* Gráfica Circular de Confiabilidad y Ánimo de Robotaylon (Estilo Google Lighthouse) */}
        {showScoreGauge && (
          <section className="mt-10 pt-8 border-t border-neutral-100 flex flex-col items-center text-center animate-fadeIn">
            
            {/* Gráfica circular SVG con la misma estética de Google */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                {/* Círculo de fondo suave */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill={scoreTheme.bgFill}
                  className="transition-colors duration-500"
                />
                
                {/* Trazo de fondo gris muy tenue */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="none"
                />
                
                {/* Aro de progreso de color brillante (Verde Google #0CCE6B) */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke={scoreTheme.stroke}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-out"
                />
              </svg>

              {/* Número central en grande con color del tema */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  style={{ color: scoreTheme.text }}
                  className="text-4xl sm:text-[42px] font-bold tracking-tight font-sans transition-colors duration-300"
                >
                  {animatedScore}
                </span>
              </div>
            </div>

            {/* Texto en negro puro idéntico al estilo de la imagen de Google */}
            <div className="mt-4 space-y-1.5 max-w-md">
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-950 tracking-tight">
                Ánimo de Robotaylon
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 font-normal leading-relaxed">
                {scoreTheme.moodDesc}
              </p>
            </div>

          </section>
        )}

        {/* Sección de Verificación de Propiedad ubicada con amplio espaciado limpio */}
        {showVerifyButton && (
          <section
            id="verify-section"
            className="mt-20 sm:mt-24 pt-10 pb-24 border-t border-neutral-100 flex flex-col items-center text-center max-w-xl mx-auto animate-fadeIn"
          >
            {/* Recuadro animado: Construye físicamente los bordes en tiempo real y luego escribe las reglas */}
            <div className="w-full mb-10 text-left">
              <RobotsConstructedBox shouldStart={startRobotsBox} />
            </div>

            {/* Texto de explicación de propiedad */}
            <div className="space-y-3 mb-7 text-center">
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-950 tracking-tight">
                Verificación de Propiedad
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 font-normal leading-relaxed">
                Antes de que Robotaylon comience a interactuar con tu servidor, necesitamos confirmar que eres el propietario legítimo del código y del dominio.
              </p>
              <p className="text-xs sm:text-sm text-neutral-600 font-normal leading-relaxed">
                Puedes autorizarlo mediante dos métodos sencillos: agregando una etiqueta <code className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-900">&lt;meta&gt;</code> en el encabezado HTML o colocando el archivo plano <code className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-900">robotaylon.txt</code> en la raíz de tu servidor.
              </p>
            </div>

            {/* Botón verde muy limpio, pequeño y con bordes redondos */}
            <button
              type="button"
              onClick={() => setIsVerificationModalOpen(true)}
              className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-medium tracking-tight shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              {isCurrentDomainVerified ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-100" />
                  <span>Dominio verificado</span>
                </>
              ) : (
                <span>Verificar código</span>
              )}
            </button>
          </section>
        )}

        </main>
      </div>
    )}

      {/* Interfaz limpia de Verificación de Propiedad: Un solo fondo blanco puro, sin recuadros anidados */}
      {isVerificationModalOpen && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto px-4 py-6 sm:px-8 selection:bg-neutral-900 selection:text-white animate-fadeIn">
          <div className="max-w-2xl mx-auto pb-16">
            
            {/* Fila superior: Logo + Nombre a la izquierda, botón cerrar redondeado a la derecha */}
            <div className="flex items-center justify-between pb-6 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <svg
                  className="w-6 h-6 shrink-0"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 4C9.37 4 4 9.37 4 16C4 20.2 6.16 23.9 9.47 26.04"
                    stroke="#06B6D4"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M22.53 5.96C25.84 8.1 28 11.8 28 16C28 22.63 22.63 28 16 28"
                    stroke="#8B5CF6"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <circle cx="16" cy="16" r="3.5" fill="#10B981" />
                  <circle cx="21" cy="11" r="2.2" fill="#EC4899" />
                </svg>
                <span className="text-base font-bold tracking-tight text-neutral-900 leading-none">
                  Robotaylon
                </span>
              </div>

              {/* Botón de cierre redondeado muy limpio */}
              <button
                type="button"
                onClick={() => setIsVerificationModalOpen(false)}
                aria-label="Cerrar verificación"
                className="p-1.5 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            {/* Título limpio sin texto exterior ni botón de tiempo */}
            <div className="mt-8 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-950 tracking-tight">
                Verificación de propiedad del código
              </h2>
            </div>



            {/* Los dos recuadros limpios con animación fluida de bola de carga (un solo fondo blanco) */}
            <div className="mt-8 space-y-8">

              {/* Opción 1: Etiqueta HTML con metamorfosis a bola de carga */}
              <MorphingVerificationCard
                method="meta"
                title="Opción 1: Etiqueta HTML (Meta Tag)"
                description={
                  <>
                    Pega la siguiente etiqueta dentro del bloque{' '}
                    <code className="font-mono text-neutral-800 bg-neutral-100 px-1 py-0.5 rounded text-[11px]">&lt;head&gt;</code>{' '}
                    de tu archivo HTML principal o en el template de tu web:
                  </>
                }
                codeSnippet={`<meta name="robotaylon-verification" content="${authToken}" />`}
                domain={currentDomainKey}
                authToken={authToken}
                isVerified={isCurrentDomainVerified}
                onVerified={handleDomainVerified}
                copyKey="meta"
                copiedKey={copiedKey}
                onCopy={copyToClipboard}
              />

              {/* Opción 2: Archivo plano robotaylon.txt con metamorfosis a bola de carga */}
              <MorphingVerificationCard
                method="file"
                title="Opción 2: Archivo plano (robotaylon.txt)"
                description={
                  <>
                    Crea o descarga el archivo{' '}
                    <code className="font-mono text-neutral-800 bg-neutral-100 px-1 py-0.5 rounded text-[11px]">robotaylon.txt</code>{' '}
                    y colócalo en la raíz pública de tu servidor (o en <code className="font-mono text-neutral-800 bg-neutral-100 px-1 py-0.5 rounded text-[11px]">/.well-known/robotaylon.txt</code>):
                  </>
                }
                codeSnippet={`agent: Robotaylon\ntoken: ${authToken}\nallowed: true`}
                domain={currentDomainKey}
                authToken={authToken}
                isVerified={isCurrentDomainVerified}
                onVerified={handleDomainVerified}
                onDownload={downloadRobotaylonTxt}
                copyKey="file"
                copiedKey={copiedKey}
                onCopy={copyToClipboard}
              />

            </div>

          </div>
        </div>
      )}


    </div>
  );
}
