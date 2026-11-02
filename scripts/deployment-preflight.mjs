import { pathToFileURL } from "node:url";

const MIN_SECRET_LENGTH = 32;

function present(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateDatabaseUrl(value, errors, warnings) {
  if (!present(value)) {
    errors.push("DATABASE_URL is required.");
    return;
  }

  try {
    const parsed = new URL(value);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      errors.push("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
    }
    if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      errors.push("DATABASE_URL must not point to localhost for a remote deployment.");
    }
    if (!present(parsed.username) || !present(parsed.pathname.replace(/^\//, ""))) {
      errors.push("DATABASE_URL must include a database user and database name.");
    }
    const sslMode = parsed.searchParams.get("sslmode");
    if (!sslMode) {
      warnings.push("DATABASE_URL does not declare sslmode; confirm the provider enforces TLS.");
    } else if (["disable", "allow", "prefer"].includes(sslMode)) {
      errors.push("DATABASE_URL must require or verify TLS (sslmode=require or stronger).");
    }
  } catch {
    errors.push("DATABASE_URL is not a valid URL.");
  }
}

function validateSecret(name, value, errors) {
  if (!present(value)) {
    errors.push(`${name} is required.`);
  } else if (value.length < MIN_SECRET_LENGTH) {
    errors.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters.`);
  }
}

export function validateDeploymentEnv(env) {
  const errors = [];
  const warnings = [];
  const tier = env.DEPLOYMENT_TIER?.trim().toLowerCase();

  if (!['staging', 'production'].includes(tier)) {
    errors.push("DEPLOYMENT_TIER must be staging or production.");
  }
  validateDatabaseUrl(env.DATABASE_URL, errors, warnings);
  validateSecret("SESSION_SECRET", env.SESSION_SECRET, errors);
  validateSecret("CRON_SECRET", env.CRON_SECRET, errors);

  if (present(env.SESSION_SECRET) && env.SESSION_SECRET === env.CRON_SECRET) {
    errors.push("SESSION_SECRET and CRON_SECRET must be different values.");
  }

  const bucketConfigured = present(env.CREDENTIAL_STORAGE_BUCKET);
  if (tier === "production" && !bucketConfigured) {
    errors.push("CREDENTIAL_STORAGE_BUCKET is required for production hospital deployments.");
  } else if (tier === "staging" && !bucketConfigured) {
    warnings.push("Credential files will be stored in Postgres until CREDENTIAL_STORAGE_BUCKET is configured.");
  }
  if (bucketConfigured && !present(env.AWS_REGION)) {
    errors.push("AWS_REGION is required when CREDENTIAL_STORAGE_BUCKET is configured.");
  }

  return { errors, warnings };
}

function run() {
  const { errors, warnings } = validateDeploymentEnv(process.env);
  for (const warning of warnings) console.warn(`WARNING: ${warning}`);
  if (errors.length > 0) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    console.error(`Deployment preflight failed with ${errors.length} error(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Deployment preflight passed for ${process.env.DEPLOYMENT_TIER}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
