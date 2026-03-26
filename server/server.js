require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // handles JSON bodies (incl. large face descriptor arrays)
app.use(express.urlencoded({ extended: true }));

// ✅ MongoDB Atlas connection
const uri =
  "mongodb+srv://lsree117_db_user:Voting12345@cluster0.6ixyafu.mongodb.net/votingDB?retryWrites=true&w=majority";

mongoose
  .connect(uri)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ Error connecting to MongoDB:", err));

// ✅ Define Mongoose Schema & Model
const voterSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  otp: String,
  otpExpires: Date,
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

// ✅ Helper function: Calculate Euclidean Distance between two 128-element arrays
function euclideanDistance(arr1, arr2) {
  if (arr1.length !== arr2.length) return Infinity; // Safe guard
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = (arr1[i] || 0) - (arr2[i] || 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// ✅ Enroll face descriptors for a voter (With Duplicate Prevention)
app.post("/api/face/enroll", async (req, res) => {
  const { walletAddress, descriptors } = req.body;
  if (!walletAddress || !descriptors || descriptors.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Missing walletAddress or descriptors.",
    });
  }

  const incomingWallet = walletAddress.toLowerCase();

  try {
    // 1. We no longer check for duplicate faces across different wallets to allow twins to register.
    // The OTP system provides the necessary security to distinguish between users.

    // 2. Save the new face
    await VoterFace.findOneAndUpdate(
      { walletAddress: incomingWallet },
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

// (Admin Route Reset Faces removed - handled securely by OTP and individual wallets now)

// ✅ Send OTP Route
app.post("/api/voters/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email is required." });

  try {
    const voter = await Voter.findOne({ email });
    if (!voter) {
      return res.status(404).json({ success: false, message: "Voter not found!" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    voter.otp = otp;
    voter.otpExpires = otpExpires;
    await voter.save();

    console.log(`\n\n[DEV-MODE] 🟢 OTP for ${email}: ${otp}\n\n`);

    // Setup nodemailer if configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Voting Verification - OTP Code",
        text: `Your OTP for casting the vote is: ${otp}. It will expire in 5 minutes.`,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email successfully sent to ${email}`);
    } else {
      console.log(`No email sent remotely. Using console log only for OTP.`);
    }

    return res.json({ success: true, message: "OTP sent successfully." });
  } catch (err) {
    console.error("Error sending OTP:", err);
    return res.status(500).json({ success: false, message: "Server error sending OTP." });
  }
});

// ✅ Verify OTP Route
app.post("/api/voters/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required." });

  try {
    const voter = await Voter.findOne({ email });
    if (!voter) {
      return res.status(404).json({ success: false, message: "Voter not found!" });
    }

    if (voter.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    if (new Date() > voter.otpExpires) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    // Clear OTP upon success
    voter.otp = undefined;
    voter.otpExpires = undefined;
    await voter.save();

    return res.json({ success: true, message: "OTP verified correctly." });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    return res.status(500).json({ success: false, message: "Server error verifying OTP." });
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
