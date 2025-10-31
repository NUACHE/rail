import express from "express";
import axios from "axios";

const app = express();

// ✅ USSD providers send x-www-form-urlencoded, so we must parse it
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware to capture raw body for debugging
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/sms') {
    req.rawBody = req.body;
  }
  next();
});

const PORT = process.env.PORT || 3005;
const MOOLRE_API_BASE_URL = (process.env.MOOLRE_API_BASE_URL || "https://api.moolre.com/").replace(/\/$/, "/");
const X_API_VASKEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2YXNpZCI6MTE4LCJleHAiOjE5MjQ5OTE5OTl9.4IuQ9uOHXJeeP-9_pJOmSGd3OIyfj-3R2__u2rOhV3c";

if (!X_API_VASKEY) {
  console.warn("Warning: MOOLRE_API_KEY is not set. Requests to Moolre API will fail.");
}

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ✅ USSD Callback Endpoint
app.post("/sms", async (req, res) => {
  console.log("📩 Incoming USSD Request Body (raw):", req.body);

  // Parse the request body - it might be a JSON string
  let ussdData = req.body;
  
  // Helper function to clean and parse JSON string
  const tryParseJson = (str) => {
    if (typeof str !== 'string') return null;
    try {
      // Clean up the string (remove \r\n, \n, and normalize whitespace)
      const cleaned = str.trim()
        .replace(/\r\n/g, '')
        .replace(/\n/g, '')
        .replace(/\s+/g, ' ');
      
      // Try to parse
      return JSON.parse(cleaned);
    } catch (e) {
      return null;
    }
  };
  
  // If body is a string, parse it directly
  if (typeof req.body === 'string') {
    const parsed = tryParseJson(req.body);
    if (parsed) ussdData = parsed;
  } else if (typeof req.body === 'object' && req.body !== null) {
    // Check if any property value contains a JSON string
    const bodyKeys = Object.keys(req.body);
    for (const key of bodyKeys) {
      const value = req.body[key];
      
      // Try parsing the value
      if (typeof value === 'string') {
        const parsed = tryParseJson(value);
        if (parsed) {
          ussdData = parsed;
          break;
        }
      }
      
      // Also try parsing the key itself (in case key is a JSON string)
      const parsedKey = tryParseJson(key);
      if (parsedKey) {
        ussdData = parsedKey;
        break;
      }
    }
    
    // If still not parsed and body already looks like USSD data, use it as-is
    if (ussdData === req.body && (ussdData.sessionId || ussdData.msisdn)) {
      // Already parsed correctly, use as-is
    }
  }

  console.log("📩 Parsed USSD Data:", ussdData);

  // Extract USSD request fields
  const { sessionId, msisdn, network, message, data, new: isNew } = ussdData;
  const userInput = message || data;

  console.log("Session ID:", sessionId);
  console.log("Phone:", msisdn);
  console.log("User Input:", userInput);

  // ✅ SMS Payload
  const payload = {
    type: 1,
    senderid: "U17 Justify",
    messages: [
      {
        recipient: msisdn , // use USSD caller number
        message: `Welcome to the Eastern Region U-17 Justifiers!

Event Date: 22nd–23rd November 2025
Venue: Koforidua Sports Stadium

Register your Team: https://form.jotform.com/252985109643061
Register as a Player: https://form.jotform.com/252932105824555

Brought to you by the Eastern Regional Minister.
        `,
        ref: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
      }
    ]
  };

  try {
    const response = await axios.post(
      `${MOOLRE_API_BASE_URL}open/sms/send`,
      payload,
      {
        headers: {
          "X-API-VASKEY": X_API_VASKEY,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    console.log("✅ SMS sent successfully", response.data);

    if (response.data.status === 1) {
      return res.json({
        message: "We've sent you an SMS with the next steps. Kindly follow it to finish your registration.",
        reply: false
      });
    }

    return res.json({
      message: "Failed to send SMS. Please try again later.",
      reply: false
    });

  } catch (error) {
    console.log("❌ Error sending SMS", error);

    if (error.response) {
      return res.status(error.response.status).json({
        error: "Moolre API error",
        status: error.response.status,
        data: error.response.data
      });
    }

    if (error.request) {
      return res.status(504).json({ error: "No response from Moolre API" });
    }

    return res.status(500).json({ error: "Unexpected server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
