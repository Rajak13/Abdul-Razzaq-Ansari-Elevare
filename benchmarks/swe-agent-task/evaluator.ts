import { runRateLimiterTestSuite } from './tests/rateLimiter.test.ts';
import type { TestResult } from './tests/rateLimiter.test.ts';
import * as fs from 'fs';
import * as path from 'path';

interface TaskSpec {
  instance_id: string;
  repo: string;
  version: string;
  problem_statement: string;
  PASS_TO_PASS: string[];
  FAIL_TO_PASS: string[];
}

interface EvaluationReport {
  instance_id: string;
  timestamp: string;
  status: 'RESOLVED' | 'UNRESOLVED' | 'REGRESSION';
  reward: number; // Binary reward: 1.0 or 0.0
  dense_reward: number; // Ratio: passed / total
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  pass_to_pass_summary: {
    total: number;
    passed: number;
    failed: number;
  };
  fail_to_pass_summary: {
    total: number;
    passed: number;
    failed: number;
  };
  detailed_results: TestResult[];
}

async function runEvaluation() {
  console.log('\n=============================================================');
  console.log('🤖 SWE-BENCH AGENT EVALUATION HARNESS: RUNNING ASSESSMENT');
  console.log('=============================================================\n');

  // 1. Load Task Specification
  const specPath = path.join(import.meta.dirname, 'task_spec.json');
  const taskSpec: TaskSpec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

  console.log(`📋 Task Instance: ${taskSpec.instance_id}`);
  console.log(`📦 Target Repo:   ${taskSpec.repo} (v${taskSpec.version})`);
  console.log(`🧪 Test Harness:  SQLite3 + TypeScript Evaluation Engine\n`);

  const startTime = Date.now();
  const testResults = await runRateLimiterTestSuite();
  const durationMs = Date.now() - startTime;

  // 2. Aggregate Results
  const passToPassResults = testResults.filter((r) => r.type === 'PASS_TO_PASS');
  const failToPassResults = testResults.filter((r) => r.type === 'FAIL_TO_PASS');

  const p2pPassed = passToPassResults.filter((r) => r.passed).length;
  const f2pPassed = failToPassResults.filter((r) => r.passed).length;

  const allPassed = testResults.every((r) => r.passed);
  const hasRegressions = p2pPassed < passToPassResults.length;

  // Calculate RL Rewards
  const binaryReward = allPassed ? 1.0 : 0.0;
  const denseReward = Number((testResults.filter((r) => r.passed).length / testResults.length).toFixed(4));

  let status: 'RESOLVED' | 'UNRESOLVED' | 'REGRESSION' = 'UNRESOLVED';
  if (allPassed) {
    status = 'RESOLVED';
  } else if (hasRegressions) {
    status = 'REGRESSION';
  }

  // 3. Print Pretty Terminal Output
  console.log('--- [PASS_TO_PASS REGRESSION SUITE] ---');
  for (const r of passToPassResults) {
    const symbol = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${symbol} | ${r.name} (${r.durationMs}ms)`);
    if (r.error) console.log(`     ↳ Error: ${r.error}`);
  }

  console.log('\n--- [FAIL_TO_PASS FEATURE/FIX SUITE] ---');
  for (const r of failToPassResults) {
    const symbol = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${symbol} | ${r.name} (${r.durationMs}ms)`);
    if (r.error) console.log(`     ↳ Error: ${r.error}`);
  }

  console.log('\n-------------------------------------------------------------');
  console.log(`🎯 OVERALL STATUS: ${status === 'RESOLVED' ? '🌟 RESOLVED (SUCCESS)' : '❌ UNRESOLVED'}`);
  console.log(`🏆 RL BINARY REWARD: ${binaryReward.toFixed(1)} / 1.0`);
  console.log(`📊 DENSE REWARD:    ${(denseReward * 100).toFixed(1)}% (${testResults.filter((r) => r.passed).length}/${testResults.length} passed)`);
  console.log(`⏱️ EXECUTION TIME:  ${durationMs}ms`);
  console.log('-------------------------------------------------------------\n');

  // 4. Save Structured JSON Telemetry Report
  const report: EvaluationReport = {
    instance_id: taskSpec.instance_id,
    timestamp: new Date().toISOString(),
    status,
    reward: binaryReward,
    dense_reward: denseReward,
    total_tests: testResults.length,
    passed_tests: testResults.filter((r) => r.passed).length,
    failed_tests: testResults.filter((r) => !r.passed).length,
    pass_to_pass_summary: {
      total: passToPassResults.length,
      passed: p2pPassed,
      failed: passToPassResults.length - p2pPassed,
    },
    fail_to_pass_summary: {
      total: failToPassResults.length,
      passed: f2pPassed,
      failed: failToPassResults.length - f2pPassed,
    },
    detailed_results: testResults,
  };

  const reportPath = path.join(import.meta.dirname, 'evaluation_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📁 Machine-readable telemetry saved to: ${reportPath}\n`);

  process.exit(allPassed ? 0 : 1);
}

runEvaluation().catch((err) => {
  console.error('Fatal Evaluation Harness Error:', err);
  process.exit(1);
});
