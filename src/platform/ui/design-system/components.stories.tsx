import React, { useState } from 'react';
import { DataGroupPanel } from './DataGroupPanel';
import { GroupHeader } from './GroupHeader';
import { SortMenu } from './SortMenu';
import { ViewSwitcher, ViewType } from './ViewSwitcher';
import { DensityToggle, Density } from './DensityToggle';
import { KPICard } from './KPICard';
import { Users, TrendingUp } from 'lucide-react';
import { MicroChart } from './MicroChart';
import { FormStepper } from './FormStepper';
import { EmptyState } from './EmptyState';
import { InlineEdit } from './InlineEdit';

export default {
  title: 'Design System / Phase 5A Components',
};

export const DataViewControls = () => {
  const [view, setView] = useState<ViewType>('table');
  const [density, setDensity] = useState<Density>('normal');
  return (
    <div className="p-8 space-y-8 bg-slate-50">
      <div className="flex gap-4">
        <ViewSwitcher view={view} onChange={setView} />
        <DensityToggle density={density} onChange={setDensity} />
      </div>
      <SortMenu 
        sorting={[{ id: 'name', desc: false }]} 
        onSortingChange={() => {}} 
        availableColumns={[{id: 'name', label: 'Name'}, {id: 'date', label: 'Date'}]} 
      />
      <DataGroupPanel groups={['Category', 'Status']} />
      <GroupHeader isExpanded={true} onToggle={() => {}} title="Active Customers" count={42} aggregates={{ sum: 1000 }} />
    </div>
  );
};

export const KPICards = () => (
  <div className="p-8 grid grid-cols-3 gap-6 bg-slate-50">
    <KPICard title="Total Users" value="10,234" icon={<Users />} />
    <KPICard title="Revenue" value="$42,000" variant="trend" trend={12.5} icon={<TrendingUp />} />
    <KPICard title="Monthly Goal" value="$100k" variant="goal" goal={100} progress={42} />
  </div>
);

export const MicroCharts = () => (
  <div className="p-8 flex gap-8 bg-slate-50">
    <div className="p-4 bg-white rounded-xl shadow-sm border"><MicroChart data={[10, 20, 15, 30, 25, 40, 35]} type="line" color="#2563eb" /></div>
    <div className="p-4 bg-white rounded-xl shadow-sm border"><MicroChart data={[10, 20, 15, 30, 25, 40, 35]} type="bar" color="#10b981" /></div>
    <div className="p-4 bg-white rounded-xl shadow-sm border"><MicroChart data={[30, 40, 30]} type="donut" color="#f59e0b" width={40} height={40} /></div>
  </div>
);

export const FormStepperStory = () => {
  return (
    <div className="p-8 w-full max-w-2xl bg-white border m-8 rounded-xl shadow-sm">
      <FormStepper 
        entityType="demo"
        onComplete={async () => {}}
        onCancel={() => {}}
        uid="demo"
        steps={[
          { id: '1', label: 'Basic Info', description: 'Name & Contact', content: <div>Step 1</div> },
          { id: '2', label: 'Company', description: 'Tax & Address', content: <div>Step 2</div> },
          { id: '3', label: 'Review', description: 'Confirm details', content: <div>Step 3</div> },
        ]}
      />
    </div>
  );
};

export const Interactivity = () => {
  const [val, setVal] = useState('Click to edit me');
  return (
    <div className="p-8 space-y-8 h-[400px]">
      <div>
        <h3 className="mb-2 font-semibold">Inline Edit</h3>
        <InlineEdit value={val} onSave={async (v) => setVal(v)} />
      </div>
      <div>
        <h3 className="mb-2 font-semibold">Empty State</h3>
        <EmptyState title="No items found" description="Try adjusting your filters or create a new item." />
      </div>
    </div>
  );
}
