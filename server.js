import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import fs from "fs";
import path from "path";

const VoiceResponse = twilio.twiml.VoiceResponse;
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const knowledgePath = path.join(process.cwd(), "data", "knowledge.json");
let COMPANY = {};
try {
  COMPANY = JSON.parse(fs.readFileSync(knowledgePath, "utf8"));
} catch (e) {
  console.error("Erro lendo data/knowledge.json:", e);
  COMPANY = {};
}

app.post("/twilio/voice", (req, res) => {
  const vr = new VoiceResponse();
  const gather = vr.gather({ input: "dtmf", numDigits: 1, action: "/twilio/ivr" });
  gather.say(
    "Thank you for calling Fine Rental Cars. " +
    "Press 1 for Reservations. Press 2 for Pickup and Delivery. " +
    "Press 3 for Mileage and Policies. Press 0 to speak to a representative."
  );
  vr.redirect("/twilio/voicemail");
  res.type("text/xml").send(vr.toString());
});

app.post("/twilio/ivr", (req, res) => {
  const digits = (req.body.Digits || "").trim();
  const vr = new VoiceResponse();
  const say = (msg) =>
    vr.say(
      msg +
        " Press 0 to speak to a representative, or stay on the line to repeat."
    );

  switch (digits) {
    case "1":
      say("Reservations. For the fastest quote, please provide dates, pickup location, and vehicle type by text message. I can also text you a booking link.");
      break;
    case "2":
      say("Pickup and Delivery. Standard pickup is in Prosper, Texas. We also offer delivery up to twenty five miles from our office for a delivery fee. Airport handoffs can be scheduled when available.");
      break;
    case "3":
      say("Mileage and Policies. The standard allowance is two hundred miles per day, pro rated. Extra miles have a per mile charge. We use contactless lockbox handoff when applicable, and we keep about three hours between trips.");
      break;
    case "0": {
      const digitsOnly = (COMPANY.company_phone || "").replace(/\D/g, "");
      if (digitsOnly.length >= 10) {
        vr.dial(digitsOnly);
      } else {
        vr.say("Transferring to a representative is temporarily unavailable. Please leave a voicemail.");
        vr.redirect("/twilio/voicemail");
      }
      return res.type("text/xml").send(vr.toString());
    }
    default:
      vr.redirect("/twilio/voice");
  }
  res.type("text/xml").send(vr.toString());
});

app.post("/twilio/voicemail", (req, res) => {
  const vr = new VoiceResponse();
  vr.say("All of our representatives are currently assisting other customers.");
  vr.say("Please state your name, phone number, and the reason for your call after the beep. We will call you back as soon as possible. Thank you!");
  vr.record({ maxLength: 120, playBeep: true });
  vr.hangup();
  res.type("text/xml").send(vr.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Fine Rental Cars bot running on ${PORT}`));
