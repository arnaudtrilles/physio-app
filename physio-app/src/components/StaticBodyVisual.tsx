export const StaticBodyVisual = ({ view, zoneData }: { view: 'Face' | 'Dos', zoneData: any }) => {
  const getZoneColor = (zone: string) => {
    const data = zoneData[zone];
    if (!data || !data.saved) return "var(--primary-dark)"; // var(--primary-dark)
    
    const intensity = parseInt(data.intensite || '5', 10);
    if (intensity === 0) return "#10b981"; 
    if (intensity <= 2) return "var(--pain-scale-amber)";  
    if (intensity <= 4) return "var(--color-orange-mid)";  
    if (intensity <= 6) return "var(--color-danger)";  
    if (intensity <= 8) return "#b91c1c";  
    return "var(--color-danger-deeper)";                      
  };

  if (view === 'Face') {
    return (
      <svg viewBox="0 0 200 380" style={{ width: '100%', maxWidth: '200px', background: 'transparent' }}>
        <g transform="translate(0, 10)">
          <circle cx="100" cy="25" r="22" fill={getZoneColor('Tête (Face)')} />
          <rect x="90" y="47" width="20" height="15" rx="4" fill={getZoneColor('Cou (Face)')} />
          
          <rect x="75" y="62" width="50" height="55" rx="8" fill={getZoneColor('Torse / Poitrine')} />
          <rect x="75" y="120" width="50" height="60" rx="10" fill={getZoneColor('Abdomen')} />
          
          <circle cx="60" cy="70" r="14" fill={getZoneColor('Épaule Droite (Face)')} />
          <rect x="45" y="85" width="18" height="85" rx="9" fill={getZoneColor('Bras Droit (Face)')} />
          
          <circle cx="140" cy="70" r="14" fill={getZoneColor('Épaule Gauche (Face)')} />
          <rect x="137" y="85" width="18" height="85" rx="9" fill={getZoneColor('Bras Gauche (Face)')} />
          
          <rect x="75" y="185" width="22" height="75" rx="8" fill={getZoneColor('Cuisse Droite (Face)')} />
          <circle cx="86" cy="270" r="12" fill={getZoneColor('Genou Droit')} />
          <rect x="76" y="285" width="20" height="45" rx="6" fill={getZoneColor('Tibia Droit')} />
          <rect x="73" y="333" width="25" height="12" rx="4" fill={getZoneColor('Pied Droit')} />

          <rect x="103" y="185" width="22" height="75" rx="8" fill={getZoneColor('Cuisse Gauche (Face)')} />
          <circle cx="114" cy="270" r="12" fill={getZoneColor('Genou Gauche')} />
          <rect x="104" y="285" width="20" height="45" rx="6" fill={getZoneColor('Tibia Gauche')} />
          <rect x="102" y="333" width="25" height="12" rx="4" fill={getZoneColor('Pied Gauche')} />
        </g>
      </svg>
    );
  } else {
    return (
      <svg viewBox="0 0 200 380" style={{ width: '100%', maxWidth: '200px', background: 'transparent' }}>
        <g transform="translate(0, 10)">
          <circle cx="100" cy="25" r="22" fill={getZoneColor('Tête (Dos)')} />
          <rect x="90" y="47" width="20" height="15" rx="4" fill={getZoneColor('Nuque / Cou (Dos)')} />
          
          <rect x="75" y="62" width="50" height="55" rx="8" fill={getZoneColor('Haut du Dos')} />
          <rect x="75" y="120" width="50" height="35" rx="5" fill={getZoneColor('Lombaires')} />
          <rect x="75" y="157" width="50" height="25" rx="5" fill={getZoneColor('Fessiers')} />
          
          <circle cx="60" cy="70" r="14" fill={getZoneColor('Épaule Gauche (Dos)')} />
          <rect x="45" y="85" width="18" height="85" rx="9" fill={getZoneColor('Bras Gauche (Dos)')} />
          
          <circle cx="140" cy="70" r="14" fill={getZoneColor('Épaule Droite (Dos)')} />
          <rect x="137" y="85" width="18" height="85" rx="9" fill={getZoneColor('Bras Droit (Dos)')} />
          
          <rect x="75" y="185" width="22" height="75" rx="8" fill={getZoneColor('Ischio Gauche')} />
          <circle cx="86" cy="270" r="12" fill={getZoneColor('Creux Poplité Gauche')} />
          <rect x="76" y="285" width="20" height="45" rx="6" fill={getZoneColor('Mollet Gauche')} />
          <rect x="73" y="333" width="25" height="12" rx="4" fill={getZoneColor('Talon Gauche')} />

          <rect x="103" y="185" width="22" height="75" rx="8" fill={getZoneColor('Ischio Droit')} />
          <circle cx="114" cy="270" r="12" fill={getZoneColor('Creux Poplité Droit')} />
          <rect x="104" y="285" width="20" height="45" rx="6" fill={getZoneColor('Mollet Droit')} />
          <rect x="102" y="333" width="25" height="12" rx="4" fill={getZoneColor('Talon Droit')} />
        </g>
      </svg>
    );
  }
};
