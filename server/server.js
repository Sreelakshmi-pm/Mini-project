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
  "mongodb+srv://lsree117_db_user:Voting123@cluster0.6ixyafu.mongodb.net/votingDB?retryWrites=true&w=majority";

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
  facePhoto: { type: String, default: "" }, // Raw Base64 headshot for admin comparison
  idPhoto: { type: String, default: "" }, // Base64 encoding of the ID card
  isFlagged: { type: Boolean, default: false }, // True if a similar face exists
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

// ✅ Enroll face descriptors for a voter (With Flagging and Match Detection)
app.post("/api/face/enroll", async (req, res) => {
  const { walletAddress, descriptors, idPhoto, facePhoto } = req.body;
  console.log(`[DEBUG] Enrollment request from ${walletAddress}`);
  console.log(`[DEBUG] Face Photo present: ${!!facePhoto}, ID Photo present: ${!!idPhoto}`);
  
  if (!walletAddress || !descriptors || descriptors.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Missing walletAddress or descriptors.",
    });
  }

  const incomingWallet = walletAddress.toLowerCase();

  try {
    // 1. Fetch all other registered faces
    const otherVoters = await VoterFace.find({
      walletAddress: { $ne: incomingWallet },
    });

    const VERIFY_THRESHOLD = 0.5;
    let duplicateFound = false;
    let matchingWallet = null;
    let matchingFacePhoto = null;

    // 2. Compare incoming descriptors against all existing faces
    for (const incomingDsc of descriptors) {
      for (const other of otherVoters) {
        for (const storedDsc of other.descriptors) {
          const distance = euclideanDistance(incomingDsc, storedDsc);
          if (distance < VERIFY_THRESHOLD) {
            duplicateFound = true;
            matchingWallet = other.walletAddress;
            matchingFacePhoto = other.facePhoto;
            break;
          }
        }
        if (duplicateFound) break;
      }
      if (duplicateFound) break;
    }

    // 3. Save the face data, marking it as flagged if a duplicate was found
    await VoterFace.findOneAndUpdate(
      { walletAddress: incomingWallet },
      { 
        descriptors, 
        idPhoto: idPhoto || "", 
        facePhoto: facePhoto || "",
        isFlagged: duplicateFound 
      },
      { upsert: true, new: true },
    );

    if (duplicateFound) {
      return res.json({
        success: true,
        isFlagged: true,
        matchingWallet,
        matchingFacePhoto,
        message: "A similar face was detected. Your identity has been flagged for manual administrative review. Please ensure your ID photo is clear.",
      });
    }

    return res.json({
      success: true,
      isFlagged: false,
      message: "Face descriptors enrolled successfully.",
    });
  } catch (error) {
    console.error("Error enrolling face:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error during enrollment." });
  }
});

// ✅ Get stored face descriptors & ID photo for a voter
app.get("/api/face/:walletAddress", async (req, res) => {
  try {
    const incomingAddress = req.params.walletAddress.toLowerCase();
    const record = await VoterFace.findOne({
      walletAddress: incomingAddress,
    });
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "No face data found for this address.",
      });
    }

    let matchingDetails = null;
    if (record.isFlagged) {
      // Find the first matching record for comparison (excluding self)
      const otherVoters = await VoterFace.find({ walletAddress: { $ne: incomingAddress } });
      const VERIFY_THRESHOLD = 0.5;
      
      for (const other of otherVoters) {
        let foundMatch = false;
        for (const dsc of record.descriptors) {
          for (const otherDsc of other.descriptors) {
             if (euclideanDistance(dsc, otherDsc) < VERIFY_THRESHOLD) {
               matchingDetails = {
                 walletAddress: other.walletAddress,
                 facePhoto: other.facePhoto
               };
               foundMatch = true;
               break;
             }
          }
          if (foundMatch) break;
        }
        if (foundMatch) break;
      }
    }

    return res.json({ 
      success: true, 
      descriptors: record.descriptors,
      idPhoto: record.idPhoto,
      facePhoto: record.facePhoto,
      isFlagged: record.isFlagged,
      matchingDetails
    });
  } catch (error) {
    console.error("Error fetching face data:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error fetching face data." });
  }
});

// ✅ Delete a specific voter's face data (For rejections)
app.delete("/api/face/delete/:walletAddress", async (req, res) => {
  try {
    await VoterFace.deleteOne({ walletAddress: req.params.walletAddress.toLowerCase() });
    return res.json({ success: true, message: "Voter face data cleared." });
  } catch (error) {
    console.error("Error deleting face data:", error);
    return res.status(500).json({ success: false, message: "Server error deleting voter data." });
  }
});

// ✅ Admin Route: Reset all registered faces
app.delete("/api/admin/reset-faces", async (req, res) => {
  try {
    // Delete all records in the VoterFace collection
    await VoterFace.deleteMany({});
    return res.json({
      success: true,
      message:
        "All face data has been permanently deleted. Voters can now register again.",
    });
  } catch (error) {
    console.error("Error resetting faces:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error during face reset." });
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
