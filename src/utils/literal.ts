const { LiteralClient } = require('@literalai/client');
const OpenAI = require('openai');

const client = new LiteralClient({
  apiKey: ""
});

const openai = new OpenAI({
  apiKey:"" 
});


client.instrumentation.openai();

async function main() {
  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [{ role: 'user', content: 'Say this is a test' }]
    });
    
   
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        process.stdout.write(content);
      }
    }
    console.log('\nStream completed');
  } catch (error:any) {
    console.error('Error:', error.message);
  }
}

main();