/**
 * Generate a default cartoon avatar by calling Flask backend directly.
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnvFile(path.join(__dirname, "..", ".env"));
loadEnvFile(path.join(__dirname, "..", ".env.local"));

const FLASK_URL = (process.env.FLASK_API_URL || "http://localhost:5000") + "/pg/generate_ai_slide";
const FLASK_API_KEY = process.env.FLASK_API_KEY || "";

async function main() {
  const outPath = path.join(__dirname, "..", "public", "previews", "default-avatar.png");

  console.log("Generating default avatar...");
  console.log("Flask URL:", FLASK_URL);

  const res = await fetch(FLASK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(FLASK_API_KEY ? { "X-API-Key": FLASK_API_KEY } : {}),
    },
    body: JSON.stringify({
      prompt: "Professional headshot portrait photo of a confident attractive black man in his 30s, warm genuine smile, short neat hair, wearing a clean white t-shirt, studio lighting, shallow depth of field, blurred dark background, high quality portrait photography, photorealistic, square crop tight on face and shoulders. No text, no graphics.",
      aspect_ratio: "1:1",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Flask error ${res.status}:`, text.slice(0, 200));
    process.exit(1);
  }

  const data = await res.json();
  const base64 = data.image?.replace(/^data:image\/\w+;base64,/, "") || data.image;
  const buffer = Buffer.from(base64, "base64");

  await sharp(buffer).resize(200, 200, { fit: "cover" }).png().toFile(outPath);
  console.log(`Saved: ${outPath} (200x200)`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
