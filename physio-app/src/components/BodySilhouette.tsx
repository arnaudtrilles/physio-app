import { useState, useRef, useEffect } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// Bounding box [x, y, width, height] pour chaque zone (avec marge)
const ZONE_VIEWBOX: Record<string, [number, number, number, number]> = {
  'Tête':                  [72,  2,  56, 60],
  'Cervicales':            [78, 44,  44, 36],
  'Épaule Droite':         [34, 56,  55, 56],
  'Épaule Gauche':         [111, 56, 55, 56],
  'Thorax':                [62, 56,  76,104],
  'Thoracique':            [62, 56,  76,104],
  'Lombaires':             [66,140,  68, 68],
  'Bassin':                [56,140,  88,100],
  'Humérus Droit':         [28, 80,  44,100],
  'Humérus Gauche':        [128,80,  44,100],
  'Coude Droit':           [32,156,  38, 36],
  'Coude Gauche':          [130,156, 38, 36],
  'Avant-bras Droit':      [30,172,  42, 80],
  'Avant-bras Gauche':     [128,172, 42, 80],
  'Main Droite':           [28,228,  48, 58],
  'Main Gauche':           [124,228, 48, 58],
  'Fémur Droit':           [58,210,  52,110],
  'Fémur Gauche':          [90,210,  52,110],
  'Genou Droit':           [60,300,  50, 38],
  'Genou Gauche':          [90,300,  50, 38],
  'Mollet Droit':          [58,314,  52, 90],
  'Mollet Gauche':         [90,314,  52, 90],
  'Pied/Cheville Droit':   [48,382,  64, 58],
  'Pied/Cheville Gauche':  [88,382,  64, 58],
};

// Canvas de dessin superposé au SVG zoomé
const DrawingCanvas = ({
  zoneId,
  savedDrawing,
  onUpdate,
}: {
  zoneId: string;
  savedDrawing?: string;
  onUpdate: (dataUrl: string) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [penColor, setPenColor] = useState('var(--color-danger)');
  const [penSize, setPenSize] = useState(3);

  // Restaurer un dessin sauvegardé
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    if (savedDrawing) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = savedDrawing;
    }
  }, [zoneId]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !canvasRef.current || !lastPos.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    if (canvasRef.current) onUpdate(canvasRef.current.toDataURL());
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    canvasRef.current.getContext('2d')!.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    onUpdate('');
  };

  const COLORS = ['var(--color-danger)', 'var(--primary-light)', 'var(--color-success)', 'var(--color-orange-mid)', 'var(--color-purple-deeper)', '#000000'];

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Barre d'outils */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Couleur :</span>
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setPenColor(c)}
            style={{
              width: 22, height: 22, borderRadius: '50%', background: c, border: penColor === c ? '2.5px solid var(--primary)' : '2px solid transparent',
              boxShadow: penColor === c ? '0 0 0 2px white, 0 0 0 4px var(--primary)' : 'none',
              flexShrink: 0,
            }}
          />
        ))}
        <select
          value={penSize}
          onChange={e => setPenSize(Number(e.target.value))}
          style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border-color)', marginLeft: '0.25rem' }}
        >
          <option value={2}>Fin</option>
          <option value={4}>Moyen</option>
          <option value={7}>Épais</option>
        </select>
        <button
          onClick={clearCanvas}
          style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--danger)' }}
        >
          Effacer
        </button>
      </div>

      {/* Zone SVG + canvas superposé */}
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border-color)', background: 'var(--secondary)' }}>
        <svg
          viewBox={ZONE_VIEWBOX[zoneId]?.join(' ') ?? '0 0 200 435'}
          style={{ width: '100%', display: 'block' }}
        >
          <BodyZoneSVG highlightZone={zoneId} />
        </svg>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem', textAlign: 'center' }}>
        Dessinez sur la zone pour localiser précisément
      </p>
    </div>
  );
};

