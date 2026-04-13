const OpenAI = require('openai');

const apiKey = process.env.OPENAI_API_KEY;
const client = new OpenAI({
    apiKey,
});

exports.displayChat = (req, res) => {
    res.render('chat', { title: 'Recipe AI Chat' });
};

exports.handleMessage = async (req, res) => {
    try {
        if (!apiKey) {
            console.error('Missing OpenAI API key. Set OPENAI_API_KEY in .env.');
            return res.status(500).json({
                error: 'OpenAI API key is missing. Please set OPENAI_API_KEY in your .env file.'
            });
        }

        const { message, conversationHistory } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        const messages = [
            {
                role: 'system',
                content: 'You are a helpful recipe assistant for PantryPal. Your role is to suggest delicious recipes based on ingredients the user has available. Be creative, helpful, and provide practical cooking advice. Keep responses concise but informative. When users mention ingredients, suggest recipes that use those ingredients. CRITICAL RULE: Every single time you mention a recipe name, you MUST wrap it in double square brackets, no exceptions. Examples: [[Chicken Stir Fry]], [[Pasta Carbonara]], [[Bagel Melt]]. Never write a recipe name without the double brackets. This is required for the meal planner feature to work.'
            },
            ...(Array.isArray(conversationHistory) ? conversationHistory : []),
            {
                role: 'user',
                content: message
            }
        ];

        const response = await client.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages,
            temperature: 0.7,
            max_tokens: 500,
        });

        const aiMessage = response.choices?.[0]?.message?.content;

        if (!aiMessage) {
            throw new Error('OpenAI response did not contain a valid message.');
        }

        res.json({
            success: true,
            message: aiMessage,
        });
    } catch (error) {
        const debugMessage =
            error?.response?.data?.error?.message || error?.message || 'Unknown error';
        console.error('Error calling OpenAI:', debugMessage);

        let userMessage = 'Failed to generate response. Please try again later.';
        if (debugMessage.includes('Missing scopes') || debugMessage.includes('insufficient permissions') || debugMessage.includes('model.request')) {
            userMessage = 'OpenAI API key does not have the required model access. Create a new key with model.request access in your OpenAI dashboard.';
        } else if (debugMessage.includes('API key') || debugMessage.includes('Invalid API key')) {
            userMessage = 'OpenAI API key invalid or missing. Please check your OPENAI_API_KEY in .env.';
        } else if (debugMessage.includes('quota') || debugMessage.includes('429')) {
            userMessage = 'OpenAI quota exceeded. Please check your OpenAI plan and billing details.';
        }

        res.status(500).json({
            error: debugMessage,
            userMessage,
        });
    }
};
