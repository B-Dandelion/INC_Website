import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const S3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.R2_PUBLIC_BUCKET;
const key = `smoketest/hello-${Date.now()}.txt`;

await S3.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: "hello r2",
    ContentType: "text/plain; charset=utf-8",
  })
);

const url = `${process.env.R2_PUBLIC_BASE_URL}/${key}`;
console.log("Uploaded:", url);
