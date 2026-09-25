import { SegmentedTabs } from '@/src/design-system';
import React, { useState } from 'react';
import { Clock, Activity, HardDrive } from 'lucide-react';
import CronPage from './CronPage';
import BackupPage from './BackupPage';
import SgmHaControlStudio from '../components/SgmHaControlStudio';
import JobMonitorPanel from '../components/JobMonitorPanel';

export default function SystemPage() {
  const [activeTab, setActiveTab] = useState<'cron' | 'performance' | 'backup'>('cron');

  const tabs = [
    { id: 'cron', label: 'Cron & Worker', icon: Clock },
    { id: 'performance', label: 'Hiệu năng & Đồng bộ', icon: Activity },
    { id: 'backup', label: 'Sao lưu & Dữ liệu', icon: HardDrive },
  ] as const;

  return (
    <div className="space-y-4">
      <SegmentedTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        type="line"
        size="md"
      />

      <div className="pt-2 animate-in fade-in duration-300">
        {activeTab === 'cron' && (
          <div className="space-y-4">
            <CronPage />
            <JobMonitorPanel />
          </div>
        )}
        {activeTab === 'performance' && <SgmHaControlStudio />}
        {activeTab === 'backup' && <BackupPage />}
      </div>
    </div>
  );
}
