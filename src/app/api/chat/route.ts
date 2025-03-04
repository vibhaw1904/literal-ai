import { OpenAI } from "openai";
import { LiteralClient } from "@literalai/client";

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API
});

const literalClient = new LiteralClient({
  apiKey: process.env.NEXT_PUBLIC_LITERAL_API_KEY
});

literalClient.instrumentation.openai();

export async function POST(req: Request) {
  const { messages, threadId, runId } = await req.json();
  const participantId = await literalClient.api.getOrCreateUser('vibhaw');

  const userMessage = messages[messages.length - 1].content;
  
  const thread = literalClient.thread({
    id: threadId,
   participantId:participantId
  });
  

  try {
    return await thread.wrap(async () => {
      await literalClient
        .step({
          type: "user_message",
          name: "vibhaw",
          output: { content: userMessage }
        })
        .send();
      
      // Create a run to track the AI response
      const run = literalClient.run({
        id: runId,
        name: "OpenAI Response",
        input: { messages }
      });
      
      // Wrap the OpenAI call in the run
      const response = await run.wrap(async () => {
        // Make the OpenAI API call
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: messages,
          temperature: 0.7,
        });
        
        // Store the response in the run
        run.output = { 
          content: completion.choices[0].message.content,
          usage: completion.usage
        };
        
        return completion;
      });
      
      // Return the response to the user
      return Response.json({
        message: response.choices[0].message.content,
      });
    });
  } catch (error) {
    console.error("Error:", error);
    
    // Log the error to Literal using a valid step type
    await literalClient
      .step({
        type: "system_message", // Using system_message instead of "error"
        name: "Error Processing Request",
        output: { error: error.message }
      })
      .send();
      
    return Response.json({ error: "Failed to process request" }, { status: 500 });
  }
}