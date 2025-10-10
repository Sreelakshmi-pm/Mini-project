// server.js

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ MongoDB Atlas connection
const uri = "mongodb+srv://lakshmykaa05_db_user:lakshmy@cluster0.0o2rndb.mongodb.net/voting?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(uri)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ Error connecting to MongoDB:", err));

// ✅ Simple test route
app.get("/", (req, res) => {
  res.send("Backend is running successfully!");
});

// ✅ Voter Signup & Login API (temporary demo)
const voters = []; // temporary in-memory array

// --- Signup Route ---
app.post("http://localhost:5000/api/voters/signup", (req, res) => {
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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}))`;