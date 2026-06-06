import { evaluateObjective, evaluateSubjective } from "../server/gemini-service.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (body.type === "objective") {
      const result = await evaluateObjective(apiKey, body.subsection, body.userAnswer);
      return Response.json(result);
    }

    if (body.type === "subjective") {
      const result = await evaluateSubjective(
        apiKey,
        body.question,
        body.expectedAnswer,
        body.userAnswer
      );
      return Response.json(result);
    }

    return new Response("Unsupported request type.", { status: 400 });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Unknown error", {
      status: 500,
    });
  }
}
