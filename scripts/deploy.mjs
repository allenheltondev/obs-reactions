#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Check for CI flag
const isCI = process.argv.includes('--ci');

function log(message, color = '\x1b[32m') {
  console.log(`${color}%s\x1b[0m`, message);
}

function error(message) {
  console.error('\x1b[31m%s\x1b[0m', message);
}

function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      stdio: 'inherit',
      cwd: projectRoot,
      ...options
    });
  } catch (err) {
    error(`Command failed: ${command}`);
    process.exit(1);
  }
}

function checkPrerequisites() {
  log('🔍 Checking prerequisites...');

  try {
    execSync('aws --version', { stdio: 'pipe' });
  } catch {
    error('❌ AWS CLI not found. Please install it first.');
    process.exit(1);
  }

  try {
    execSync('sam --version', { stdio: 'pipe' });
  } catch {
    error('❌ SAM CLI not found. Please install it first.');
    process.exit(1);
  }

  if (!existsSync(join(projectRoot, '.env'))) {
    error('❌ .env file not found. Please create it from .env.example');
    process.exit(1);
  }

  if (!existsSync(join(projectRoot, 'dist'))) {
    error('❌ dist folder not found. Please run "npm run build" first.');
    process.exit(1);
  }
}

function deployInfrastructure() {
  log('☁️ Deploying infrastructure...');

  const samConfigExists = existsSync(join(projectRoot, 'samconfig.toml'));

  // Build parameter overrides from environment variables
  const parameterOverrides = buildParameterOverrides();

  if (samConfigExists) {
    log('📋 Using existing samconfig.toml...');
    if (isCI) {
      const overrideFlag = parameterOverrides ? `--parameter-overrides "${parameterOverrides}"` : '';
      execCommand(`sam deploy --no-confirm-changeset ${overrideFlag}`);
    } else {
      const overrideFlag = parameterOverrides ? `--parameter-overrides "${parameterOverrides}"` : '';
      execCommand(`sam deploy ${overrideFlag}`);
    }
  } else {
    if (isCI) {
      log('📋 No samconfig.toml found, using defaults for CI...');
      const stackName = 'obs-reactions';
      const region = 'us-west-2';
      const overrideFlag = parameterOverrides ? `--parameter-overrides "${parameterOverrides}"` : '';
      execCommand(`sam deploy --stack-name ${stackName} --region ${region} --capabilities CAPABILITY_IAM --no-confirm-changeset --no-fail-on-empty-changeset ${overrideFlag}`);
    } else {
      log('📋 No samconfig.toml found, running guided setup...');
      execCommand('sam deploy --guided');
    }
  }
}

function buildParameterOverrides() {
  const overrides = [];

  // Add DNS parameters if they exist in environment
  if (process.env.DNS_HOSTED_ZONE_ID) {
    overrides.push(`HostedZoneId=${process.env.DNS_HOSTED_ZONE_ID}`);
  }

  if (process.env.DNS_DOMAIN_NAME) {
    overrides.push(`DomainName=${process.env.DNS_DOMAIN_NAME}`);
  }

  if (process.env.DNS_SUBDOMAIN) {
    overrides.push(`SubDomain=${process.env.DNS_SUBDOMAIN}`);
  }

  if (process.env.DNS_CERTIFICATE_ARN) {
    overrides.push(`CertificateArn=${process.env.DNS_CERTIFICATE_ARN}`);
  }

  return overrides.length > 0 ? overrides.join(' ') : null;
}

function getStackName() {
  const samConfigPath = join(projectRoot, 'samconfig.toml');

  if (existsSync(samConfigPath)) {
    try {
      const configContent = readFileSync(samConfigPath, 'utf8');
      const stackNameMatch = configContent.match(/stack_name\s*=\s*"([^"]+)"/);
      if (stackNameMatch) {
        return stackNameMatch[1];
      }
    } catch (err) {
      error('❌ Could not read samconfig.toml');
    }
  }

  return 'obs-reactions';
}

