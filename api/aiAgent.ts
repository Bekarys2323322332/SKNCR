import dotenv from "dotenv";
import express from "express";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

app.post("/gemini", async (req, res) => {
  try {
    const { userData, productComponents } = req.body;

    const prompt = `
    As a skincare expert, from the provided user data and product components, 
    write how much would you give the score based on compatibility with the user's skin and why:
    User data: ${userData}
    Product components: ${productComponents}
    Give a compatibility score (0–100) and explain briefly why.
    `;

    // Call GPT-5 Nano
    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,  // controls creativity
      max_tokens: 300,   // adjust if you need longer response
    });

    const textResponse = response.choices[0].message.content;

    res.json({ response: textResponse });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
});

app.get("/api/hello", (_, res) => res.json({ message: "Hello from your OpenAI backend!" }));

export default app;
