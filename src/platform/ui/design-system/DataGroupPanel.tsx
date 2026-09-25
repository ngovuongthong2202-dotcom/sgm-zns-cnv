import React from 'react';
import { Layers } from 'lucide-react';
import { Button } from './Button';

interface DataGroupPanelProps {
  groups: string[];
  onAddGroup?: () => void;
  onRemoveGroup?: (grp: string) => void;
}

export function DataGroupPanel({ groups, onAddGroup, onRemoveGroup }: DataGroupPanelProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-slate-50 border-b border-border-subtle overflow-x-auto">
      <div className="flex items-center text-text-muted text-xs font-semibold px-2">
        <Layers className="w-4 h-4 mr-1" />
        Grouped by
      </div>
      {groups.length === 0 && (
        <span className="text-text-muted text-xs italic">No grouping</span>
      )}
      {groups.map((grp) => (
        <div key={grp} className="flex items-center bg-white border border-border-strong rounded shadow-sm px-2 py-1 text-xs text-text-primary">
          {grp}
          <Button variant="ghost"
            className="ml-2 text-text-muted hover:text-danger"
             onClick={() => onRemoveGroup?.(grp)}
            aria-label={`Remove grouping ${grp}`}
          >
            &times;
          </Button>
        </div>
      ))}
      {onAddGroup && (
        <Button variant="ghost"
          className="text-xs text-accent hover:text-blue-700 px-2 py-1"
          onClick={onAddGroup}
         aria-label="+ Add group">
          + Add group
        </Button>
      )}
    </div>
  );
}