// SVG du corps complet (réutilisé pour le zoom zone)
const BodyZoneSVG = ({ highlightZone }: { highlightZone: string }) => {
  const zp = (id: string) => ({
    fill: id === highlightZone ? 'var(--color-info-border)' : 'var(--svg-body-fill)',
    stroke: id === highlightZone ? 'var(--svg-highlight-stroke)' : 'var(--svg-body-stroke)',
    strokeWidth: id === highlightZone ? 2.2 : 1.1,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  });

  return (
    <g>
      <ellipse cx="100" cy="30" rx="19" ry="24" {...zp('Tête')} />
      <path d="M92,53 Q100,50 108,53 L107,70 Q100,68 93,70 Z" {...zp('Cervicales')} />
      <path d="M74,70 Q63,67 54,74 C48,81 49,92 56,97 C62,101 70,100 75,96 L76,82 Z" {...zp('Épaule Droite')} />
      <path d="M75,70 L76,96 L78,150 L122,150 L124,96 L125,70 Q100,66 75,70 Z" {...zp('Thorax')} />
      <path d="M75,70 L76,96 L78,150 L122,150 L124,96 L125,70 Q100,66 75,70 Z" {...zp('Thoracique')} />
      <path d="M78,150 L80,197 L120,197 L122,150 Z" {...zp('Lombaires')} />
      <path d="M126,70 L124,82 L125,96 C130,100 138,101 144,97 C151,92 152,81 146,74 Q137,67 126,70 Z" {...zp('Épaule Gauche')} />
      <path d="M78,150 Q72,178 72,222 Q86,228 100,228 Q114,228 128,222 Q128,178 122,150 Z" {...zp('Bassin')} />
      <path d="M80,197 Q73,210 72,222 Q86,228 100,228 Q114,228 128,222 Q127,210 120,197 Z" {...zp('Bassin')} />
      <path d="M42,90 Q41,96 41,108 L42,163 Q46,167 51,167 Q57,167 60,163 L60,108 Q59,96 57,90 Q50,87 42,90 Z" {...zp('Humérus Droit')} />
      <ellipse cx="51" cy="172" rx="9" ry="8" {...zp('Coude Droit')} />
      <path d="M42,180 L43,238 L60,238 L59,180 Q51,177 42,180 Z" {...zp('Avant-bras Droit')} />
      <path d="M41,238 Q39,254 41,266 Q51,274 61,266 Q63,254 61,238 Z" {...zp('Main Droite')} />
      <path d="M140,90 Q143,87 150,87 Q157,87 159,90 Q160,96 159,108 L158,163 Q155,167 150,167 Q144,167 141,163 L140,108 Q139,96 140,90 Z" {...zp('Humérus Gauche')} />
      <ellipse cx="150" cy="172" rx="9" ry="8" {...zp('Coude Gauche')} />
      <path d="M141,180 L141,238 L159,238 L158,180 Q150,177 141,180 Z" {...zp('Avant-bras Gauche')} />
      <path d="M140,238 Q138,254 140,266 Q150,274 160,266 Q162,254 160,238 Z" {...zp('Main Gauche')} />
      <path d="M72,222 Q71,265 72,308 L97,308 Q98,265 98,222 Q85,218 72,222 Z" {...zp('Fémur Droit')} />
      <ellipse cx="85" cy="315" rx="13" ry="9" {...zp('Genou Droit')} />
      <path d="M72,324 Q71,358 73,392 L97,392 Q99,358 98,324 Q85,319 72,324 Z" {...zp('Mollet Droit')} />
      <path d="M73,392 Q65,396 63,410 Q65,424 87,424 L98,420 L99,392 Z" {...zp('Pied/Cheville Droit')} />
      <path d="M102,222 Q102,265 103,308 L128,308 Q129,265 128,222 Q115,218 102,222 Z" {...zp('Fémur Gauche')} />
      <ellipse cx="115" cy="315" rx="13" ry="9" {...zp('Genou Gauche')} />
      <path d="M102,324 Q101,358 103,392 L127,392 Q129,358 128,324 Q115,319 102,324 Z" {...zp('Mollet Gauche')} />
      <path d="M101,392 L101,420 L113,424 Q135,424 137,410 Q135,396 127,392 Z" {...zp('Pied/Cheville Gauche')} />
    </g>
  );
};

