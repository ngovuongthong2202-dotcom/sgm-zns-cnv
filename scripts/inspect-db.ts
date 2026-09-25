import { adminDb as db } from '../src/backend/config/firebase.admin';

async function run() {
  console.log("=== CUSTOMERS ===");
  const customers = await db.collection('customers').limit(2).get();
  customers.forEach(doc => console.log(doc.id, JSON.stringify(doc.data(), null, 2)));

  console.log("\n=== QUOTATIONS ===");
  const quotes = await db.collection('quotations').limit(2).get();
  quotes.forEach(doc => console.log(doc.id, JSON.stringify(doc.data(), null, 2)));

  console.log("\n=== CONTRACTS ===");
  const contracts = await db.collection('contracts').limit(2).get();
  contracts.forEach(doc => console.log(doc.id, JSON.stringify(doc.data(), null, 2)));
}

run().catch(console.error);
