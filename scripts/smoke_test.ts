import http from 'http';

/**
 * Smoke test for ZNS-SGM deployment.
 * Needs to run against LOCAL server by default, but can be configured via BASE_URL.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function fetchUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 400) {
                return reject(new Error(`Failed with status code: ${res.statusCode}`));
            }
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data);
            });
        });
        req.on('error', reject);
        
        // Timeout
        req.setTimeout(5000, () => {
            req.abort();
            reject(new Error('Request Timeout'));
        });
    });
}

async function run() {
    console.log(`🚀 Starting smoke tests against ${BASE_URL}\n`);
    
    const endpoints = [
        { path: '/api/health', expectedContains: '"status":"ok"' }
    ];

    let allPassed = true;

    for (const ep of endpoints) {
        const fullUrl = `${BASE_URL}${ep.path}`;
        process.stdout.write(`Testing [GET] ${ep.path}... `);
        try {
            const result = await fetchUrl(fullUrl);
            if (result.includes(ep.expectedContains)) {
                console.log('✅ PASSED');
            } else {
                console.log('❌ FAILED (Response did not contain expected data)');
                console.log(`Response: ${result.substring(0, 100)}...`);
                allPassed = false;
            }
        } catch (e: any) {
            console.log(`❌ FAILED (${e.message})`);
            allPassed = false;
        }
    }

    if (!allPassed) {
        console.error('\n💥 SMOKE TESTS FAILED! Investigate the backend logs. DO NOT PROCEED WITH DEPLOYMENT.');
        process.exit(1);
    } else {
        console.log('\n🎉 ALL SMOKE TESTS PASSED! System is healthy.');
        process.exit(0);
    }
}

run();
