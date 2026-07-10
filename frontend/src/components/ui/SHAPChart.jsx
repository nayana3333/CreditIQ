export function SHAPChart({ features = [], title }) {
  if (!features.length) return null;
  const max = Math.max(...features.map((feature) => Math.abs(Number(feature.impact) || 0)), 0.01);
  return (
    <div>
      {title && <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#737373', marginBottom: 10 }}>{title}</p>}
      {features.slice(0, 5).map((feature, index) => {
        const impact = Number(feature.impact) || 0;
        const pct = (Math.abs(impact) / max) * 44;
        const isNeg = feature.direction === 'negative' || impact > 0;
        return (
          <div key={`${feature.feature || feature.label}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 120, fontSize: 12, color: '#737373', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={feature.label || feature.feature}>
              {feature.label || feature.feature}
            </span>
            <div style={{ flex: 1, height: 16, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#E5E5E5' }} />
              <div style={{ position: 'absolute', height: 10, borderRadius: 2, background: isNeg ? '#111111' : '#A3A3A3', width: `${pct}%`, ...(isNeg ? { right: '50%' } : { left: '50%' }) }} />
            </div>
            <span style={{ width: 40, fontSize: 11, textAlign: 'right', flexShrink: 0, color: '#404040', fontFamily: 'var(--font-mono)' }}>
              {isNeg ? '-' : '+'}{Math.abs(impact).toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default SHAPChart;



