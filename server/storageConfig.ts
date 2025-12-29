/**
 * Centralized storage configuration for multi-environment bucket support.
 * Selects appropriate bucket and credentials based on NODE_ENV.
 */
import { Storage } from "@google-cloud/storage";
import fs from "fs";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// Environment detection
const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
const isProduction = nodeEnv === "production";
const isDevelopment = nodeEnv === "development";

// Bucket configuration with environment-specific variables
const bucketIdDev = process.env.OBJECT_STORAGE_BUCKET_ID_DEV;
const bucketIdProd = process.env.OBJECT_STORAGE_BUCKET_ID_PROD;
const bucketIdFallback = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

const privateDirDev = process.env.PRIVATE_OBJECT_DIR_DEV;
const privateDirProd = process.env.PRIVATE_OBJECT_DIR_PROD;
const privateDirFallback = process.env.PRIVATE_OBJECT_DIR;

// GCP Service Account for dev environment
const gcpKeyPath = process.env.GCP_SERVICE_ACCOUNT_KEY_PATH;
const gcpKeyJson = process.env.GCP_SERVICE_ACCOUNT_KEY_JSON;

export interface StorageConfig {
  bucketId: string;
  privateDir: string;
  sidecarEndpoint: string;
  isProduction: boolean;
  isDevelopment: boolean;
  useGcpClient: boolean; // true = use GCP client directly, false = use Replit sidecar
}

/**
 * Get storage configuration based on current environment.
 * Throws error if configuration is missing (no fallback).
 */
export function getStorageConfig(): StorageConfig {
  let bucketId: string;
  let privateDir: string;
  let useGcpClient = false;

  if (isProduction) {
    bucketId = bucketIdProd || bucketIdFallback || "";
    privateDir = privateDirProd || privateDirFallback || "";

    if (!bucketId) {
      throw new Error(
        "Object storage bucket not configured for production. " +
          "Set OBJECT_STORAGE_BUCKET_ID_PROD or DEFAULT_OBJECT_STORAGE_BUCKET_ID."
      );
    }
    if (!privateDir) {
      throw new Error(
        "Private object directory not configured for production. " +
          "Set PRIVATE_OBJECT_DIR_PROD or PRIVATE_OBJECT_DIR."
      );
    }
  } else if (isDevelopment) {
    bucketId = bucketIdDev || bucketIdFallback || "";
    privateDir = privateDirDev || privateDirFallback || "";

    if (!bucketId) {
      throw new Error(
        "Object storage bucket not configured for development. " +
          "Set OBJECT_STORAGE_BUCKET_ID_DEV or DEFAULT_OBJECT_STORAGE_BUCKET_ID."
      );
    }
    if (!privateDir) {
      throw new Error(
        "Private object directory not configured for development. " +
          "Set PRIVATE_OBJECT_DIR_DEV or PRIVATE_OBJECT_DIR."
      );
    }

    // In dev, use GCP client if we have credentials and not in Replit
    useGcpClient = !!(gcpKeyPath || gcpKeyJson) && !process.env.REPL_ID;
  } else {
    // Fallback for unknown environment
    bucketId = bucketIdFallback || "";
    privateDir = privateDirFallback || "";

    if (!bucketId || !privateDir) {
      throw new Error(
        `Object storage not configured. NODE_ENV='${nodeEnv}' is not recognized. ` +
          "Set NODE_ENV to 'development' or 'production' and configure bucket variables."
      );
    }
  }

  console.log(`Storage Config:`);
  console.log(`   Environment: ${nodeEnv || "not set"}`);
  console.log(`   Bucket: ${bucketId}`);
  console.log(`   Private Dir: ${privateDir}`);
  console.log(`   Using: ${useGcpClient ? "GCP Client" : "Replit Sidecar"}`);

  return {
    bucketId,
    privateDir,
    sidecarEndpoint: REPLIT_SIDECAR_ENDPOINT,
    isProduction,
    isDevelopment,
    useGcpClient,
  };
}

/**
 * Create a GCP Storage client for direct bucket access.
 * Used in development when running outside Replit.
 */
export function createGcpStorageClient(): Storage {
  if (gcpKeyJson) {
    // Parse inline JSON credentials
    const credentials = JSON.parse(gcpKeyJson);
    return new Storage({
      projectId: credentials.project_id,
      credentials,
    });
  } else if (gcpKeyPath && fs.existsSync(gcpKeyPath)) {
    // Load credentials from file
    return new Storage({
      keyFilename: gcpKeyPath,
    });
  } else {
    throw new Error(
      "GCP credentials not configured. " +
        "Set GCP_SERVICE_ACCOUNT_KEY_PATH or GCP_SERVICE_ACCOUNT_KEY_JSON."
    );
  }
}

/**
 * Create the Replit sidecar-based Storage client.
 * Used in production on Replit.
 */
export function createReplitStorageClient(): Storage {
  return new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: {
          type: "json",
          subject_token_field_name: "access_token",
        },
      },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  });
}

/**
 * Get the appropriate Storage client based on environment.
 */
export function getStorageClient(): Storage {
  const config = getStorageConfig();

  if (config.useGcpClient) {
    console.log("Using GCP Service Account credentials");
    return createGcpStorageClient();
  } else {
    console.log("Using Replit sidecar for storage");
    return createReplitStorageClient();
  }
}
