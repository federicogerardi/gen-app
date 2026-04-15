const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION?.trim();

if (!appVersion) {
  console.error('NEXT_PUBLIC_APP_VERSION is required for release builds.');
  process.exit(1);
}

if (!SEMVER_PATTERN.test(appVersion)) {
  console.error(`NEXT_PUBLIC_APP_VERSION must be semver-compatible. Received: ${appVersion}`);
  process.exit(1);
}

console.log(`Validated NEXT_PUBLIC_APP_VERSION: ${appVersion}`);