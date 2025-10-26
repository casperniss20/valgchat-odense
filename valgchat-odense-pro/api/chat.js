import fs from "fs";
import path from "path";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const LOG_PATH = "/tmp/chatlog.csv";

function appendCsv(pid, role, content) {
  try {
    const file = path.resolve(LOG_PATH);
    const safe = (content || "").replace(/"/g,'""');
    const line = `${new Date().toISOString()};${pid};${role};"${safe}"\n`;
    fs.appendFileSync(file, line);
  } catch (e) {
    console.error("CSV log error:", e);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Kun POST tilladt" });
  }

  try {
    const { participant_id="anon", messages=[], user_text } = req.body || {};

    const history = Array.isArray(messages) && messages.length ? messages : [
      {
        role: "system",
        content:
`Du er en neutral valgtest og samtaleguide for Kommunalvallet i Odense 2025.
Vær venlig, nysgerrig og neutral. Stil ét åbent spørgsmål ad gangen.
Samtale-faser: (1-3) intro og præferencer; (4-10) udforsk lokale emner uden partinavne; (11-15) opsummer + anbefal 1–3 partier med korte, neutrale begrundelser.
Hold fokus udelukkende på kommunalvalget i Odense 2025.`
      },
      {
        role: "assistant",
        content: "Hej! Jeg er valgchatten for kommunalvalget i Odense 2025. Hvad er vigtigst for dig i kommunen? Vil du have korte eller mere uddybende svar?"
      }
    ];

    if (typeof user_text === "string" && user_text.trim()) {
      history.push({ role: "user", content: user_text.trim() });
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: history,
        temperature: 0.3,
        max_tokens: 700
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(r.status).json({ error: "OpenAI error", detail: errText });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "(tomt svar)";

    if (typeof user_text === "string") appendCsv(participant_id, "user", user_text);
    appendCsv(participant_id, "assistant", reply);

    return res.status(200).json({
      participant_id,
      reply,
      messages: [...history, { role: "assistant", content: reply }]
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error", detail: String(e?.message || e) });
  }
}
