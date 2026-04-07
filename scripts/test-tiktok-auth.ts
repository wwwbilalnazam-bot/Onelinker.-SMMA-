#!/usr/bin/env node

/**
 * TikTok Authentication Diagnostic Script
 *
 * Tests:
 * 1. Environment variables
 * 2. OAuth URL generation with PKCE
 * 3. State parameter encoding/decoding
 * 4. Redirect URI validation
 * 5. Database connectivity
 */

import { getTikTokClientKey, getTikTokClientSecret } from '../lib/tiktok/client';
import { buildTikTokOAuthUrl, decodeState } from '../lib/tiktok/accounts';
import { createServiceClient } from '../lib/supabase/server';

const prefix = '[\x1b[36mTikTok Auth Test\x1b[0m]';

async function runTests() {
  let passed = 0;
  let failed = 0;

  console.log(`${prefix} Starting diagnostic tests...\n`);

  // Test 1: Environment Variables
  console.log(`${prefix} Test 1: Environment Variables`);
  try {
    const clientKey = getTikTokClientKey();
    const clientSecret = getTikTokClientSecret();
    console.log(`  ✓ TIKTOK_CLIENT_KEY present: ${clientKey.substring(0, 5)}...`);
    console.log(`  ✓ TIKTOK_CLIENT_SECRET present: ${clientSecret.substring(0, 5)}...`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
  console.log();

  // Test 2: OAuth URL Generation
  console.log(`${prefix} Test 2: OAuth URL Generation`);
  try {
    const testWorkspaceId = 'test-workspace-' + Date.now();
    const testRedirectUri = 'http://localhost:3002/auth/tiktok/callback';

    const { url: oauthUrl, codeVerifier } = await buildTikTokOAuthUrl({
      redirectUri: testRedirectUri,
      workspaceId: testWorkspaceId,
    });

    console.log(`  ✓ OAuth URL generated: ${oauthUrl.substring(0, 80)}...`);
    console.log(`  ✓ Code verifier generated: ${codeVerifier.substring(0, 10)}...`);

    // Check URL components
    const urlObj = new URL(oauthUrl);
    const checks = {
      'client_key param': urlObj.searchParams.has('client_key'),
      'redirect_uri param': urlObj.searchParams.has('redirect_uri'),
      'scope param': urlObj.searchParams.has('scope'),
      'state param': urlObj.searchParams.has('state'),
      'code_challenge param': urlObj.searchParams.has('code_challenge'),
      'PKCE enabled': urlObj.searchParams.has('code_challenge_method'),
    };

    for (const [name, present] of Object.entries(checks)) {
      console.log(`  ${present ? '✓' : '✗'} ${name}: ${present ? 'Yes' : 'No'}`);
      if (!present) failed++;
      if (present) passed++;
    }

    // Test state decoding
    const state = urlObj.searchParams.get('state');
    if (state) {
      try {
        const decoded = decodeState(state);
        console.log(`  ✓ State parameter decodable`);
        console.log(`    - Workspace ID: ${decoded.workspaceId}`);
        console.log(`    - Platform: ${decoded.platform}`);
        console.log(`    - PKCE included: ${!!decoded.codeVerifier}`);
        passed++;
      } catch (err) {
        console.log(`  ✗ State decode failed: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
    }
  } catch (err) {
    console.log(`  ✗ ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
  console.log();

  // Test 3: Redirect URI Validation
  console.log(`${prefix} Test 3: Redirect URI Validation`);
  try {
    const testUris = [
      'http://localhost:3002/auth/tiktok/callback',
      'https://xxxx-xxx-xxx.ngrok.io/auth/tiktok/callback',
      'https://yourdomain.com/auth/tiktok/callback',
    ];

    for (const uri of testUris) {
      try {
        new URL(uri);
        console.log(`  ✓ Valid URI: ${uri}`);
        passed++;
      } catch {
        console.log(`  ✗ Invalid URI: ${uri}`);
        failed++;
      }
    }
  } catch (err) {
    console.log(`  ✗ ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
  console.log();

  // Test 4: Database Connectivity
  console.log(`${prefix} Test 4: Database Connectivity`);
  try {
    const serviceClient = createServiceClient();

    const { error: accountsError } = await serviceClient
      .from('social_accounts')
      .select('count')
      .limit(1);

    if (accountsError) {
      console.log(`  ✗ social_accounts table: ${accountsError.message}`);
      failed++;
    } else {
      console.log(`  ✓ social_accounts table: accessible`);
      passed++;
    }

    const { error: tokensError } = await serviceClient
      .from('tiktok_tokens')
      .select('count')
      .limit(1);

    if (tokensError) {
      console.log(`  ✗ tiktok_tokens table: ${tokensError.message}`);
      failed++;
    } else {
      console.log(`  ✓ tiktok_tokens table: accessible`);
      passed++;
    }
  } catch (err) {
    console.log(`  ✗ ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
  console.log();

  // Summary
  const total = passed + failed;
  const percentage = Math.round((passed / total) * 100);
  const status = failed === 0 ? '\x1b[32m✓ PASS\x1b[0m' : '\x1b[31m✗ FAIL\x1b[0m';

  console.log(`${prefix} Test Summary: ${status}`);
  console.log(`  Passed: ${passed}/${total} (${percentage}%)`);
  if (failed > 0) {
    console.log(`  Failed: ${failed}/${total}`);
  }
  console.log();

  if (failed > 0) {
    console.log(`${prefix} \x1b[33mFix errors above before testing with ngrok\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`${prefix} \x1b[32mAll tests passed! Ready for ngrok testing\x1b[0m`);
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error(`${prefix} Unexpected error:`, err);
  process.exit(1);
});
