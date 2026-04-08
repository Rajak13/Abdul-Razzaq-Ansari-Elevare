const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('test-report/results.json', 'utf8'));

// Collect all tests sorted by UT number
const allTests = [];
for (const suite of data.testResults) {
  const file = path.basename(suite.name, '.test.ts');
  for (const t of suite.assertionResults) {
    allTests.push({
      file,
      name: t.fullName,
      status: t.status,
      duration: t.duration || 0,
    });
  }
}

// Sort by UT number extracted from test name
allTests.sort((a, b) => {
  const numA = parseInt((a.name.match(/UT-(\d+)/) || [0, 9999])[1]);
  const numB = parseInt((b.name.match(/UT-(\d+)/) || [0, 9999])[1]);
  return numA - numB;
});

const passed = allTests.filter(t => t.status === 'passed').length;
const failed = allTests.filter(t => t.status === 'failed').length;
const total = allTests.length;
const duration = (data.testResults.reduce((s, r) => s + ((r.endTime - r.startTime) || 0), 0) / 1000).toFixed(2);

const rows = allTests.map(t => {
  const utMatch = t.name.match(/^(UT-\d+)/);
  const utId = utMatch ? utMatch[1] : '—';
  const desc = utMatch ? t.name.replace(/^UT-\d+:\s*/, '') : t.name;
  const statusClass = t.status === 'passed' ? 'pass' : 'fail';
  const statusLabel = t.status === 'passed' ? '✓ PASS' : '✗ FAIL';
  return `
    <tr>
      <td class="id">${utId}</td>
      <td class="desc">${desc}</td>
      <td class="module">${t.file}</td>
      <td class="duration">${t.duration}ms</td>
      <td class="status ${statusClass}">${statusLabel}</td>
    </tr>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Elevare – Unit Test Results</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; color: #1a1a2e; }
    header { background: #1a1a2e; color: #fff; padding: 28px 40px; }
    header h1 { font-size: 22px; font-weight: 600; letter-spacing: 0.3px; }
    header p { font-size: 13px; color: #aab; margin-top: 4px; }
    .summary { display: flex; gap: 16px; padding: 24px 40px; }
    .card { background: #fff; border-radius: 8px; padding: 18px 24px; flex: 1; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .card .num { font-size: 32px; font-weight: 700; }
    .card .label { font-size: 12px; color: #888; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    .card.green .num { color: #16a34a; }
    .card.red .num { color: #dc2626; }
    .card.blue .num { color: #2563eb; }
    .card.gray .num { color: #555; }
    .table-wrap { margin: 0 40px 40px; background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    thead { background: #1a1a2e; color: #fff; }
    thead th { padding: 12px 16px; text-align: left; font-weight: 500; font-size: 12px; letter-spacing: 0.4px; text-transform: uppercase; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr:hover { background: #eef2ff; }
    td { padding: 10px 16px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    td.id { font-weight: 700; color: #2563eb; white-space: nowrap; width: 80px; }
    td.module { color: #666; font-size: 12px; white-space: nowrap; }
    td.duration { color: #999; font-size: 12px; white-space: nowrap; text-align: right; width: 80px; }
    td.status { font-weight: 600; white-space: nowrap; width: 90px; text-align: center; }
    td.status.pass { color: #16a34a; }
    td.status.fail { color: #dc2626; }
    .generated { text-align: center; padding: 16px; font-size: 12px; color: #aaa; }
  </style>
</head>
<body>
  <header>
    <h1>Elevare – Unit Test Results</h1>
    <p>Backend Service Layer · Jest · ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</p>
  </header>
  <div class="summary">
    <div class="card blue"><div class="num">${total}</div><div class="label">Total Tests</div></div>
    <div class="card green"><div class="num">${passed}</div><div class="label">Passed</div></div>
    <div class="card red"><div class="num">${failed}</div><div class="label">Failed</div></div>
    <div class="card gray"><div class="num">${duration}s</div><div class="label">Duration</div></div>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Test ID</th>
          <th>Description</th>
          <th>Module</th>
          <th style="text-align:right">Duration</th>
          <th style="text-align:center">Result</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <p class="generated">Generated ${new Date().toISOString()}</p>
</body>
</html>`;

fs.writeFileSync('test-report/index.html', html);
console.log(`Report written to test-report/index.html (${total} tests, ${passed} passed)`);
