import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, Download, X, AlertCircle, RefreshCw } from 'lucide-react';

export type VerificationPhase =
  | 'idle'
  | 'fading_out'
  | 'morphing_to_ball'
  | 'verifying'
  | 'success'
  | 'failure'
  | 'reverting_to_box'
  | 'fading_in';

interface MorphingVerificationCardProps {
  method: 'meta' | 'file';
  title: string;
  description: React.ReactNode;
  codeSnippet: string;
  domain: string;
  authToken: string;
  isVerified: boolean;
  onVerified: (method: 'meta' | 'file') => void;
  onDownload?: () => void;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export const MorphingVerificationCard: React.FC<MorphingVerificationCardProps> = ({
  method,
  title,
  description,
  codeSnippet,
  domain,
  authToken,
  isVerified,
  onVerified,
  onDownload,
  copyKey,
  copiedKey,
  onCopy,
}) => {
  const [phase, setPhase] = useState<VerificationPhase>(isVerified ? 'success' : 'idle');
  const [failureReason, setFailureReason] = useState<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Si cambia externamente a verificado
  useEffect(() => {
    if (isVerified && phase === 'idle') {
      setPhase('success');
    }
  }, [isVerified]);

  // Manejar click en "Comprobar etiqueta" o "Comprobar archivo"
  const handleStartVerification = async () => {
    if (phase !== 'idle' && phase !== 'fading_in') return;

    // Paso 1: Fading out del contenido interno (200ms)
    setPhase('fading_out');
    setFailureReason('');

    timeoutRef.current = setTimeout(() => {
      // Paso 2: Colapso y metamorfosis del recuadro hacia la bola circular (450ms)
      setPhase('morphing_to_ball');

      timeoutRef.current = setTimeout(async () => {
        // Paso 3: Bola de carga activa y girando
        setPhase('verifying');

        const startTime = Date.now();

        try {
          const response = await fetch('/api/verify-domain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              domain: domain || 'localhost',
              token: authToken,
              method: method
            })
          });

          const data = await response.json();
          const elapsed = Date.now() - startTime;
          // Mínimo 1.8 segundos para que la animación de la bola girando sea fluida y perceptible
          const remainingTime = Math.max(0, 1800 - elapsed);

          timeoutRef.current = setTimeout(() => {
            if (data.ok && data.verified) {
              // Éxito: Bordes en verde vibrante, check y texto "Verificado"
              setPhase('success');
              onVerified(method);
            } else {
              // Fallo: Bordes en rojo vibrante, alerta y texto "No verificado"
              setPhase('failure');
              setFailureReason(data.reason || (method === 'meta'
                ? 'No se encontró la etiqueta meta en el código HTML.'
                : 'No se encontró el archivo robotaylon.txt en la raíz pública.'));

              // Mantener 3.5 segundos para que el usuario lea con calma
              timeoutRef.current = setTimeout(() => {
                // Paso 4: Metamorfosis fluida de regreso al recuadro original
                setPhase('reverting_to_box');

                timeoutRef.current = setTimeout(() => {
                  setPhase('fading_in');

                  timeoutRef.current = setTimeout(() => {
                    setPhase('idle');
                  }, 250);
                }, 450);
              }, 3500);
            }
          }, remainingTime);

        } catch (err: any) {
          const elapsed = Date.now() - startTime;
          const remainingTime = Math.max(0, 1800 - elapsed);

          timeoutRef.current = setTimeout(() => {
            setPhase('failure');
            setFailureReason('Error de conexión con el servidor. Inténtalo de nuevo.');

            timeoutRef.current = setTimeout(() => {
              setPhase('reverting_to_box');
              timeoutRef.current = setTimeout(() => {
                setPhase('fading_in');
                timeoutRef.current = setTimeout(() => {
                  setPhase('idle');
                }, 250);
              }, 450);
            }, 3500);
          }, remainingTime);
        }
      }, 450);
    }, 200);
  };

  // Determinar si el contenedor tiene forma de bola o de recuadro
  const isBall =
    phase === 'morphing_to_ball' ||
    phase === 'verifying' ||
    phase === 'success' ||
    phase === 'failure';

  const isFadingContent =
    phase === 'fading_out' ||
    phase === 'morphing_to_ball' ||
    phase === 'verifying' ||
    phase === 'success' ||
    phase === 'failure' ||
    phase === 'reverting_to_box';

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Contenedor principal que se transforma físicamente sin cortes bruscos */}
      <div
        className={`relative transition-all duration-500 ease-in-out flex flex-col justify-center overflow-hidden ${
          isBall
            ? 'w-36 h-36 rounded-full mx-auto shadow-md'
            : 'w-full min-h-[165px] rounded-2xl bg-white border border-neutral-200 p-5'
        } ${
          phase === 'verifying'
            ? 'bg-white border-2 border-neutral-200'
            : phase === 'success'
            ? 'bg-emerald-50/20 border-2 border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)]'
            : phase === 'failure'
            ? 'bg-rose-50/20 border-2 border-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.3)]'
            : 'border-neutral-200'
        }`}
      >
        {/* === ESTADO BOLA: Carga, Giro, Éxito o Fallo === */}
        {isBall && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center animate-fadeIn">
            
            {/* Anillo exterior giratorio durante la verificación */}
            {phase === 'verifying' && (
              <div
                className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-500 border-r-teal-400 animate-spin"
                style={{ animationDuration: '0.85s' }}
              />
            )}

            {/* Contenido según la fase de la bola */}
            {phase === 'verifying' && (
              <div className="flex flex-col items-center justify-center space-y-1.5 z-10">
                <div className="relative w-7 h-7 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
                  <div className="w-2 h-2 rounded-full bg-emerald-600 relative" />
                </div>
                <span className="text-[12px] font-semibold text-neutral-800 tracking-tight">
                  Verificando...
                </span>
                <span className="text-[9px] text-neutral-400 font-mono">
                  {domain ? domain.slice(0, 16) : 'analizando'}
                </span>
              </div>
            )}

            {/* Éxito: Bordes en verde vibrante, check y texto "Verificado" */}
            {phase === 'success' && (
              <div className="flex flex-col items-center justify-center space-y-1 z-10 animate-scaleIn">
                <div className="w-8 h-8 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-600 mb-0.5">
                  <Check className="w-5 h-5 stroke-[2.8]" />
                </div>
                <span className="text-[13px] font-bold text-emerald-700 tracking-tight">
                  Verificado
                </span>
                <span className="text-[9px] text-emerald-600/90 font-medium">
                  Propiedad 100% válida
                </span>
              </div>
            )}

            {/* Fallo: Bordes en rojo vibrante, alerta y texto "No verificado" */}
            {phase === 'failure' && (
              <div className="flex flex-col items-center justify-center space-y-1 z-10 animate-scaleIn">
                <div className="w-8 h-8 rounded-full bg-rose-100/80 flex items-center justify-center text-rose-600 mb-0.5">
                  <X className="w-5 h-5 stroke-[2.8]" />
                </div>
                <span className="text-[12px] font-bold text-rose-600 tracking-tight">
                  No verificado
                </span>
                <span className="text-[9px] text-rose-500/90 font-medium leading-tight">
                  Reintentando en breve...
                </span>
              </div>
            )}

          </div>
        )}

        {/* === ESTADO RECUADRO: Texto, Explicación y Código en verde === */}
        <div
          className={`w-full flex flex-col justify-between space-y-3 transition-opacity duration-300 ${
            isFadingContent ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed mt-1">
              {description}
            </p>
          </div>

          {/* Código en texto verde fino directo sin recuadro interno anidado */}
          <div className="pt-1">
            {method === 'meta' ? (
              <div className="flex items-center justify-between gap-3">
                <code className="text-xs font-mono font-light text-emerald-600 break-all select-all">
                  {codeSnippet}
                </code>
                <button
                  type="button"
                  onClick={() => onCopy(codeSnippet, copyKey)}
                  className="shrink-0 text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer flex items-center gap-1 transition-colors"
                >
                  {copiedKey === copyKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <pre className="text-xs font-mono font-light text-emerald-600 leading-relaxed select-all">
                  {codeSnippet}
                </pre>
                {onDownload && (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={onDownload}
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-mono cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar robotaylon.txt</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Explicación de error si no se verificó (limpia y ubicada justo debajo de la bola) */}
      {phase === 'failure' && failureReason && (
        <div className="mt-3 max-w-sm text-center animate-fadeIn">
          <p className="text-xs text-rose-600 font-normal leading-relaxed flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{failureReason}</span>
          </p>
        </div>
      )}

      {/* Botón verde muy limpio abajo del recuadro */}
      <div
        className={`w-full flex justify-start mt-3 transition-all duration-300 ${
          isBall
            ? 'opacity-0 pointer-events-none -translate-y-2 h-0 overflow-hidden m-0'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <button
          type="button"
          onClick={handleStartVerification}
          disabled={phase !== 'idle' && phase !== 'fading_in'}
          className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-medium tracking-tight shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          <span>{method === 'meta' ? 'Comprobar etiqueta' : 'Comprobar archivo'}</span>
        </button>
      </div>

    </div>
  );
};
