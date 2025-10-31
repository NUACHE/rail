import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3005;
const MOOLRE_API_BASE_URL = (process.env.MOOLRE_API_BASE_URL || "https://api.moolre.com/").replace(/\/$/, "/");
const MOOLRE_API_KEY = process.env.MOOLRE_API_KEY || process.env.X_API_VASKEY || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyaWQiOjk3Njg2LCJleHAiOjE5MjUwMDk5OTl9.pM29QRCr6_DXXBHzOBAQDoQ-5mV9OMWInN7qPiIyw5s"; // default key

if (!MOOLRE_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn("Warning: MOOLRE_API_KEY is not set. Requests to Moolre API will fail.");
}

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});



// Forwards an SMS send request to Moolre API
app.post("/sms", async (req, res) => {
  console.log("SMS request received", req.body);
  // console.log('responce', res);
  const payload ={
    type: 1,
    senderid: "U17 Justify",
    messages: [
      {
        recipient: "0505721806",
        message: 
        `
Welcome to the Eastern Region U-17 Justifiers!

Event Date: 22nd–23rd November 2025
Venue: Koforidua Sports Stadium

Register your Team: https://form.jotform.com/252985109643061

Register as a Player: https://form.jotform.com/252932105824555

Brought to you by the Eastern Regional Minister.`,
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
          "X-API-VASKEY": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2YXNpZCI6MTE4LCJleHAiOjE5MjQ5OTE5OTl9.4IuQ9uOHXJeeP-9_pJOmSGd3OIyfj-3R2__u2rOhV3c",
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    console.log("SMS sent successfully", response.data);
    if(response.data.status === 1) {
    res.json({
      "message":"We've sent you an SMS with the next steps. Kindly follow it to finish your registration.",
      "reply": false
    });}else{
      res.json({
        "message":"Failed to send SMS. Please try again later.",
        "reply": false
      });
    }
  } catch (error) {

    console.log("Error sending SMS", error);
    if (error.response) {
      res.status(error.response.status).json({
        error: "Moolre API error",
        status: error.response.status,
        data: error.response.data
      });
      return;
    }
    if (error.request) {
      res.status(504).json({ error: "No response from Moolre API" });
      return;
    }
    res.status(500).json({ error: "Unexpected server error" });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});


