import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Re-implement the logic since we are running in Node
export const KEEP_UPPER = ['TNHH','CP','MTV','DNTN','HKD','B2B','ZNS','SGM','HD','BG','PT','KH','VAT','PO','PX','GH','CN','SS','DNB','KTTD','QH'];

export function squeezeSpaces(s?: string | null): string {
  if (!s) return '';
  return s.trim().replace(/\s+/g, ' ');
}

export function normalizeCode(s?: string | null): string {
  if (!s) return '';
  return s.trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeBusinessName(s?: string | null): string {
  if (!s) return '';
  const cleaned = squeezeSpaces(s);
  
  const words = cleaned.split(' ');
  const processed = words.map((word) => {
    if (!word) return '';
    let prefix = '';
    let suffix = '';
    let coreWord = word;
    
    const prefixMatch = coreWord.match(/^[^\p{L}\p{N}]+/u);
    if (prefixMatch) {
      prefix = prefixMatch[0];
      coreWord = coreWord.slice(prefix.length);
    }
    
    const suffixMatch = coreWord.match(/[^\p{L}\p{N}]+$/u);
    if (suffixMatch) {
      suffix = suffixMatch[0];
      coreWord = coreWord.slice(0, coreWord.length - suffix.length);
    }

    if (!coreWord) return prefix + suffix;

    const upperCore = coreWord.toUpperCase();
    if (KEEP_UPPER.includes(upperCore)) {
      return prefix + upperCore + suffix;
    }

    const firstChar = coreWord.charAt(0).toUpperCase();
    const rest = coreWord.slice(1).toLowerCase();
    return prefix + firstChar + rest + suffix;
  });

  return processed.join(' ');
}

export function normalizePersonName(s?: string | null): string {
  if (!s) return '';
  const cleaned = squeezeSpaces(s);
  
  const words = cleaned.split(' ');
  const processed = words.map((word) => {
    if (!word) return '';
    let prefix = '';
    let suffix = '';
    let coreWord = word;
    
    const prefixMatch = coreWord.match(/^[^\p{L}\p{N}]+/u);
    if (prefixMatch) {
      prefix = prefixMatch[0];
      coreWord = coreWord.slice(prefix.length);
    }
    
    const suffixMatch = coreWord.match(/[^\p{L}\p{N}]+$/u);
    if (suffixMatch) {
      suffix = suffixMatch[0];
      coreWord = coreWord.slice(0, coreWord.length - suffix.length);
    }

    if (!coreWord) return prefix + suffix;

    const firstChar = coreWord.charAt(0).toUpperCase();
    const rest = coreWord.slice(1).toLowerCase();
    return prefix + firstChar + rest + suffix;
  });

  return processed.join(' ');
}

async function run() {
  if (!getApps().length) {
    try {
      const credentials = JSON.parse(readFileSync(resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS || 'firebase-adminsdk.json'), 'utf8'));
      initializeApp({ credential: cert(credentials) });
    } catch {
       initializeApp({ credential: applicationDefault() });
    }
  }

  const db = getFirestore();
  const dryRun = false;
  console.log(`Starting normalizer sweep. Dry run: ${dryRun}`);

  const collections = ['customers', 'quotations', 'contracts', 'payments', 'deliveries'];

  for (const collectionName of collections) {
    console.log(`Processing collection: ${collectionName}...`);
    const snapshot = await db.collection(collectionName).get();
    let updatedCount = 0;
    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let needsUpdate = false;
      const updates: any = {};

      if (data.tenKhachHang) {
        const normalized = normalizeBusinessName(data.tenKhachHang);
        if (normalized !== data.tenKhachHang) {
          updates.tenKhachHang = normalized;
          needsUpdate = true;
        }
      }

      if (data.maKh) {
        const normalized = normalizeCode(data.maKh);
        if (normalized !== data.maKh) {
          updates.maKh = normalized;
          needsUpdate = true;
        }
      }

      if (data.nguoiDaiDien) {
        const normalized = normalizePersonName(data.nguoiDaiDien);
        if (normalized !== data.nguoiDaiDien) {
          updates.nguoiDaiDien = normalized;
          needsUpdate = true;
        }
      }
      
      if (data.contacts && Array.isArray(data.contacts)) {
        let contactsUpdated = false;
        const newContacts = data.contacts.map((c: any) => {
          if (c && c.nguoiDaiDien) {
            const normalized = normalizePersonName(c.nguoiDaiDien);
            if (normalized !== c.nguoiDaiDien) {
              contactsUpdated = true;
              return { ...c, nguoiDaiDien: normalized };
            }
          }
          return c;
        });
        if (contactsUpdated) {
          updates.contacts = newContacts;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        if (!dryRun) {
          batch.update(doc.ref, updates);
        } else {
          console.log(`[DRY RUN] Would update ${collectionName}/${doc.id}:`, updates);
        }
        updatedCount++;
      }
    }

    if (!dryRun && updatedCount > 0) {
      console.log(`Committing batch for ${collectionName}...`);
      await batch.commit();
      console.log(`Updated ${updatedCount} documents in ${collectionName}`);
    } else {
      console.log(`Finished ${collectionName}: ${updatedCount} needed updates.`);
    }
  }

  console.log('Sweep complete.');
}

run().catch(console.error);
