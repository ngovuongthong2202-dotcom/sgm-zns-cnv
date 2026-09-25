import autocannon from 'autocannon';

async function runLoadTest() {
  console.log('Starting Load Test on Port 3000...');
  
  const options = {
    url: 'http://localhost:3000/api/analytics/today',
    connections: 10,
    pipelining: 1,
    duration: 10, 
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const instance = autocannon(options);
  
  autocannon.track(instance, {
    renderProgressBar: true,
    renderLatencyTable: true
  });
  
  instance.on('done', (result: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.log('\n--- Load Test Results ---');
    console.log(`Requests/sec: ${result.requests.average}`);
    console.log(`Latency p97.5: ${result.latency?.p97_5 || 'unknown'} ms`);
    console.log(`Errors: ${result.errors}`);
    console.log(`Timeouts: ${result.timeouts}`);
    console.log('-------------------------\n');
    
    if (result.latency?.p97_5 && result.latency.p97_5 > 500) {
      console.warn('⚠️ WARNING: latency exceeded 500ms target.');
    } else {
      console.log('✅ Load test passed performance budget.');
    }
    
    if (result.errors > 0 || result.timeouts > 0) {
      console.error('❌ Errors/Timeouts occurred during the test.');
      process.exit(1);
    }
    
    process.exit(0);
  });
}

runLoadTest().catch(err => {
  console.error(err);
  process.exit(1);
});
