// client/src/component/Voter/FaceCapture.js
import React, { Component } from "react";
import * as faceapi from "face-api.js";
import "./FaceCapture.css";

const MODELS_URL = "/models";
const CAPTURE_COUNT = 5;
const VERIFY_THRESHOLD = 0.5;
const VERIFY_TIMEOUT_MS = 20000;

export default class FaceCapture extends Component {
  // Props:
  //   mode: "enroll" | "verify"
  //   onDescriptorsReady(descriptors[]) — enroll mode: called with 5 descriptors
  //   storedDescriptors — verify mode: [[Number]] from server
  //   onVerified() — verify mode: called when face matches
  //   onVerifyFailed() — verify mode: called on timeout without match

  constructor(props) {
    super(props);
    this.state = {
      modelsLoaded: false,
      cameraReady: false,
      capturedDescriptors: [],
      status: "Loading face models…",
      verifying: false,
      verified: false,
      verifyFailed: false,
      captureFlash: false,
      facePhoto: null, // Base64 headshot
    };
    this.videoRef = React.createRef();
    this.canvasRef = React.createRef();
    this.verifyIntervalId = null;
    this.verifyTimeoutId = null;
  }

  async componentDidMount() {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]);
      this.setState({
        modelsLoaded: true,
        status: "Models loaded. Starting camera…",
      });
      await this.startCamera();
    } catch (err) {
      console.error("face-api model load error:", err);
      this.setState({
        status: "❌ Failed to load face models. Check console (F12).",
      });
    }
  }

  componentWillUnmount() {
    this.stopCamera();
    clearInterval(this.verifyIntervalId);
    clearTimeout(this.verifyTimeoutId);
  }

  startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (this.videoRef.current) {
        this.videoRef.current.srcObject = stream;
        this.videoRef.current.onloadedmetadata = () => {
          this.setState({ cameraReady: true });
          if (this.props.mode === "verify") {
            this.startVerification();
          } else {
            this.setState({
              status: `Ready. Capture photo 1 of ${CAPTURE_COUNT}.`,
            });
          }
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      this.setState({
        status: "❌ Cannot access camera. Please allow camera permission.",
      });
    }
  };

  stopCamera = () => {
    if (this.videoRef.current && this.videoRef.current.srcObject) {
      this.videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
  };

  // ─── ENROLL MODE ────────────────────────────────────────────────────────────
  capturePhoto = async () => {
    if (!this.state.cameraReady || !this.state.modelsLoaded) return;
    const video = this.videoRef.current;
    if (video.readyState < 4 || video.videoWidth === 0) return;
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      this.setState({
        status: "⚠️ No face detected. Please look directly at the camera.",
      });
      return;
    }

    const descriptors = [
      ...this.state.capturedDescriptors,
      Array.from(detection.descriptor),
    ];

    // On the last capture, grab the actual image as a headshot for admin review
    let facePhoto = this.state.facePhoto;
    if (descriptors.length === CAPTURE_COUNT) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      facePhoto = canvas.toDataURL("image/jpeg", 0.7);
    }

    this.setState({
      capturedDescriptors: descriptors,
      facePhoto,
      captureFlash: true,
    });
    setTimeout(() => this.setState({ captureFlash: false }), 300);

    if (descriptors.length >= CAPTURE_COUNT) {
      this.setState({
        status: "✅ All 5 photos captured! Click Register to continue.",
      });
      this.stopCamera();
      this.props.onDescriptorsReady(descriptors, facePhoto);
    } else {
      this.setState({
        status: `✅ Photo ${descriptors.length} captured. Now take photo ${descriptors.length + 1} from a different angle.`,
      });
    }
  };

  // ─── VERIFY MODE ─────────────────────────────────────────────────────────────
  startVerification = () => {
    this.setState({
      verifying: true,
      status: "🔍 Verifying your identity… Look at the camera.",
    });

    this.verifyIntervalId = setInterval(async () => {
      if (!this.videoRef.current || this.state.verified) return;
      const video = this.videoRef.current;
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) return;

      const liveDsc = detection.descriptor;
      const storedDescriptors = this.props.storedDescriptors; // [[Number]]

      let matched = false;
      for (const dscArray of storedDescriptors) {
        const stored = new Float32Array(dscArray);
        const dist = faceapi.euclideanDistance(liveDsc, stored);
        if (dist < VERIFY_THRESHOLD) {
          matched = true;
          break;
        }
      }

      if (matched) {
        clearInterval(this.verifyIntervalId);
        clearTimeout(this.verifyTimeoutId);
        this.setState({
          verified: true,
          verifying: false,
          status: "✅ Identity verified!",
        });
        this.stopCamera();
        setTimeout(() => this.props.onVerified(), 1000);
      }
    }, 1000);

    // Timeout
    this.verifyTimeoutId = setTimeout(() => {
      if (!this.state.verified) {
        clearInterval(this.verifyIntervalId);
        this.setState({
          verifyFailed: true,
          verifying: false,
          status: "❌ Verification failed. Face not recognised.",
        });
        this.stopCamera();
        if (this.props.onVerifyFailed) this.props.onVerifyFailed();
      }
    }, VERIFY_TIMEOUT_MS);
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  render() {
    const { mode } = this.props;
    const {
      cameraReady,
      modelsLoaded,
      capturedDescriptors,
      status,
      verified,
      verifyFailed,
      captureFlash,
    } = this.state;

    const done = capturedDescriptors.length >= CAPTURE_COUNT;
    const statusClass = status.startsWith("✅")
      ? "fc-status success"
      : status.startsWith("❌")
        ? "fc-status error"
        : status.startsWith("⚠️")
          ? "fc-status warning"
          : "fc-status";

    return (
      <div className="fc-overlay">
        <div className="fc-modal">
          <h3 className="fc-title">
            {mode === "enroll" ? "📸 Face Enrollment" : "🔍 Face Verification"}
          </h3>
          <p className="fc-subtitle">
            {mode === "enroll"
              ? "Take 5 photos from different angles so we can recognise you later."
              : "Look at the camera to verify your identity before voting."}
          </p>

          {/* Camera view */}
          <div
            className={`fc-video-wrapper ${captureFlash ? "flash" : ""} ${verified ? "verified" : ""} ${verifyFailed ? "failed" : ""}`}
          >
            {!done && (
              <video
                ref={this.videoRef}
                autoPlay
                muted
                playsInline
                className="fc-video"
              />
            )}
            {verified && <div className="fc-big-tick">✔</div>}
            {verifyFailed && <div className="fc-big-cross">✘</div>}
            
            {/* ENROLL PREVIEW: Show the actual captured headshot if done */}
            {mode === "enroll" && this.state.facePhoto && done && (
              <div className="fc-captured-preview">
                <img src={this.state.facePhoto} alt="Captured preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              </div>
            )}
          </div>

          {/* Status message */}
          <p className={statusClass}>{status}</p>

          {/* --- ENROLL: photo strip & capture button --- */}
          {mode === "enroll" && (
            <>
              <div className="fc-strip">
                {Array.from({ length: CAPTURE_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    className={`fc-dot ${i < capturedDescriptors.length ? "filled" : ""}`}
                  >
                    {i < capturedDescriptors.length ? "✔" : i + 1}
                  </div>
                ))}
              </div>
              <button
                className="fc-btn"
                onClick={this.capturePhoto}
                disabled={!cameraReady || !modelsLoaded || done}
              >
                📷 Capture ({capturedDescriptors.length}/{CAPTURE_COUNT})
              </button>
            </>
          )}

          {/* --- VERIFY: animated spinner while checking --- */}
          {mode === "verify" && !verified && !verifyFailed && (
            <div className="fc-spinner" />
          )}
        </div>
      </div>
    );
  }
}
