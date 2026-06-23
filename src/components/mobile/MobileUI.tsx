import type { CSSProperties, ReactNode } from 'react';
import { X } from 'lucide-react';
import { D } from '../../data/theme';

export function MobilePage({
  children,
  gap = 12,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 560,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap,
        paddingBottom: 'calc(92px + env(safe-area-inset-bottom))',
        overflowX: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function MobileSection({
  title,
  subtitle,
  action,
  children,
  style,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      style={{
        width: '100%',
        borderRadius: D.radiusSm,
        border: D.glassBorder,
        background: 'rgba(255,255,255,0.035)',
        padding: 12,
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...style,
      }}
    >
      {(title || subtitle || action) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {title && <div style={{ fontSize: 15, fontWeight: 700, color: D.text, lineHeight: 1.35 }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 12, color: D.textMid, lineHeight: 1.45, marginTop: 3 }}>{subtitle}</div>}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function MobileSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  columns,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode; tone?: 'gold' | 'blue' | 'red' | 'green' }>;
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: columns ? `repeat(${columns}, minmax(0, 1fr))` : `repeat(${options.length}, minmax(0, 1fr))`,
        gap: 6,
        width: '100%',
      }}
    >
      {options.map(option => {
        const selected = option.value === value;
        const color = option.tone === 'red'
          ? D.cinnabar
          : option.tone === 'green'
            ? D.success
            : option.tone === 'blue'
              ? D.blue
              : D.gold;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              minHeight: 40,
              padding: '8px 6px',
              borderRadius: D.radiusXs,
              border: `1px solid ${selected ? color : D.border}`,
              background: selected ? `${color}22` : 'rgba(255,255,255,0.025)',
              color: selected ? color : D.textMid,
              fontSize: 13,
              fontWeight: selected ? 700 : 500,
              lineHeight: 1.2,
              cursor: 'pointer',
              fontFamily: "'LXGW WenKai', 'Cinzel', serif",
              overflowWrap: 'anywhere',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function MobileActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'calc(68px + env(safe-area-inset-bottom))',
        zIndex: 80,
        padding: '8px 12px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.88) 18%, rgba(0,0,0,0.96))',
        backdropFilter: 'blur(18px)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

export function MobileSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div
        onClick={event => event.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          borderTopLeftRadius: D.radius,
          borderTopRightRadius: D.radius,
          border: `1px solid ${D.borderHover}`,
          background: '#050507',
          padding: '14px 14px calc(18px + env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: D.text }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: D.radiusXs,
              border: `1px solid ${D.border}`,
              background: D.bgCard,
              color: D.textMid,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MobileRecordItem({
  leading,
  title,
  meta,
  tags,
  details,
  action,
}: {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  tags?: ReactNode;
  details?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 9,
        padding: '10px 0',
        borderBottom: `1px solid ${D.border}`,
        minWidth: 0,
      }}
    >
      {leading && <div style={{ flexShrink: 0 }}>{leading}</div>}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, color: D.text, lineHeight: 1.45, overflowWrap: 'break-word' }}>{title}</div>
        {meta && <div style={{ fontSize: 11, color: D.textDim, lineHeight: 1.4, marginTop: 4 }}>{meta}</div>}
        {tags && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>{tags}</div>}
        {details && <div style={{ marginTop: 7 }}>{details}</div>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
