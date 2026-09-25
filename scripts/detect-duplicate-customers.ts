import { adminDb } from '../src/backend/config/firebase.admin';
import { FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';

// Zod schema imports if needed or we can just use any
// We'll reimplement normalize functions or import them if ts-node works

const KEEP_UPPER = ['TNHH','CP','MTV','DNTN','HKD','B2B','ZNS','SGM','HD','BG','PT','KH','VAT','PO','PX','GH','CN','SS','DNB','KTTD','QH'];

function squeezeSpaces(s?: string | null): string {
  if (!s) return '';
  return s.trim().replace(/\s+/g, ' ');
}

function normalizeCode(s?: string | null): string {
  if (!s) return '';
  return s.trim().toUpperCase().replace(/\s+/g, '');
}

function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[\s.()]/g, '').replace(/-/g, '');
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length > 9) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned.replace(/\D/g, '');
}

function normalizeBusinessName(s?: string | null): string {
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

export async function detectDuplicates(dryRun: boolean = true) {
  const db = adminDb;
  console.log(`Starting Duplicate Detection. Dry run: ${dryRun}`);

  const snapshot = await db.collection('customers').get();
  
  const phoneMap = new Map<string, any[]>();
  const maKhMap = new Map<string, any[]>();
  const nameMap = new Map<string, any[]>();

  const allCustomers: any[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Skip already merged or deleted
    if (data.mergedInto || data.deletedAt || data.isArchived) {
      continue;
    }
    const customer = { id: doc.id, ...data };
    allCustomers.push(customer);

    // Index by phone
    if (customer.sdt) {
      const normalizedPhone = normalizePhoneNumber(customer.sdt);
      if (normalizedPhone) {
        const existing = phoneMap.get(normalizedPhone) || [];
        existing.push(customer);
        phoneMap.set(normalizedPhone, existing);
      }
    }

    // Index by maKh
    if (customer.maKh) {
      const normalizedCode = normalizeCode(customer.maKh);
      if (normalizedCode) {
        const existing = maKhMap.get(normalizedCode) || [];
        existing.push(customer);
        maKhMap.set(normalizedCode, existing);
      }
    }

    // Index by name
    if (customer.tenKhachHang) {
      const normalizedName = normalizeBusinessName(customer.tenKhachHang);
      if (normalizedName) {
        const existing = nameMap.get(normalizedName) || [];
        existing.push(customer);
        nameMap.set(normalizedName, existing);
      }
    }
  }

  let suspectCount = 0;
  const processedPairs = new Set<string>();

  function logSuspects(reason: string, items: any[]) {
    if (items.length < 2) return;
    
    // Sort by id to create a stable pair key
    const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
    const pairKey = sorted.map(i => i.id).join('-');
    if (processedPairs.has(pairKey)) return;
    processedPairs.add(pairKey);

    suspectCount++;
    console.log(`[SUSPECT DUPLICATES] Reason: ${reason}`);
    sorted.forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id} | Mã KH: ${item.maKh} | Tên KH: ${item.tenKhachHang} | SĐT: ${item.sdt}`);
    });
    console.log('---');
  }

  for (const [phone, items] of phoneMap.entries()) {
    if (items.length > 1) logSuspects(`Same phone number: ${phone}`, items);
  }

  for (const [code, items] of maKhMap.entries()) {
    if (items.length > 1) logSuspects(`Same Mã KH: ${code}`, items);
  }

  for (const [name, items] of nameMap.entries()) {
    if (items.length > 1) logSuspects(`Same Business Name: ${name}`, items);
  }

  console.log(`Total unique suspect groups found: ${suspectCount}`);
}

/**
 * Safe merge function
 * @param primaryId The ID of the customer to keep
 * @param secondaryId The ID of the customer to merge and archive
 */
export async function safeMergeCustomers(primaryId: string, secondaryId: string) {
  if (!primaryId || !secondaryId || primaryId === secondaryId) {
    throw new Error("Invalid primary or secondary ID (cannot be the same or empty).");
  }

  const db = adminDb;
  const primaryRef = db.collection('customers').doc(primaryId);
  const secondaryRef = db.collection('customers').doc(secondaryId);

  // We cannot query related documents inside a normal transaction easily when there are many,
  // but since it's just a few related records, we can query them first, then run a transaction or batch.
  // Given potential doc count over 500, let's just use batched writes without strict transaction,
  // or a transaction that updates everything.
  
  const relatedCollections = ['quotations', 'contracts', 'payments', 'deliveries'];
  const relatedDocsToUpdate: { ref: any; collection: string; data: any }[] = [];

  for (const coll of relatedCollections) {
    const snapshot = await db.collection(coll).where('customerId', '==', secondaryId).get();
    for (const doc of snapshot.docs) {
      relatedDocsToUpdate.push({ ref: doc.ref, collection: coll, data: doc.data() });
    }
  }

  await db.runTransaction(async (t) => {
    const primaryDoc = await t.get(primaryRef);
    const secondaryDoc = await t.get(secondaryRef);

    if (!primaryDoc.exists) {
      throw new Error(`Primary customer ${primaryId} does not exist.`);
    }
    if (!secondaryDoc.exists) {
      throw new Error(`Secondary customer ${secondaryId} does not exist.`);
    }

    const secData = secondaryDoc.data() || {};
    const priData = primaryDoc.data() || {};
    if (secData.mergedInto) {
      throw new Error(`Secondary customer ${secondaryId} is already merged into ${secData.mergedInto}. Cannot merge again.`);
    }

    const now = new Date().toISOString();

    // Gather contacts
    const primaryContacts: any[] = Array.isArray(priData.contacts) ? priData.contacts : [];
    const secondaryContacts: any[] = Array.isArray(secData.contacts) ? secData.contacts : [];
    
    if (secData.nguoiDaiDien && secData.sdt) {
      // Add the main representative as a contact if not already
      secondaryContacts.push({
        nguoiDaiDien: secData.nguoiDaiDien,
        sdt: secData.sdt,
        chucVu: '',
        email: '',
        chiNhanh: ''
      });
    }

    // Merge contacts, filtering out duplicates
    const finalContacts = [...primaryContacts];
    for (const c of secondaryContacts) {
      if (!c.sdt) continue;
      const exists = finalContacts.find(fc => fc.sdt === c.sdt);
      if (!exists) {
        finalContacts.push(c);
      }
    }

    // 1. Mark secondary as merged and archived
    t.update(secondaryRef, {
      mergedInto: primaryId,
      isArchived: true,
      updatedAt: now,
      logTomTat: `Merged into ${primaryId} on ${now}\n` + (secData.logTomTat || ''),
    });

    // 2. Audit log for secondary
    const secAuditRef = secondaryRef.collection('auditLogs').doc();
    t.set(secAuditRef, {
      action: 'MERGED',
      timestamp: FieldValue.serverTimestamp(),
      performedBy: 'system_migration_script',
      details: `Customer merged into ${primaryId}`,
    });

    // 3. Update primary with new contacts
    t.update(primaryRef, {
      contacts: finalContacts,
      updatedAt: now,
      logTomTat: `Received merge from ${secondaryId} on ${now}\n` + (priData.logTomTat || ''),
    });

    // 4. Audit log for primary
    const priAuditRef = primaryRef.collection('auditLogs').doc();
    t.set(priAuditRef, {
      action: 'MERGE_RECEIVED',
      timestamp: FieldValue.serverTimestamp(),
      performedBy: 'system_migration_script',
      details: `Customer received merge from ${secondaryId}`,
    });

    // 5. Update related documents
    for (const item of relatedDocsToUpdate) {
      t.update(item.ref, {
        customerId: primaryId,
        updatedAt: now,
        // Optional: depending on needs, you might want to sync maKh, tenKhachHang, etc. 
        // But we'll just update customerId to preserve historical snapshot data
      });
    }
  });

  console.log(`Successfully merged ${secondaryId} into ${primaryId}.`);
  console.log(`Updated ${relatedDocsToUpdate.length} related documents.`);
}

import { fileURLToPath } from 'url';

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const args = process.argv.slice(2);
  const isMerge = args[0] === '--merge';
  
  if (isMerge) {
    const primaryId = args[1];
    const secondaryId = args[2];
    if (!primaryId || !secondaryId) {
      console.error("Usage for merge: tsx scripts/detect-duplicate-customers.ts --merge <primaryId> <secondaryId>");
      process.exit(1);
    }
    safeMergeCustomers(primaryId, secondaryId).catch(console.error);
  } else {
    // Default is dry run detect
    detectDuplicates(true).catch(console.error);
  }
}
