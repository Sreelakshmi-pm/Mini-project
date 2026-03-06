const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // handles JSON bodies (incl. large face descriptor arrays)
app.use(express.urlencoded({ extended: true }));

// ✅ MongoDB Atlas connection
const uri =
  "mongodb+srv://lsree117_db_user:6mQbwpP1T5JAExlE@cluster0.6ixyafu.mongodb.net/?appName=Cluster0";

mongoose
  .connect(uri)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ Error connecting to MongoDB:", err));

// ✅ Define Mongoose Schema & Model
const voterSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});

const Voter = mongoose.model("Voter", voterSchema);

// ✅ VoterFace schema — stores face descriptors per wallet address
// descriptors is an array of 128-element float arrays (one per captured photo)
const voterFaceSchema = new mongoose.Schema({
  walletAddress: { type: String, unique: true, lowercase: true },
  descriptors: { type: mongoose.Schema.Types.Mixed, default: [] },
});
const VoterFace = mongoose.model("VoterFace", voterFaceSchema);

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Backend is running successfully!");
});

// ✅ Enroll face descriptors for a voter
app.post("/api/face/enroll", async (req, res) => {
  const { walletAddress, descriptors } = req.body;
  if (!walletAddress || !descriptors || descriptors.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Missing walletAddress or descriptors.",
    });
  }
  try {
    await VoterFace.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { descriptors },
      { upsert: true, new: true },
    );
    return res.json({
      success: true,
      message: "Face descriptors enrolled successfully.",
    });
  } catch (error) {
    console.error("Error enrolling face:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error during enrollment." });
  }
});

// ✅ Get stored face descriptors for a voter
app.get("/api/face/:walletAddress", async (req, res) => {
  try {
    const record = await VoterFace.findOne({
      walletAddress: req.params.walletAddress.toLowerCase(),
    });
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "No face data found for this address.",
      });
    }
    return res.json({ success: true, descriptors: record.descriptors });
  } catch (error) {
    console.error("Error fetching face data:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error fetching face data." });
  }
});

// ✅ Signup Route
app.post("/api/voters/signup", async (req, res) => {
  console.log("📩 Signup request body:", req.body);
  const { name, email, password } = req.body;

  try {
    // Check if email already exists
    const exists = await Voter.findOne({ email });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists!" });
    }

    // Create new voter
    const newVoter = new Voter({ name, email, password });
    await newVoter.save();

    return res.json({ success: true, message: "Signup successful!" });
  } catch (error) {
    console.error("Error during signup:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// ✅ Login Route with Admin Logic
app.post("/api/voters/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Hardcoded admin accounts
    const adminAccounts = [
      { email: "admin1@gmail.com", password: "admin123" },
      { email: "admin2@gmail.com", password: "admin456" },
    ];

    // Check if admin
    const isAdmin = adminAccounts.find(
      (admin) => admin.email === email && admin.password === password,
    );

    if (isAdmin) {
      return res.json({
        success: true,
        role: "admin",
        message: "Admin login successful!",
      });
    }

    // Check if voter exists in database
    const voter = await Voter.findOne({ email, password });
    if (voter) {
      return res.json({
        success: true,
        role: "voter",
        message: "Voter login successful!",
      });
    }

    // Invalid credentials
    return res.status(401).json({
      success: false,
      message: "Invalid email or password!",
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`),
);
