import React, { useState, useRef, useEffect } from 'react';

interface SplitPanelProps {
  leftBlock: React.ReactNode;
  rightBlock: React.ReactNode;
}

function SplitPanel({ leftBlock, rightBlock }: SplitPanelProps) {
  const [leftPercent, setLeftPercent] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef<boolean>(false);

  const startResize = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const resize = (e: MouseEvent): void => {
      if (!isResizing.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      if (percent > 10 && percent < 90) {
        setLeftPercent(percent);
      }
    };

    const stopResize = (): void => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResize);

    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div style={{ width: `${leftPercent}%`, minWidth: '100px', overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        {leftBlock}
      </div>
      <div
        style={{
          width: '6px',
          cursor: 'col-resize',
          backgroundColor: '#d1d5db',
          flexShrink: 0,
          transition: 'background-color 0.2s',
        }}
        onMouseDown={startResize}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#9ca3af'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#d1d5db'; }}
      />
      <div style={{ flex: 1, minWidth: '100px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {rightBlock}
      </div>
    </div>
  );
}

export default SplitPanel;
