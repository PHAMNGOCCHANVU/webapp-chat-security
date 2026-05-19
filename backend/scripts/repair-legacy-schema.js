require("dotenv").config();

const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const algorithm = "aes-256-gcm";
const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

function encryptMessage(plaintext) {
  if (!plaintext) {
    return null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

async function ensureColumnsExist() {
  const userColumns = await prisma.$queryRawUnsafe(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'users'
  `);

  const messageColumns = await prisma.$queryRawUnsafe(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'messages'
  `);

  const userColumnSet = new Set(userColumns.map((row) => row.COLUMN_NAME));
  const messageColumnSet = new Set(messageColumns.map((row) => row.COLUMN_NAME));

  const requiredUserColumns = [
    "is_email_verified",
    "failed_login_count",
    "locked_until",
    "last_login_at",
    "deleted_at",
  ];

  for (const column of requiredUserColumns) {
    if (!userColumnSet.has(column)) {
      throw new Error(`Missing expected users column after migration: ${column}`);
    }
  }

  if (!messageColumnSet.has("encrypted_content")) {
    throw new Error("Missing expected messages column after migration: encrypted_content");
  }
}

async function backfillMessages() {
  const legacyMessages = await prisma.$queryRawUnsafe(`
    SELECT [id], [message_content]
    FROM [dbo].[messages]
    WHERE [message_content] IS NOT NULL
      AND [encrypted_content] IS NULL
  `);

  for (const row of legacyMessages) {
    const ciphertext = encryptMessage(row.message_content);
    if (!ciphertext) {
      continue;
    }

    await prisma.$executeRaw`
      UPDATE [dbo].[messages]
      SET [encrypted_content] = ${ciphertext}
      WHERE [id] = ${row.id}
    `;
  }

  console.log(`Backfilled ${legacyMessages.length} legacy messages.`);
}

async function main() {
  await ensureColumnsExist();
  await backfillMessages();
}

main()
  .catch((error) => {
    console.error("Legacy schema repair failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
