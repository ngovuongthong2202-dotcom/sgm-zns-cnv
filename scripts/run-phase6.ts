import fetch from 'node-fetch';

async function main() {
  console.log('Running Phase 6 Migration (dryRun=true) again...');
  try {
    const res = await fetch('http://localhost:3000/api/migration/run-phase6', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ dryRun: true })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

main();
