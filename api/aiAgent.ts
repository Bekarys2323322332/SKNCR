import dotenv from "dotenv";
import express from "express";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

app.post("/api/aiAgent", async (req, res) => {
  try {
    const { userData, productComponents } = req.body;
    const prompt = `
As a skincare expert, from the provided user data and product components,
give a compatibility score (0–100) and explain briefly why.
User data: ${JSON.stringify(userData)}
Product components: ${productComponents}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ response: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
