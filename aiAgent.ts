import express from "express";
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json());
const apiKey = (process.env.API_KEY);
const GenAi = new GoogleGenerativeAI(apiKey);
const model = GenAi.getGenerativeModel({model:"gemini-2.5-flash"});

app.post("/gemini", async (req, res) => {
  try {
    const { userData, productComponents } = req.body;
    const prompt = `
    As a skincare expert, from the provided user data and product components, Write how much would you give the score based on compatibility with the user skin and why:
    User data: ${userData}
    Product components: ${productComponents}
    Give a compatibility score (0–100) and explain briefly why.
    `;
    const result = await model.generateContent(prompt);
    res.json({ response: result.response.text() });
} catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
});
app.get("/api/hello", (_, res) => res.json({ message: "Hello from Vercel!" }));
export default app;
