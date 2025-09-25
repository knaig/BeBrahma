#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from both .env and .env.local
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local') });

console.log('🔍 Verifying BeBrahma testing setup...\n');

async function checkFile(filePath, description) {
  try {
    await fs.access(filePath);
    console.log(`✅ ${description}: ${filePath}`);
    return true;
  } catch (error) {
    console.log(`❌ ${description}: ${filePath} (missing)`);
    return false;
  }
}

async function checkDirectory(dirPath, description) {
  try {
    const stat = await fs.stat(dirPath);
    if (stat.isDirectory()) {
      console.log(`✅ ${description}: ${dirPath}`);
      return true;
    } else {
      console.log(`❌ ${description}: ${dirPath} (not a directory)`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: ${dirPath} (missing)`);
    return false;
  }
}

async function checkEnvironmentVariable(name, description) {
  if (process.env[name]) {
    console.log(`✅ ${description}: ${name}=${process.env[name]}`);
    return true;
  } else {
    console.log(`❌ ${description}: ${name} (not set)`);
    return false;
  }
}

async function checkPackageInstalled(packageName) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['list', packageName], { stdio: 'pipe' });
    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0 && output.includes(packageName)) {
        console.log(`✅ Package installed: ${packageName}`);
        resolve(true);
      } else {
        console.log(`❌ Package missing: ${packageName}`);
        resolve(false);
      }
    });
  });
}

async function checkPlaywrightBrowsers() {
  return new Promise((resolve) => {
    const child = spawn('npx', ['playwright', 'install', '--dry-run'], { stdio: 'pipe' });
    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      // Check if browsers are already installed
      if (output.includes('already installed') || output.includes('chromium') || code === 0) {
        console.log('✅ Playwright browsers: Installed');
        resolve(true);
      } else {
        console.log('❌ Playwright browsers: Not installed');
        console.log('   Run: npm run beb:install');
        resolve(false);
      }
    });
    
    child.on('error', (error) => {
      console.log('❌ Playwright browsers: Error checking -', error.message);
      resolve(false);
    });
  });
}

async function testMCPConnection() {
  console.log('🔌 Testing MCP connection...');
  
  // Check if MCP server can be started
  return new Promise((resolve) => {
    const child = spawn('npx', ['@playwright/mcp', '--help'], { 
      stdio: 'pipe',
      timeout: 10000 
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ MCP server: Available');
        resolve(true);
      } else {
        console.log('❌ MCP server: Not available');
        resolve(false);
      }
    });
    
    child.on('error', (error) => {
      console.log('❌ MCP server: Error -', error.message);
      resolve(false);
    });
  });
}

async function main() {
  console.log('📋 Checking required files...\n');
  
  let allGood = true;
  
  // Check core files
  allGood &= await checkFile(path.join(rootDir, '.env'), 'Environment file');
  allGood &= await checkFile(path.join(rootDir, '.cursor', 'mcp.json'), 'MCP configuration');
  allGood &= await checkFile(path.join(rootDir, '.bebrahma-tests', 'augment-runner.mjs'), 'Test runner');
  allGood &= await checkFile(path.join(rootDir, '.bebrahma-tests', 'personas.yaml'), 'Personas file');
  allGood &= await checkFile(path.join(rootDir, '.bebrahma-tests', 'founder-evaluator.prompt'), 'Evaluator prompt');
  allGood &= await checkFile(path.join(rootDir, '.bebrahma-tests', 'executor.task.md'), 'Executor task');
  allGood &= await checkFile(path.join(rootDir, '.bebrahma-tests', 'playwright.config.ts'), 'Playwright config');
  
  console.log('\n📁 Checking directories...\n');
  
  // Check directories
  allGood &= await checkDirectory(path.join(rootDir, 'reports'), 'Reports directory');
  allGood &= await checkDirectory(path.join(rootDir, 'scripts'), 'Scripts directory');
  
  console.log('\n📦 Checking packages...\n');
  
  // Check packages
  allGood &= await checkPackageInstalled('playwright');
  allGood &= await checkPackageInstalled('@playwright/mcp');
  allGood &= await checkPackageInstalled('dotenv');
  allGood &= await checkPackageInstalled('openai');
  allGood &= await checkPackageInstalled('pixelmatch');
  allGood &= await checkPackageInstalled('pngjs');
  
  console.log('\n🌐 Checking environment...\n');
  
  // Check environment variables
  const envPath = path.join(rootDir, '.env');
  try {
    const envContent = await fs.readFile(envPath, 'utf8');
    const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    for (const line of envLines) {
      const [key] = line.split('=');
      if (key && process.env[key]) {
        console.log(`✅ Environment variable: ${key}=${process.env[key].substring(0, 20)}...`);
      } else {
        console.log(`❌ Environment variable: ${key} (not set)`);
        allGood = false;
      }
    }
    
    // Check for required API key
    if (!process.env.OPENAI_API_KEY) {
      console.log(`❌ OPENAI_API_KEY is required for AI evaluation`);
      allGood = false;
    } else {
      console.log(`✅ OpenAI API key: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);
    }
  } catch (error) {
    console.log('❌ Could not read .env file');
    allGood = false;
  }
  
  console.log('\n🎭 Checking Playwright...\n');
  
  // Check Playwright
  allGood &= await checkPlaywrightBrowsers();
  allGood &= await testMCPConnection();
  
  console.log('\n' + '='.repeat(50));
  
  if (allGood) {
    console.log('🎉 All checks passed! Setup is complete.');
    console.log('\n📝 Next steps:');
    console.log('   1. Update .env with your actual test credentials');
    console.log('   2. Run: npm run beb:run');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed. Please fix the issues above.');
    process.exit(1);
  }
}

main().catch(console.error);
