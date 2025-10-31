import express from "express";
import axios from "axios";

const app = express();

// ✅ USSD providers send x-www-form-urlencoded, so we must parse it
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
  console.log("📩 Incoming USSD Request Body:", req.body);

  // Extract USSD request fields
  const { sessionId, msisdn, network, message, data } = req.body;
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
        recipient: msisdn || "0505721806", // use USSD caller number
        message: `
Welcome to the Eastern Region U-17 Justifiers!

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
