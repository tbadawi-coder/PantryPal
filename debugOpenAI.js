require('dotenv').config();
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
(async () => {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say hi' }],
      max_tokens: 10,
    });
    console.log('success', response.choices?.[0]?.message?.content || response);
  } catch (err) {
    if (err.response) {
      console.error('response status', err.response.status);
      console.error('response data', JSON.stringify(err.response.data));
    } else {
      console.error('error', err.message || err);
    }
    process.exit(1);
  }
})();
