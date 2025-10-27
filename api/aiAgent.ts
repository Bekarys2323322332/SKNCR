import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userData, productComponents } = req.body;

    if (!userData || !productComponents) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `
    As a skincare expert, from the provided user data and product components, 
    write how much would you give the score based on compatibility with the user's skin and why:
    User data: ${JSON.stringify(userData)}
    Product components: ${productComponents}
    Give a compatibility score (0–100) and explain briefly why.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });

    const textResponse = response.choices[0].message.content;

    res.status(200).json({ response: textResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
}
