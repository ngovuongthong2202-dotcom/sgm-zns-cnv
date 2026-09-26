import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface HoverCardPortalProps {
  children: React.ReactNode;
  content: React.ReactNode;
  cardWidth?: number;
  openDelay?: number;
  closeDelay?: number;
}

export function HoverCardPortal({ 
  children, 
  content, 
  cardWidth = 420,
  openDelay = 250,
  closeDelay = 350
}: HoverCardPortalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimeoutRef = useRef<any>(null);
  const closeTimeoutRef = useRef<any>(null);
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ top: -9999, left: -9999, opacity: 0 });

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (!isOpen) {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = setTimeout(() => setIsOpen(true), openDelay);
    }
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), closeDelay);
  };

  const handleContentMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleContentMouseLeave = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), closeDelay);
  };

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !cardRef.current || !triggerRef.current) {
      setAdjustedPos(prev => {
        if (prev.top === -9999 && prev.left === -9999 && prev.opacity === 0) return prev;
        return { top: -9999, left: -9999, opacity: 0 };
      });
      return;
    }

    const updatePosition = () => {
      if (!cardRef.current || !triggerRef.current) return;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();
      const h = cardRect.height;
      const w = cardWidth;
      const gap = 8;
      const margin = 16;

      let left = triggerRect.right + gap;
      let top = triggerRect.top + (triggerRect.height / 2) - (h / 2);
      
      // Check right boundary collision
      if (left + w > window.innerWidth - margin) {
        left = triggerRect.left - w - gap; // Try left
      }
      
      // If still violating left or right boundaries, place under of top
      if (left < margin || left + w > window.innerWidth - margin) {
        left = triggerRect.left + (triggerRect.width / 2) - (w / 2);
        top = triggerRect.bottom + gap; // Below
        
        // If below collides, place above
        if (top + h > window.innerHeight - margin) {
          top = triggerRect.top - h - gap;
        }
      } else {
        // Adjust vertical pos
        if (top + h > window.innerHeight - margin) {
          top = window.innerHeight - h - margin;
        }
        if (top < margin) {
          top = margin;
        }
      }

      // Final clamp to secure safe screen region
      left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
      top = Math.max(margin, Math.min(top, window.innerHeight - h - margin));

      setAdjustedPos(prev => {
        if (prev.top === top && prev.left === left && prev.opacity === 1) return prev;
        return { top, left, opacity: 1 };
      });
    };

    // Initial positioning
    updatePosition();

    // Use ResizeObserver to safely observe dynamic content size changes without loop re-renders
    const resizeObserver = new ResizeObserver(() => {
      updatePosition();
    });

    if (cardRef.current) {
      resizeObserver.observe(cardRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isOpen, cardWidth]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/15 backdrop-blur-[1px] z-[99999] pointer-events-none transition-all duration-200 animate-in fade-in" />
      )}
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer inline-block"
      >
         {children}
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={cardRef}
          data-hovercard-boundary="true"
          onMouseEnter={handleContentMouseEnter}
          onMouseLeave={handleContentMouseLeave}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ 
            position: 'fixed', 
            top: `${adjustedPos.top}px`, 
            left: `${adjustedPos.left}px`,
            width: `${cardWidth}px`,
            opacity: adjustedPos.opacity
          }}
          className="z-[100000] animate-in fade-in zoom-in-95 duration-150 outline-none bg-white rounded-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-slate-300 max-h-[85vh] overflow-hidden flex flex-col backdrop-blur-xl bg-white/98 text-slate-800 pointer-events-auto"
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
