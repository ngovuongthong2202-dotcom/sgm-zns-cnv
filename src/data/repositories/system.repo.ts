import { BaseRepository } from './base.repo';

export const auditLogsRepo = new BaseRepository<Record<string, unknown>>('auditLogs');
export const znsMessagesRepo = new BaseRepository<Record<string, unknown>>('znsMessages');
export const notificationsRepo = new BaseRepository<Record<string, unknown>>('notifications');
export const systemLocksRepo = new BaseRepository<Record<string, unknown>>('systemLocks');
export const presenceRepo = new BaseRepository<Record<string, unknown>>('presence');
export const settingsRepo = new BaseRepository<Record<string, unknown>>('settings');