// ── Composant principal ──────────────────────────────────────────────────────
export const BodySilhouette = ({ onContextChange }: { onContextChange: (data: any) => void }) => {
  const [view, setView] = useState<'Face' | 'Dos'>('Face');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoneData, setZoneData] = useState<Record<string, any>>({});
  const { activeField, toggleListening } = useSpeechRecognition();

  const handleZoneClick = (zone: string) => {
    setSelectedZone(zone);
    if (!zoneData[zone]) {
      setZoneData(prev => ({
        ...prev,
        [zone]: { intensite: 5, type: '', fondDouloureux: false, douleurNocturne: false, notes: '', drawing: '', saved: false }
      }));
    }
  };

  const updateZoneDetails = (field: string, value: any) => {
    if (!selectedZone) return;
    let v = value;
    if (typeof v === 'string' && v.length > 0 && (field === 'type' || field === 'notes'))
      v = v.charAt(0).toUpperCase() + v.slice(1);
    setZoneData(prev => ({ ...prev, [selectedZone]: { ...prev[selectedZone], [field]: v } }));
  };

  const closeForm = () => {
    if (selectedZone && !zoneData[selectedZone]?.saved) {
      setZoneData(prev => { const c = { ...prev }; delete c[selectedZone]; return c; });
    }
    setSelectedZone(null);
  };

  const saveForm = () => {
    if (!selectedZone) return;
    const updated = { ...zoneData, [selectedZone]: { ...zoneData[selectedZone], saved: true } };
    setZoneData(updated);
    onContextChange(updated);
    setSelectedZone(null);
  };

  const handleVoice = (field: string) => {
    const base = zoneData[selectedZone!]?.[field] || '';
    toggleListening(field, (text) => updateZoneDetails(field, base ? `${base} ${text}` : text));
  };

  const getColor = (zone: string) => {
    const d = zoneData[zone];
    if (!d || !d.saved) return 'var(--svg-body-fill)';
    const i = parseInt(d.intensite || '5', 10);
    if (i === 0) return 'var(--color-success-border2)';
    if (i <= 2) return 'var(--pain-low)';
    if (i <= 4) return 'var(--pain-mid)';
    if (i <= 6) return 'var(--pain-high)';
    if (i <= 8) return 'var(--color-danger)';
    return 'var(--color-danger-dark)';
  };

  const zp = (id: string) => ({
    fill: getColor(id),
    stroke: selectedZone === id ? 'var(--svg-highlight-stroke)' : 'var(--svg-body-stroke)',
    strokeWidth: selectedZone === id ? 2.2 : 1.3,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
    onClick: () => handleZoneClick(id),
    style: { cursor: 'pointer' } as React.CSSProperties,
  });

  const MicBtn = ({ field }: { field: string }) => (
    <button className={`mic-btn-inline ${activeField === field ? 'recording' : ''}`} aria-label="Dictée vocale" onClick={() => handleVoice(field)}>
      {activeField !== field && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="11" rx="3"/>
          <path d="M5 10a7 7 0 0 0 14 0"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
          <line x1="8" y1="22" x2="16" y2="22"/>
        </svg>
      )}
    </button>
  );

  const renderFront = () => (
    <g>
      <ellipse cx="100" cy="30" rx="19" ry="24" {...zp('Tête')} />
      <path d="M92,53 Q100,50 108,53 L107,70 Q100,68 93,70 Z" {...zp('Cervicales')} />
      <path d="M74,70 Q63,67 54,74 C48,81 49,92 56,97 C62,101 70,100 75,96 L76,82 Z" {...zp('Épaule Droite')} />
      <path d="M75,70 L76,96 L78,150 L122,150 L124,96 L125,70 Q100,66 75,70 Z" {...zp('Thorax')} />
      <path d="M126,70 L124,82 L125,96 C130,100 138,101 144,97 C151,92 152,81 146,74 Q137,67 126,70 Z" {...zp('Épaule Gauche')} />
      <path d="M78,150 Q72,178 72,222 Q86,228 100,228 Q114,228 128,222 Q128,178 122,150 Z" {...zp('Bassin')} />
      <path d="M42,90 Q41,96 41,108 L42,163 Q46,167 51,167 Q57,167 60,163 L60,108 Q59,96 57,90 Q50,87 42,90 Z" {...zp('Humérus Droit')} />
      <ellipse cx="51" cy="172" rx="9" ry="8" {...zp('Coude Droit')} />
      <path d="M42,180 L43,238 L60,238 L59,180 Q51,177 42,180 Z" {...zp('Avant-bras Droit')} />
      <path d="M41,238 Q39,254 41,266 Q51,274 61,266 Q63,254 61,238 Z" {...zp('Main Droite')} />
      <path d="M140,90 Q143,87 150,87 Q157,87 159,90 Q160,96 159,108 L158,163 Q155,167 150,167 Q144,167 141,163 L140,108 Q139,96 140,90 Z" {...zp('Humérus Gauche')} />
      <ellipse cx="150" cy="172" rx="9" ry="8" {...zp('Coude Gauche')} />
      <path d="M141,180 L141,238 L159,238 L158,180 Q150,177 141,180 Z" {...zp('Avant-bras Gauche')} />
      <path d="M140,238 Q138,254 140,266 Q150,274 160,266 Q162,254 160,238 Z" {...zp('Main Gauche')} />
      <path d="M72,222 Q71,265 72,308 L97,308 Q98,265 98,222 Q85,218 72,222 Z" {...zp('Fémur Droit')} />
      <ellipse cx="85" cy="315" rx="13" ry="9" {...zp('Genou Droit')} />
      <path d="M72,324 Q71,358 73,392 L97,392 Q99,358 98,324 Q85,319 72,324 Z" {...zp('Mollet Droit')} />
      <path d="M73,392 Q65,396 63,410 Q65,424 87,424 L98,420 L99,392 Z" {...zp('Pied/Cheville Droit')} />
      <path d="M102,222 Q102,265 103,308 L128,308 Q129,265 128,222 Q115,218 102,222 Z" {...zp('Fémur Gauche')} />
      <ellipse cx="115" cy="315" rx="13" ry="9" {...zp('Genou Gauche')} />
      <path d="M102,324 Q101,358 103,392 L127,392 Q129,358 128,324 Q115,319 102,324 Z" {...zp('Mollet Gauche')} />
      <path d="M101,392 L101,420 L113,424 Q135,424 137,410 Q135,396 127,392 Z" {...zp('Pied/Cheville Gauche')} />
    </g>
  );

  const renderBack = () => (
    <g>
      <ellipse cx="100" cy="30" rx="19" ry="24" {...zp('Tête')} />
      <path d="M92,53 Q100,50 108,53 L107,70 Q100,68 93,70 Z" {...zp('Cervicales')} />
      <path d="M74,70 Q63,67 54,74 C48,81 49,92 56,97 C62,101 70,100 75,96 L76,82 Z" {...zp('Épaule Droite')} />
      <path d="M75,70 L76,96 L78,150 L122,150 L124,96 L125,70 Q100,66 75,70 Z" {...zp('Thoracique')} />
      <path d="M126,70 L124,82 L125,96 C130,100 138,101 144,97 C151,92 152,81 146,74 Q137,67 126,70 Z" {...zp('Épaule Gauche')} />
      <path d="M78,150 L80,197 L120,197 L122,150 Z" {...zp('Lombaires')} />
      <path d="M80,197 Q73,210 72,222 Q86,228 100,228 Q114,228 128,222 Q127,210 120,197 Z" {...zp('Bassin')} />
      <path d="M42,90 Q41,96 41,108 L42,163 Q46,167 51,167 Q57,167 60,163 L60,108 Q59,96 57,90 Q50,87 42,90 Z" {...zp('Humérus Droit')} />
      <ellipse cx="51" cy="172" rx="9" ry="8" {...zp('Coude Droit')} />
      <path d="M42,180 L43,238 L60,238 L59,180 Q51,177 42,180 Z" {...zp('Avant-bras Droit')} />
      <path d="M41,238 Q39,254 41,266 Q51,274 61,266 Q63,254 61,238 Z" {...zp('Main Droite')} />
      <path d="M140,90 Q143,87 150,87 Q157,87 159,90 Q160,96 159,108 L158,163 Q155,167 150,167 Q144,167 141,163 L140,108 Q139,96 140,90 Z" {...zp('Humérus Gauche')} />
      <ellipse cx="150" cy="172" rx="9" ry="8" {...zp('Coude Gauche')} />
      <path d="M141,180 L141,238 L159,238 L158,180 Q150,177 141,180 Z" {...zp('Avant-bras Gauche')} />
      <path d="M140,238 Q138,254 140,266 Q150,274 160,266 Q162,254 160,238 Z" {...zp('Main Gauche')} />
      <path d="M72,222 Q71,265 72,308 L97,308 Q98,265 98,222 Q85,218 72,222 Z" {...zp('Fémur Droit')} />
      <ellipse cx="85" cy="315" rx="13" ry="9" {...zp('Genou Droit')} />
      <path d="M72,324 Q71,358 73,392 L97,392 Q99,358 98,324 Q85,319 72,324 Z" {...zp('Mollet Droit')} />
      <path d="M73,392 Q68,396 67,410 Q69,424 90,424 L99,420 L99,392 Z" {...zp('Pied/Cheville Droit')} />
      <path d="M102,222 Q102,265 103,308 L128,308 Q129,265 128,222 Q115,218 102,222 Z" {...zp('Fémur Gauche')} />
      <ellipse cx="115" cy="315" rx="13" ry="9" {...zp('Genou Gauche')} />
      <path d="M102,324 Q101,358 103,392 L127,392 Q129,358 128,324 Q115,319 102,324 Z" {...zp('Mollet Gauche')} />
      <path d="M101,392 L101,420 L110,424 Q131,424 133,410 Q131,396 127,392 Z" {...zp('Pied/Cheville Gauche')} />
    </g>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ display: 'flex', background: 'var(--secondary)', borderRadius: 'var(--radius-xl)', padding: '0.5rem', marginBottom: '1rem', width: '100%', maxWidth: '300px' }}>
        <button onClick={() => setView('Face')} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: view === 'Face' ? 'white' : 'transparent', color: view === 'Face' ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: view === 'Face' ? 600 : 400, boxShadow: view === 'Face' ? 'var(--shadow-sm)' : 'none' }}>
          Vue de Face
        </button>
        <button onClick={() => setView('Dos')} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: view === 'Dos' ? 'white' : 'transparent', color: view === 'Dos' ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: view === 'Dos' ? 600 : 400, boxShadow: view === 'Dos' ? 'var(--shadow-sm)' : 'none' }}>
          Vue de Dos
        </button>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Touchez une zone pour évaluer</p>

      <div style={{ width: '100%', maxWidth: '210px' }}>
        <svg viewBox="0 0 200 435" style={{ width: '100%' }}>
          {view === 'Face' ? renderFront() : renderBack()}
        </svg>
      </div>

      {selectedZone && (
        <div style={{ backgroundColor: 'rgba(0,0,0,0.6)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '420px', maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow-2xl)' }}>

            {/* En-tête */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="title-section" style={{ margin: 0, color: 'var(--danger)' }}>{selectedZone}</h3>
              <button onClick={closeForm} style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Canvas de dessin sur la zone */}
            <DrawingCanvas
              zoneId={selectedZone}
              savedDrawing={zoneData[selectedZone]?.drawing}
              onUpdate={(dataUrl) => updateZoneDetails('drawing', dataUrl)}
            />

            {/* Intensité */}
            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label>Intensité (0-10) : <strong style={{ color: 'var(--danger)', fontSize: '1.2rem' }}>{zoneData[selectedZone]?.intensite}</strong></label>
              <input type="range" min="0" max="10"
                value={zoneData[selectedZone]?.intensite || 5}
                onChange={(e) => updateZoneDetails('intensite', e.target.value)}
                style={{ width: '100%', accentColor: 'var(--danger)', marginTop: '0.5rem' }}
              />
            </div>

            {/* Type de douleur */}
            <div className="form-group">
              <label>Type de douleur</label>
              <div className="input-with-mic" style={{ background: 'var(--base-bg)' }}>
                <input type="text" placeholder="Brûlure, picotement..." className="input-luxe"
                  value={zoneData[selectedZone]?.type || ''}
                  onChange={(e) => updateZoneDetails('type', e.target.value)}
                />
                <MicBtn field="type" />
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--base-bg)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <input type="checkbox" id="fondDouloureux" checked={zoneData[selectedZone]?.fondDouloureux || false} onChange={e => updateZoneDetails('fondDouloureux', e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--danger)' }} />
              <label htmlFor="fondDouloureux" style={{ margin: 0, flex: 1, fontSize: '0.9rem' }}>Fond douloureux</label>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--base-bg)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <input type="checkbox" id="douleurNocturne" checked={zoneData[selectedZone]?.douleurNocturne || false} onChange={e => updateZoneDetails('douleurNocturne', e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--danger)' }} />
              <label htmlFor="douleurNocturne" style={{ margin: 0, flex: 1, fontSize: '0.9rem' }}>Douleurs nocturnes</label>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Notes Cliniques</label>
              <div className="input-with-mic" style={{ background: 'var(--base-bg)' }}>
                <textarea placeholder="Circonstances, observations..." className="input-luxe" rows={3}
                  value={zoneData[selectedZone]?.notes || ''}
                  onChange={(e) => updateZoneDetails('notes', e.target.value)}
                />
                <MicBtn field="notes" />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <button className="btn-primary-luxe" style={{ marginBottom: 0 }} onClick={saveForm}>
                Sauvegarder la zone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
