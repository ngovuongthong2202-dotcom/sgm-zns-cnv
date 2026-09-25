import { z } from 'zod';
import { settingsRepo } from '@/src/data/repositories/system.repo';

export const savedViewSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  sourceId: z.string(),
  isDefault: z.boolean().optional(),
  state: z.object({
    columnVisibility: z.record(z.string(), z.boolean()).optional(),
    columnSizing: z.record(z.string(), z.number()).optional(),
    columnOrder: z.array(z.string()).optional(),
    sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).optional(),
    grouping: z.array(z.string()).optional(),
    columnFilters: z.array(z.object({
      id: z.string(),
      value: z.any()
    })).optional(),
    filters: z.array(z.object({
      id: z.string(),
      value: z.any(),
      operator: z.string().optional()
    })).optional(),
    density: z.enum(['compact', 'normal', 'comfortable']).optional(),
    viewType: z.enum(['table', 'board', 'kanban', 'calendar', 'calendar-week', 'list']).optional(),
  })
});

export type SavedView = z.infer<typeof savedViewSchema>;

export async function getSavedViews(uid: string, route?: string): Promise<SavedView[]> {
  if (!uid) return [];
  const views: SavedView[] = [];

  // Add Org Template first from local storage / remote settings
  if (route) {
    try {
      let data: any = null;
      try {
        const remoteSettings = await settingsRepo.getById('org_dataview_templates');
        if (remoteSettings && (remoteSettings as any)[route]) {
          data = (remoteSettings as any)[route];
          localStorage.setItem(`dataview:${route}:org_template`, JSON.stringify(data));
        }
      } catch {
        // ignore
      }

      if (!data) {
        const orgStr = localStorage.getItem(`dataview:${route}:org_template`);
        if (orgStr) {
          data = JSON.parse(orgStr);
        }
      }

      if (data && data.state) {
        views.push({
          id: '__org_template__',
          name: data.isForced ? '★ Mặc định tổ chức (Bắt buộc)' : '★ Giao diện tổ chức',
          sourceId: data.sourceId || `${route}_list`,
          state: data.state,
          isDefault: data.isForced || false
        });
      }
    } catch {
      // Ignore parse errors
    }
  }

  const storageKey = route ? `dataview:${route}:saved_views` : `dataview:global:saved_views`;
  try {
    const savedStr = localStorage.getItem(storageKey);
    if (savedStr) {
      const parsed = JSON.parse(savedStr);
      if (Array.isArray(parsed)) {
        parsed.forEach((data: any) => {
          const result = savedViewSchema.safeParse(data);
          if (result.success) views.push(result.data as SavedView);
        });
      }
    }
  } catch {
    // Ignore parse errors
  }

  return views;
}

export async function saveView(uid: string, view: SavedView, route?: string): Promise<void> {
  if (!uid) return;
  const validated = savedViewSchema.parse(view);
  const storageKey = route ? `dataview:${route}:saved_views` : `dataview:global:saved_views`;
  const viewId = validated.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `view_${Math.random().toString(36).substring(2, 9)}`);
  const newView: SavedView = { ...validated, id: viewId };
  
  const existing = await getSavedViews(uid, route);
  const updated = [...existing.filter(v => v.id !== viewId && v.id !== '__org_template__'), newView];
  localStorage.setItem(storageKey, JSON.stringify(updated));
}

export async function deleteView(uid: string, viewId: string, route?: string): Promise<void> {
  if (!uid || !viewId || viewId === '__org_template__') return;
  const storageKey = route ? `dataview:${route}:saved_views` : `dataview:global:saved_views`;
  const existing = await getSavedViews(uid, route);
  const updated = existing.filter(v => v.id !== viewId && v.id !== '__org_template__');
  localStorage.setItem(storageKey, JSON.stringify(updated));
}

export async function saveOrgTemplate(route: string, viewState: any, sourceId: string, isForced: boolean): Promise<void> {
  const data = {
    state: viewState,
    sourceId,
    isForced,
    updatedAt: Date.now()
  };
  localStorage.setItem(`dataview:${route}:org_template`, JSON.stringify(data));
  try {
    const existing = await settingsRepo.getById('org_dataview_templates') || {};
    await settingsRepo.update('org_dataview_templates', {
      ...existing,
      [route]: data
    });
  } catch (err) {
    console.warn('Failed to sync org template to settingsRepo', err);
  }
}
