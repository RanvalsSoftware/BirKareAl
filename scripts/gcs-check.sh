#!/bin/sh
# Verifies GCS access exactly as the running API does (ADC from the VM service
# account). Run on the Portainer host:  sh scripts/gcs-check.sh birkare-production-api-1
# Writes and deletes one small object under healthcheck/ in $GCS_BUCKET.
set -eu
container="${1:-birkare-production-api-1}"
docker exec -w /srv/app/packages/storage "$container" node --input-type=module -e '
import { Storage } from "@google-cloud/storage";
const storage = new Storage();
const bucket = process.env.GCS_BUCKET;
const step = async (name, fn) => {
  try {
    const result = await fn();
    console.log("OK  ", name, typeof result === "string" ? result : "");
  } catch (error) {
    console.log("FAIL", name, "->", String(error.message).split("\n")[0].slice(0, 300));
  }
};
console.log("bucket:", bucket);
await step("kimlik (VM servis hesabi)", async () => (await storage.authClient.getCredentials()).client_email);
const file = storage.bucket(bucket).file("healthcheck/birkare-gcs-check.txt");
await step("yazma (Storage Object Admin)", () => file.save("ok", { resumable: false }));
await step("okuma", async () => (await file.download())[0].toString());
await step("imzali URL (Token Creator + IAM Credentials API + cloud-platform scope)", async () =>
  (await file.getSignedUrl({ version: "v4", action: "read", expires: Date.now() + 60_000 }))[0].split("?")[0]);
await step("silme", async () => { await file.delete({ ignoreNotFound: true }); });
'
