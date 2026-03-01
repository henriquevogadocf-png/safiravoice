import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import twilio from "twilio";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";
import { WaveFile } from "wavefile";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;
let ai: any;

// Initialize Database
const SCRIPTS = {
  1: "Olá! Aqui é a Safira da Safira Voice. Teria um minutinho para conversarmos sobre como estamos ajudando empresas do seu setor a automatizar vendas?",
  2: "Oi! Sou a Safira. Estou ligando para apresentar nossa solução de CRM por voz que custa apenas trezentos e cinquenta reais por mês. Tem interesse?",
  3: "Olá, aqui é a Safira. Gostaria de saber o que achou da nossa última apresentação e se ficou alguma dúvida."
};

async function startServer() {
  console.log("Starting Safira Voice Server...");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  try {
    db = new Database("safira.db");
    // Initialize Database
    db.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        status TEXT DEFAULT 'Novo',
        last_contact DATETIME,
        notes TEXT,
        ai_summary TEXT
      );

      CREATE TABLE IF NOT EXISTS scripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        objective TEXT NOT NULL, -- 'SALE' or 'MEETING'
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        script_id INTEGER,
        status TEXT DEFAULT 'Pausada',
        total_leads INTEGER DEFAULT 0,
        completed_leads INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(script_id) REFERENCES scripts(id)
      );

      CREATE TABLE IF NOT EXISTS calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER,
        campaign_id INTEGER,
        duration INTEGER,
        status TEXT,
        transcript TEXT,
        recording_url TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(lead_id) REFERENCES leads(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      -- Seed Data
      INSERT OR IGNORE INTO scripts (id, name, objective, content) VALUES 
      (1, 'Prospecção Inicial (Reunião)', 'MEETING', 'Olá! Aqui é a Safira da Safira Voice. Vi que você atua no setor de tecnologia e gostaria de agendar uma breve conversa de 15 minutos para mostrar como nossa IA pode triplicar sua taxa de conversão. Teria disponibilidade na terça ou quarta?'),
      (2, 'Venda Direta (SaaS)', 'SALE', 'Oi! Sou a Safira. Estou ligando porque temos uma oferta exclusiva para o Safira Voice hoje: acesso vitalício por apenas R$ 997. É uma solução que automatiza todo seu pós-venda. Quer aproveitar essa oportunidade agora?');

      -- Cleanup fake data for the user
      DELETE FROM leads;
      DELETE FROM campaigns;
      DELETE FROM calls;
    `);

    if (!process.env.GEMINI_API_KEY) {
      console.error("ERROR: GEMINI_API_KEY is missing!");
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    const server = createServer(app);
    const wss = new WebSocketServer({ server, path: "/api/calls/stream" });
    const PORT = 3000;

  wss.on("connection", (ws: WebSocket) => {
    console.log("Twilio Media Stream connected");
    let streamSid: string | null = null;
    let geminiSession: any = null;
    let leadName = "cliente";
    let scriptContent = "";
    let knowledge = "";

    ws.on("message", async (message: string) => {
      const data = JSON.parse(message);

      if (data.event === "start") {
        streamSid = data.start.streamSid;
        leadName = data.start.customParameters?.leadName || "cliente";
        scriptContent = data.start.customParameters?.scriptContent || "";
        knowledge = data.start.customParameters?.knowledge || "";
        
        console.log(`Stream started for ${leadName}`);

        // Initialize Gemini Live Session
        try {
          geminiSession = await ai.live.connect({
            model: "gemini-2.5-flash-native-audio-preview-09-2025",
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
              },
              systemInstruction: `Você é o SAFIRA VOICE, um assistente de voz inteligente para vendas e atendimento.
              Você está falando com ${leadName}.
              Seu objetivo: ${scriptContent}
              Conhecimento da empresa: ${knowledge}
              
              REGRAS:
              1. Fale SEMPRE em Português do Brasil de forma natural e amigável.
              2. Seja breve e direto, como em uma conversa telefônica real.
              3. Se o cliente tiver dúvidas, use o conhecimento da empresa fornecido.
              4. Tente conduzir a conversa para o objetivo definido.
              5. Inicie a conversa agora cumprimentando o cliente.`,
            },
            callbacks: {
              onmessage: (msg: any) => {
                const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio && streamSid) {
                  // Convert PCM 16kHz to μ-law 8kHz
                  const wav = new WaveFile();
                  wav.fromScratch(1, 16000, '16', Buffer.from(base64Audio, 'base64'));
                  wav.toSampleRate(8000);
                  wav.toMuLaw();
                  
                  const mulawData = Buffer.from((wav.data as any).samples).toString('base64');
                  
                  ws.send(JSON.stringify({
                    event: "media",
                    streamSid,
                    media: { payload: mulawData }
                  }));
                }
              },
              onerror: (err: any) => console.error("Gemini Live Error:", err),
            }
          });
        } catch (e) {
          console.error("Failed to connect to Gemini Live:", e);
        }
      } else if (data.event === "media") {
        if (geminiSession && data.media?.payload) {
          // Convert μ-law 8kHz to PCM 16kHz
          const wav = new WaveFile();
          wav.fromScratch(1, 8000, '8m', Buffer.from(data.media.payload, 'base64'));
          wav.toSampleRate(16000);
          wav.toBitDepth('16');
          
          const pcmData = Buffer.from((wav.data as any).samples).toString('base64');
          geminiSession.sendRealtimeInput({
            media: { data: pcmData, mimeType: "audio/pcm;rate=16000" }
          });
        }
      } else if (data.event === "stop") {
        console.log("Stream stopped");
        if (geminiSession) geminiSession.close();
      }
    });

    ws.on("close", () => {
      console.log("Twilio Media Stream closed");
      if (geminiSession) geminiSession.close();
    });
  });

  // Helper to get settings
  const getSetting = (key: string) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? (row as any).value : "";
  };

  // API Routes
  app.get("/api/dashboard/stats", (req, res) => {
    console.log("GET /api/dashboard/stats");
    const totalCalls = db.prepare("SELECT COUNT(*) as count FROM calls").get().count;
    const completedCalls = db.prepare("SELECT COUNT(*) as count FROM calls WHERE status = 'completed'").get().count;
    const connectionRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
    
    const recentCalls = db.prepare(`
      SELECT c.*, l.name as lead_name 
      FROM calls c 
      LEFT JOIN leads l ON c.lead_id = l.id 
      ORDER BY c.created_at DESC 
      LIMIT 5
    `).all();

    const stats = {
      calls: totalCalls,
      connectionRate: `${connectionRate}%`,
      meetings: db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'Reunião'").get().count,
      sales: db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'Venda'").get().count,
      recentCalls
    };
    res.json(stats);
  });

  app.get("/api/leads", (req, res) => {
    const leads = db.prepare("SELECT * FROM leads ORDER BY id DESC").all();
    res.json(leads);
  });

  app.get("/api/scripts", (req, res) => {
    const scripts = db.prepare("SELECT * FROM scripts ORDER BY id DESC").all();
    res.json(scripts);
  });

  app.post("/api/scripts", (req, res) => {
    const { name, objective, content } = req.body;
    const info = db.prepare("INSERT INTO scripts (name, objective, content) VALUES (?, ?, ?)").run(name, objective, content);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/knowledge", (req, res) => {
    const knowledge = db.prepare("SELECT * FROM knowledge_base ORDER BY id DESC").all();
    res.json(knowledge);
  });

  app.post("/api/knowledge", (req, res) => {
    const { title, content, category } = req.body;
    const info = db.prepare("INSERT INTO knowledge_base (title, content, category) VALUES (?, ?, ?)").run(title, content, category);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/leads", (req, res) => {
    const { name, phone, email } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "Nome e telefone são obrigatórios." });
    const info = db.prepare("INSERT INTO leads (name, phone, email) VALUES (?, ?, ?)").run(name, phone, email);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/leads/bulk", (req, res) => {
    const leads = req.body; // Array of { name, phone, email }
    if (!Array.isArray(leads)) return res.status(400).json({ error: "Formato inválido." });
    
    const insert = db.prepare("INSERT INTO leads (name, phone, email) VALUES (?, ?, ?)");
    const insertMany = db.transaction((data) => {
      for (const lead of data) insert.run(lead.name, lead.phone, lead.email || null);
    });
    
    insertMany(leads);
    res.json({ success: true, count: leads.length });
  });

  app.patch("/api/leads/:id", (req, res) => {
    const { status, notes } = req.body;
    db.prepare("UPDATE leads SET status = ?, notes = ? WHERE id = ?").run(status, notes, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/campaigns", (req, res) => {
    const campaigns = db.prepare("SELECT * FROM campaigns ORDER BY id DESC").all();
    res.json(campaigns);
  });

  app.post("/api/campaigns", (req, res) => {
    const { name, scriptId } = req.body;
    if (!name || !scriptId) return res.status(400).json({ error: "Nome e Script são obrigatórios." });
    try {
      const info = db.prepare("INSERT INTO campaigns (name, script_id, status) VALUES (?, ?, 'Pausada')").run(name, scriptId);
      res.json({ id: info.lastInsertRowid, success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Settings API
  app.get("/api/settings", (req, res) => {
    console.log("GET /api/settings");
    const keys = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "TEST_PHONE_NUMBER", "WHATSAPP_API_KEY"];
    const settings: any = {};
    keys.forEach(k => {
      settings[k] = getSetting(k);
    });
    res.json(settings);
  });

  app.post("/api/settings", (req, res) => {
    try {
      const settings = req.body;
      console.log("Saving settings:", Object.keys(settings));
      
      const insert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
      const updateMany = db.transaction((data) => {
        for (const [key, value] of Object.entries(data)) {
          insert.run(key, value);
        }
      });
      
      updateMany(settings);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Twilio Call API
  app.post("/api/calls/make", async (req, res) => {
    const { phone, scriptId, leadId, campaignId } = req.body;
    
    const sid = getSetting("TWILIO_ACCOUNT_SID");
    const token = getSetting("TWILIO_AUTH_TOKEN");
    const from = getSetting("TWILIO_PHONE_NUMBER");

    if (!sid || !token || !from) {
      return res.status(400).json({ error: "Configurações do Twilio ausentes." });
    }

    try {
      console.log(`Initiating call to ${phone}...`);
      const client = twilio(sid, token);
      const appUrl = process.env.APP_URL;
      
      if (!appUrl) {
        throw new Error("APP_URL não configurada no ambiente.");
      }

      // Basic phone validation/formatting
      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith('+')) {
        // Assume Brazil if no + and length is 10-11
        if (formattedPhone.length >= 10 && formattedPhone.length <= 11) {
          formattedPhone = '+55' + formattedPhone;
        } else if (!formattedPhone.startsWith('55') && formattedPhone.length >= 12) {
           // already has country code but no +
           formattedPhone = '+' + formattedPhone;
        }
      }

      const call = await client.calls.create({
        to: formattedPhone,
        from: from,
        url: `${appUrl}/api/calls/twiml?scriptId=${scriptId || 1}&leadId=${leadId || ''}`,
        statusCallback: `${appUrl}/api/calls/status?leadId=${leadId || ''}&campaignId=${campaignId || ''}`,
        statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer'],
      });

      // Initial log
      db.prepare("INSERT INTO calls (lead_id, campaign_id, status) VALUES (?, ?, ?)").run(leadId || null, campaignId || null, 'queued');

      res.json({ success: true, callSid: call.sid });
    } catch (error: any) {
      console.error("Twilio Error:", error);
      db.prepare("INSERT INTO calls (lead_id, campaign_id, status, error_message) VALUES (?, ?, ?, ?)").run(leadId || null, campaignId || null, 'failed', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // TwiML Endpoint
  app.post("/api/calls/twiml", async (req, res) => {
    const scriptId = req.query.scriptId as string;
    let leadId = req.query.leadId as string;
    const fromNumber = req.body.From; // Twilio sends the caller's number in the body
    
    let leadName = "cliente";

    // If no leadId, try to find lead by phone number (for inbound calls)
    if (!leadId && fromNumber) {
      const lead = db.prepare("SELECT id, name FROM leads WHERE phone LIKE ?").get(`%${fromNumber.replace('+', '')}%`) as any;
      if (lead) {
        leadId = lead.id;
      }
    }
    
    if (leadId) {
      const lead = db.prepare("SELECT name FROM leads WHERE id = ?").get(leadId) as any;
      if (lead) {
        leadName = lead.name;
      }
    }

    const script = db.prepare("SELECT * FROM scripts WHERE id = ?").get(scriptId) as any;
    const baseText = script ? script.content : "Olá, gostaria de falar sobre nossos serviços.";
    const knowledge = db.prepare("SELECT content FROM knowledge_base LIMIT 5").all().map((k: any) => k.content).join("\n");

    const response = new twilio.twiml.VoiceResponse();
    
    const appUrl = process.env.APP_URL || "";
    const streamUrl = appUrl.replace("https://", "wss://") + "/api/calls/stream";

    const connect = response.connect();
    const stream = connect.stream({
      url: streamUrl,
    });
    
    // Pass metadata to the stream
    stream.parameter({ name: "leadName", value: leadName });
    stream.parameter({ name: "scriptContent", value: baseText });
    stream.parameter({ name: "knowledge", value: knowledge });

    console.log(`Generating TwiML Stream for call. Lead: ${leadName}`);
    res.type('text/xml');
    res.send(response.toString());
  });

  // Status Callback
  app.post("/api/calls/status", async (req, res) => {
    const { CallStatus, CallDuration, ErrorMessage } = req.body;
    const leadId = req.query.leadId;
    const campaignId = req.query.campaignId;

    db.prepare("INSERT INTO calls (lead_id, campaign_id, duration, status, error_message) VALUES (?, ?, ?, ?, ?)")
      .run(leadId || null, campaignId || null, CallDuration || 0, CallStatus, ErrorMessage || null);

    if (leadId && CallStatus === 'completed') {
      db.prepare("UPDATE leads SET last_contact = CURRENT_TIMESTAMP WHERE id = ?").run(leadId);
      
      // AI Analysis of the call (Simulated transcript analysis for demo)
      try {
        const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId) as any;
        const prompt = `Analise o resultado de uma chamada de prospecção para o cliente ${lead.name}.
        Duração: ${CallDuration} segundos.
        Status: ${CallStatus}.
        
        Gere um resumo curto (máximo 20 palavras) do que provavelmente aconteceu e qual o próximo passo sugerido. 
        Seja estratégico.`;

        const aiResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });

        if (aiResponse.text) {
          db.prepare("UPDATE leads SET ai_summary = ? WHERE id = ?").run(aiResponse.text.trim(), leadId);
        }
      } catch (e) {
        console.error("AI Analysis failed:", e);
      }
    }

    res.sendStatus(200);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware attached.");

    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      console.log(`Vite handling request: ${url}`);
      if (url === "/") console.log("Root request received");
      try {
        let template = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        if (vite) vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

    console.log("Attempting to start server on port", PORT);
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Safira Voice Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("CRITICAL: Server failed to start:", error);
  }
}

startServer();
