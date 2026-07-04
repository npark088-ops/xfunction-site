import Anthropic from "@anthropic-ai/sdk";


const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
const { task, dueDate } = await req.json();

    const response = await anthropic.messages.create({
     model: "claude-sonnet-4-5",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `
You are xFunction AI.

You help students with executive functioning.

Break the following task into 5-10 small actionable steps.

Rules:
- One step per line
- Keep steps short
- No introductions
- No explanations
- Focus on helping students get started

Task:
${task}

Due Date:
${dueDate}
`,
        },
      ],
    });

    const text =
      response.content[0].type === "text"
        ? response.content[0].text
        : "";

return Response.json({
  response: text
});
  } catch (error) {
    console.error("CLAUDE ERROR:", error);

    return Response.json(
      {
        error: "Failed to generate task breakdown",
      },
      {
        status: 500,
      }
    );
  }
}