function getRegion() {
  const samConfigPath = join(projectRoot, 'samconfig.toml');

  if (existsSync(samConfigPath)) {
    try {
      const configContent = readFileSync(samConfigPath, 'utf8');
      const regionMatch = configContent.match(/region\s*=\s*"([^"]+)"/);
      if (regionMatch) {
        return regionMatch[1];
      }
    } catch (err) {
      error('❌ Could not read samconfig.toml');
    }
  }

  return 'us-west-2';
}

function getProfile() {
  if (isCI) {
    return null;
  }

  const samConfigPath = join(projectRoot, 'samconfig.toml');

  if (existsSync(samConfigPath)) {
    try {
      const configContent = readFileSync(samConfigPath, 'utf8');
      const profileMatch = configContent.match(/profile\s*=\s*"([^"]+)"/);
      if (profileMatch) {
        return profileMatch[1];
      }
    } catch (err) {
      error('❌ Could not read samconfig.toml');
    }
  }

  return null;
}

function getStackOutputs() {
  log('📤 Getting stack outputs...');

  const stackName = getStackName();
  const region = getRegion();
  const profile = getProfile();

  const profileFlag = profile ? `--profile ${profile}` : '';

  try {
    const outputs = execSync(
      `aws cloudformation describe-stacks --stack-name ${stackName} --region ${region} ${profileFlag} --query 'Stacks[0].Outputs' --output json`,
      { cwd: projectRoot, encoding: 'utf8' }
    );

    const parsedOutputs = JSON.parse(outputs);
    const result = {};

    if (parsedOutputs && Array.isArray(parsedOutputs) && parsedOutputs.length > 0) {
      parsedOutputs.forEach(output => {
        result[output.OutputKey] = output.OutputValue;
      });
      return result;
    } else {
      log('⚠️  No outputs in query result, trying alternative approach...');

      // Try getting the full stack description
      const fullStack = execSync(
        `aws cloudformation describe-stacks --stack-name ${stackName} --region ${region} ${profileFlag} --output json`,
        { cwd: projectRoot, encoding: 'utf8' }
      );

      const stackData = JSON.parse(fullStack);
      if (stackData.Stacks && stackData.Stacks[0] && stackData.Stacks[0].Outputs) {
        stackData.Stacks[0].Outputs.forEach(output => {
          result[output.OutputKey] = output.OutputValue;
        });
        return result;
      }
    }

    error('❌ Could not retrieve stack outputs');
    process.exit(1);

  } catch (err) {
    error(`❌ Failed to get stack outputs: ${err.message}`);
    process.exit(1);
  }
}

function uploadToS3(bucketName) {
  log('📁 Uploading files to S3...');

  const profile = getProfile();
  const profileFlag = profile ? `--profile ${profile}` : '';

  execCommand(`aws s3 sync dist/ s3://${bucketName}/ --delete --cache-control "public, max-age=31536000" --exclude "*.html" --exclude "*.json" ${profileFlag}`);

  execCommand(`aws s3 sync dist/ s3://${bucketName}/ --cache-control "public, max-age=0, must-revalidate" --include "*.html" --include "*.json" ${profileFlag}`);
}

function invalidateCloudFront(distributionId) {
  log('🔄 Invalidating CloudFront cache...');

  const profile = getProfile();
  const profileFlag = profile ? `--profile ${profile}` : '';

  execCommand(`aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*" ${profileFlag}`);
}

async function main() {
  try {
    log('🚀 Starting deployment...');

    checkPrerequisites();
    deployInfrastructure();

    const outputs = getStackOutputs();
    const bucketName = outputs.WebsiteBucketName;
    const distributionId = outputs.CloudFrontDistributionId;
    const websiteUrl = outputs.WebsiteURL;
    const customDomain = outputs.CustomDomainName;

    uploadToS3(bucketName);
    invalidateCloudFront(distributionId);

    log('✅ Deployment completed successfully!');
    log(`🌐 Website URL: ${websiteUrl}`);
    if (customDomain) {
      log(`🔗 Custom Domain: https://${customDomain}`);
    }
    log(`📊 CloudFront Distribution ID: ${distributionId}`);
    log(`🪣 S3 Bucket: ${bucketName}`);

  } catch (err) {
    error(`❌ Deployment failed: ${err.message}`);
    process.exit(1);
  }
}

main();
