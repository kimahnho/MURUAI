/**
 * 로컬 Vertex AI 프록시 서버.
 * ADC(Application Default Credentials)를 사용하여 Vertex AI를 호출.
 * GCP 크레딧으로 과금됨.
 *
 * 사용법: node scripts/vertex-proxy.mjs
 * 포트: 3099
 */
import http from "node:http";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = process.env.GCP_PROJECT_ID || "project-ae0ea075-b012-4f17-b3b";
const LOCATION = process.env.GCP_LOCATION || "us-central1";
const PORT = 3099;

// Vertex AI 클라이언트 (ADC 자동 사용)
const ai = new GoogleGenAI({
  vertexai: true,
  project: PROJECT_ID,
  location: LOCATION,
});

const parseBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const body = await parseBody(req);
    const { model, contents, config: genConfig } = body;

    if (!model || !contents) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "model and contents are required" }));
      return;
    }

    console.log(`[vertex-proxy] ${model} — generating...`);
    const response = await ai.models.generateContent({ model, contents, config: genConfig });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
    console.log(`[vertex-proxy] ${model} — done`);
  } catch (err) {
    console.error("[vertex-proxy] error:", err.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Vertex AI error: ${err.message}` }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Vertex AI proxy running on http://localhost:${PORT}`);
  console.log(`   Project: ${PROJECT_ID}`);
  console.log(`   Location: ${LOCATION}`);
  console.log(`   Auth: Application Default Credentials\n`);
});
