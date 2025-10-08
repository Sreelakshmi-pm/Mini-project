// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ Connect to MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/dVotingDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Simple test route
app.get("/", (req, res) => {
  res.send("Backend is running successfully!");
});

// ✅ Voter Signup & Login API (temporary demo)
const voters = []; // this is just a temporary in-memory array

// --- Signup Route ---
app.post("/api/voters/signup", (req, res) => {
  const { name, email, password } = req.body;
  const exists = voters.find((v) => v.email === email);
  if (exists) {
    return res.status(400).json({ success: false, message: "Email already exists!" });
  }
  voters.push({ name, email, password });
  return res.json({ success: true, message: "Signup successful!" });
});

// --- Login Route ---
app.post("/api/voters/login", (req, res) => {
  const { email, password } = req.body;
  const user = voters.find((v) => v.email === email && v.password === password);
  if (user) {
    return res.json({ success: true, message: "Login successful!" });
  } else {
    return res.status(401).json({ success: false, message: "Invalid email or password!" });
  }
});

// ✅ Start the server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
