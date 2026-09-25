import { useEffect } from 'react';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { logger } from '@/src/shared/lib/logger';
import { repositoryFactory } from '@/src/data/repositories/factory';

export function useQuotationMigration(quotations: Quotation[], updateQuotation: (id: string, data: Partial<Quotation>) => Promise<void>) {
  useEffect(() => {
    const runMigration = async () => {
      if (localStorage.getItem('MIGRATED_BGT_SO_PHIEU_FINAL')) return;
      
      const toMigrate = quotations.filter(q => q.soPhieuBaoGia?.startsWith('BGT')).sort((a,b) => (a.ngayBaoGia || '').localeCompare(b.ngayBaoGia || ''));
      if (toMigrate.length === 0) {
          if (quotations.length > 0) localStorage.setItem('MIGRATED_BGT_SO_PHIEU_FINAL', 'true');
          return;
      }

      logger.info('Starting BGT Migration...', toMigrate.length);
      const contracts = await repositoryFactory.get<any>('contracts').list({ limit: 1000 });

      let count = 0;
      for (const q of toMigrate) {
        const loai = q.loai || 'BG Máy';
        const normalizedLoai = normalizeLoai(loai);
        let prefix = '';
        if (normalizedLoai === QUOTATION_LOAI.MAY) prefix = 'BGM-';
        else if (normalizedLoai === QUOTATION_LOAI.VAT_TU) prefix = 'BGVT-';
        else if (normalizedLoai === QUOTATION_LOAI.DICH_VU) prefix = 'BGDV-';
        else prefix = 'BGM-';

        const matchingIds = quotations
          .map(qt => qt.soPhieuBaoGia || '')
          .filter(v => v.startsWith(prefix))
          .map(v => parseInt(v.replace(prefix, ''), 10))
          .filter(n => !isNaN(n));
          
        const max = matchingIds.length > 0 ? Math.max(...matchingIds) : 0;
        const nextId = prefix + String(max + 1).padStart(3, '0');
        q.soPhieuBaoGia = nextId; 
        
        try {
          await updateQuotation(q.id!, { soPhieuBaoGia: nextId });
          const linkedContracts = contracts.filter((c: any) => c.quotationId === q.id);
          for (const c of linkedContracts) {
            if (c.id) {
               await repositoryFactory.get('contracts').update(c.id, { soPhieuBaoGia: nextId });
            }
          }
          logger.info(`Migrated ${q.id} to ${nextId} with ${linkedContracts.length} contracts`);
          count++;
        } catch (e) {
          logger.error(`Failed to migrate ${q.id}`, e);
        }
      }
      
      localStorage.setItem('MIGRATED_BGT_SO_PHIEU_FINAL', 'true');
      logger.info(`Migration complete: ${count}`);
    };
    
    if (quotations.length > 0) {
      runMigration();
    }
  }, [quotations, updateQuotation]);
}
