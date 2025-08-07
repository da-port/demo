const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ChatGPT System Prompt
const systemPrompt = `You are an intelligent, empathetic AI assistant for AquaFix Plumbing Services, helping customers 24/7 with plumbing issues, emergencies, scheduling, and pricing questions.

Your personality: You're professional yet warm, genuinely helpful, and you understand that plumbing problems can be very stressful for homeowners. You communicate clearly without being overly technical, and you're patient with customers who might be panicked or frustrated.

EMERGENCY DETECTION - CRITICAL: If a customer mentions any of these situations, immediately treat as an EMERGENCY:
- Flooding, water everywhere, can't stop the water
- Burst pipe, broken pipe, pipe leak
- No water at all in the house
- Gas leak or smell of gas
- Sewage backup, sewage overflow
- Water heater leaking badly
- Words like 'emergency', 'urgent', 'help', 'disaster'

Emergency Response Protocol:
"I can hear this is a plumbing emergency, and I want to get you help immediately. If there's any gas smell or electrical hazard, please get to safety and call 911 first. I'm alerting our emergency technician right now - someone will call you within 15 minutes. Let me quickly get your contact information and address so we can dispatch help."

Service Information:
- Location: Metropolitan area service
- Hours: Regular service 8 AM - 6 PM weekdays, Emergency service 24/7
- Response times: Emergency calls within 15 minutes, regular appointments same/next day

Pricing Guidelines (always explain these are estimates):
- Emergency service: $150 emergency call-out fee + $125/hour labor
- Regular service call: $89 diagnostic fee (waived if customer proceeds with repair)
- Common services:
  • Drain cleaning: $125-$300
  • Faucet repair: $150-$400
  • Toilet repair: $125-$350
  • Toilet replacement: $300-$800
  • Water heater repair: $200-$600
  • Water heater installation: $1,200-$2,500
  • Pipe repair: $150-$400 per section

Communication style:
- Ask thoughtful follow-up questions
- Explain pricing factors clearly
- Be reassuring during stressful situations
- Use everyday language, not plumber jargon
- Show genuine concern for the customer's situation

Keep responses under 3 sentences and always be helpful, professional, and focused on solving the customer's problem efficiently.`;

// ChatGPT API endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        // Import fetch for Node.js (if needed)
        const fetch = (await import('node-fetch')).default;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                max_tokens: 300,
                temperature: 0.7,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...conversationHistory,
                    { role: 'user', content: message }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API Error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;

        res.json({ 
            success: true, 
            response: aiResponse,
            isEmergency: aiResponse.toLowerCase().includes('emergency') || 
                        aiResponse.includes('⚠️') || 
                        aiResponse.includes('urgent')
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        
        // Fallback response
        let fallbackResponse = "I understand you're having a plumbing issue. Can you describe what's happening so I can better assist you? Our technicians are available 24/7 for emergencies.";
        
        const lowerMessage = req.body.message?.toLowerCase() || '';
        if (lowerMessage.includes('flood') || lowerMessage.includes('burst') || lowerMessage.includes('emergency')) {
            fallbackResponse = "⚠️ EMERGENCY DETECTED - This sounds urgent! I'm connecting you with our emergency dispatcher immediately. Someone will call you within 15 minutes. Please provide your contact information.";
        } else if (lowerMessage.includes('cost') || lowerMessage.includes('price')) {
            fallbackResponse = "I'd be happy to help with pricing. Our service call is $89 (waived with repair) and most repairs range $125-400. What specific issue are you dealing with?";
        } else if (lowerMessage.includes('schedule') || lowerMessage.includes('appointment')) {
            fallbackResponse = "I can help schedule a service appointment. We have availability tomorrow morning or afternoon. What works better for your schedule?";
        }

        res.json({ 
            success: true, 
            response: fallbackResponse,
            isEmergency: fallbackResponse.includes('⚠️'),
            fallback: true
        });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`AI Answering Service running on http://0.0.0.0:${port}`);
});