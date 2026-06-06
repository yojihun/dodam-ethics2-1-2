import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { evaluateObjective, evaluateSubjective } from "./server/gemini-service.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      {
        name: "local-gemini-proxy",
        configureServer(server) {
          server.middlewares.use("/api/gemini", async (req, res) => {
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.end("Method Not Allowed");
              return;
            }

            try {
              const chunks = [];
              for await (const chunk of req) {
                chunks.push(chunk);
              }

              const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
              let result;

              if (body.type === "objective") {
                result = await evaluateObjective(
                  env.GEMINI_API_KEY,
                  body.subsection,
                  body.userAnswer
                );
              } else if (body.type === "subjective") {
                result = await evaluateSubjective(
                  env.GEMINI_API_KEY,
                  body.question,
                  body.expectedAnswer,
                  body.userAnswer
                );
              } else {
                res.statusCode = 400;
                res.end("Unsupported request type.");
                return;
              }

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            } catch (error) {
              res.statusCode = 500;
              res.end(error instanceof Error ? error.message : "Unknown error");
            }
          });
        },
      },
    ],
  };
});
