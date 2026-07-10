export function Badge({ status, tone, children }) {
  const styles = {
    approved: { bg: '#F7F5F0', text: '#111111', border: '#D4D4D4' },
    good: { bg: '#F7F5F0', text: '#111111', border: '#D4D4D4' },
    rejected: { bg: '#111111', text: '#FFFFFF', border: '#111111' },
    danger: { bg: '#111111', text: '#FFFFFF', border: '#111111' },
    pending: { bg: '#FFFFFF', text: '#404040', border: '#D4D4D4' },
    warning: { bg: '#FFFFFF', text: '#404040', border: '#D4D4D4' },
    info: { bg: '#FFFCF7', text: '#404040', border: '#E5E5E5' },
    neutral: { bg: '#FFFCF7', text: '#404040', border: '#E5E5E5' },
  };
  const key = String(status || tone || 'info').toLowerCase();
  const s = styles[key] || styles.info;
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, display: 'inline-block', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export default Badge;



