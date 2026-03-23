"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ChevronRight, Camera, RotateCcw, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react"

type AuthStep = "wallet" | "faceScan" | "result"
type ResultState = "success" | "rejected" | "duplicate" | null
type FacePositionStatus = "no-face" | "too-far" | "too-left" | "too-right" | "too-high" | "too-low" | "perfect" | null

const API_BASE = "https://329eb4d0-5825-4b28-88c7-a169ac1fad0e-00-1rqlr71r5qxn1.worf.replit.dev/flask-api/auth"
const FACE_API_CDN = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"
const MODELS_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights"

declare global {
  interface Window {
    faceapi: typeof import("face-api.js")
  }
}

export function HexGateAuth() {
  const [step, setStep] = useState<AuthStep>("wallet")
  const [walletAddress, setWalletAddress] = useState("")
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [resultState, setResultState] = useState<ResultState>(null)
  const [resultMessage, setResultMessage] = useState("")
  const [cameraError, setCameraError] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelLoadProgress, setModelLoadProgress] = useState("")
  const [modelLoadError, setModelLoadError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [facePositionStatus, setFacePositionStatus] = useState<FacePositionStatus>(null)
  const [holdCountdown, setHoldCountdown] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load face-api.js script from CDN
  const loadFaceApiScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.faceapi) {
        resolve()
        return
      }

      const script = document.createElement("script")
      script.src = FACE_API_CDN
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("Failed to load face-api.js"))
      document.head.appendChild(script)
    })
  }, [])

  // Load face-api.js models - returns a promise
  const loadModels = useCallback(async (): Promise<boolean> => {
    if (modelsLoaded) return true
    if (loadingModels) return false

    setLoadingModels(true)
    setModelLoadError(null)
    setModelLoadProgress("Loading face-api.js...")

    try {
      await loadFaceApiScript()

      const faceapi = window.faceapi
      if (!faceapi) {
        throw new Error("face-api.js not available")
      }

      setModelLoadProgress("Loading face detector... (1/2)")
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL)

      setModelLoadProgress("Loading recognition model... (2/2)")
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL)

      setModelLoadProgress("")
      setModelsLoaded(true)
      setLoadingModels(false)
      return true
    } catch (error) {
      console.error("Error loading models:", error)
      setModelLoadError(error instanceof Error ? error.message : "Failed to load face detection models")
      setLoadingModels(false)
      return false
    }
  }, [modelsLoaded, loadingModels, loadFaceApiScript])

  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      setCameraError(false)
      setCameraReady(false)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 320 }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve()
          }
        })
      }
      setCameraReady(true)
      return true
    } catch {
      setCameraError(true)
      return false
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current)
      faceDetectionIntervalRef.current = null
    }
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    setFacePositionStatus(null)
    setHoldCountdown(null)
  }, [])

  // Analyze face position in frame
  const analyzeFacePosition = useCallback(async (): Promise<FacePositionStatus> => {
    const faceapi = window.faceapi
    if (!faceapi || !videoRef.current) return "no-face"

    try {
      const video = videoRef.current
      const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())

      if (!detection) {
        return "no-face"
      }

      const box = detection.box
      const videoWidth = video.videoWidth || 320
      const videoHeight = video.videoHeight || 320

      // Calculate face size relative to frame (30% threshold)
      const faceArea = box.width * box.height
      const frameArea = videoWidth * videoHeight
      const faceSizeRatio = faceArea / frameArea

      if (faceSizeRatio < 0.09) { // Face smaller than ~30% of frame dimension
        return "too-far"
      }

      // Calculate face center position
      const faceCenterX = box.x + box.width / 2
      const faceCenterY = box.y + box.height / 2

      // Check horizontal position (middle 50% of frame)
      const leftBound = videoWidth * 0.25
      const rightBound = videoWidth * 0.75
      if (faceCenterX < leftBound) {
        return "too-right" // Mirrored video, so left in frame = right for user
      }
      if (faceCenterX > rightBound) {
        return "too-left" // Mirrored video
      }

      // Check vertical position (middle 60% of frame)
      const topBound = videoHeight * 0.2
      const bottomBound = videoHeight * 0.8
      if (faceCenterY < topBound) {
        return "too-high"
      }
      if (faceCenterY > bottomBound) {
        return "too-low"
      }

      return "perfect"
    } catch {
      return "no-face"
    }
  }, [])

  // Start continuous face detection loop
  const startFaceDetectionLoop = useCallback(() => {
    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current)
    }

    faceDetectionIntervalRef.current = setInterval(async () => {
      if (!modelsLoaded || isScanning) return

      const status = await analyzeFacePosition()
      setFacePositionStatus(status)

      // Handle perfect position auto-trigger
      if (status === "perfect") {
        if (!holdTimerRef.current) {
          setHoldCountdown(2)
          
          // Start countdown
          let countdown = 2
          const countdownInterval = setInterval(() => {
            countdown -= 1
            setHoldCountdown(countdown)
            if (countdown <= 0) {
              clearInterval(countdownInterval)
            }
          }, 1000)

          holdTimerRef.current = setTimeout(() => {
            clearInterval(countdownInterval)
            setHoldCountdown(null)
            holdTimerRef.current = null
            // Auto-trigger scan
            handleFaceScanRef.current?.()
          }, 2000)
        }
      } else {
        // Cancel countdown if face moves
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current)
          holdTimerRef.current = null
          setHoldCountdown(null)
        }
      }
    }, 200) // Check every 200ms
  }, [modelsLoaded, isScanning, analyzeFacePosition])

  // Ref to hold handleFaceScan for auto-trigger
  const handleFaceScanRef = useRef<(() => void) | null>(null)

  // Sequential initialization: load models FIRST, then start camera, then face detection loop
  useEffect(() => {
    let isMounted = true

    const initializeFaceScan = async () => {
      if (step !== "faceScan") {
        stopCamera()
        setCameraReady(false)
        return
      }

      // Step 1: Load all models FIRST
      const modelsReady = await loadModels()
      if (!isMounted || !modelsReady) return

      // Step 2: THEN start the camera
      const cameraStarted = await startCamera()
      if (!isMounted || !cameraStarted) return

      // Step 3: Start face detection loop
      startFaceDetectionLoop()
    }

    initializeFaceScan()

    return () => {
      isMounted = false
      stopCamera()
    }
  }, [step, startCamera, stopCamera, loadModels, startFaceDetectionLoop])

  const handleWalletContinue = () => {
    if (walletAddress.trim()) {
      setStep("faceScan")
    }
  }

  // Extract face descriptor from current video frame
  const extractFaceDescriptor = async (): Promise<Float32Array | null> => {
    const faceapi = window.faceapi
    if (!faceapi || !videoRef.current) return null

    const video = videoRef.current

    // Detect face with landmarks and descriptor
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceDescriptor()

    if (!detection) {
      return null
    }

    return detection.descriptor
  }

  const handleFaceScan = async () => {
    if (!modelsLoaded) {
      setModelLoadError("Models still loading, please wait...")
      return
    }

    // Clear auto-trigger timer
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    setHoldCountdown(null)

    // Stop face detection loop during scan
    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current)
      faceDetectionIntervalRef.current = null
    }

    setIsScanning(true)
    setModelLoadError(null)

    try {
      // Brief pause for stability
      await new Promise(resolve => setTimeout(resolve, 500))

      // Extract face descriptor
      const descriptor = await extractFaceDescriptor()

      if (!descriptor) {
        setIsScanning(false)
        setModelLoadError("No face detected. Please position your face in the frame and try again.")
        return
      }

      // Convert Float32Array to regular array for JSON
      const faceEmbedding = Array.from(descriptor)

      // Call the appropriate API endpoint
      const endpoint = isRegisterMode ? `${API_BASE}/register` : `${API_BASE}/login`
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          celo_address: walletAddress,
          face_embedding: faceEmbedding,
        }),
      })

      const data = await response.json()

      if (response.status === 200 || response.status === 201) {
        // Success - save JWT token
        if (data.token) {
          localStorage.setItem("hexgate_jwt", data.token)
        }
        setResultState("success")
        setResultMessage(isRegisterMode ? "Registration successful!" : "Login successful!")
        // Redirect to hub after 2 seconds
        setTimeout(() => { window.location.href = "/hub" }, 2000)
      } else if (response.status === 401) {
        // Face not recognized
        setResultState("rejected")
        setResultMessage(data.message || "Face not recognized")
      } else if (response.status === 409) {
        // Duplicate face
        setResultState("duplicate")
        setResultMessage(data.message || "Face already linked to another wallet")
      } else {
        // Other error
        setResultState("rejected")
        setResultMessage(data.message || "Authentication failed")
      }

      setStep("result")
    } catch (error) {
      console.error("Face scan error:", error)
      setIsScanning(false)
      setModelLoadError(error instanceof Error ? error.message : "Failed to process face scan")
    } finally {
      setIsScanning(false)
    }
  }

  // Keep ref updated for auto-trigger callback
  useEffect(() => {
    handleFaceScanRef.current = handleFaceScan
  })

  const handleRetry = () => {
    setResultState(null)
    setResultMessage("")
    setModelLoadError(null)
    setCameraReady(false)
    setFacePositionStatus(null)
    setStep("faceScan")
  }

  const handleStartOver = () => {
    setWalletAddress("")
    setResultState(null)
    setResultMessage("")
    setModelLoadError(null)
    setCameraReady(false)
    setFacePositionStatus(null)
    setStep("wallet")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Hidden canvas for face detection */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="absolute inset-0 w-24 h-24 bg-accent/30 rounded-full blur-xl opacity-70" />
            <img
              src="https://i.imgur.com/NoeK2tc.png"
              alt="HexGate Logo"
              className="relative w-20 h-20 object-contain animate-float drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]"
              crossOrigin="anonymous"
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent">
              HexGate
            </span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm tracking-widest uppercase">
            Seijin Ecosystem — Identity Verification
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl">
          {/* Step 1: Wallet Input */}
          {step === "wallet" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="space-y-2">
                <Label htmlFor="wallet" className="text-foreground text-sm font-medium">
                  Enter your Celo Wallet Address
                </Label>
                <Input
                  id="wallet"
                  type="text"
                  placeholder="0x..."
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12 font-mono text-sm"
                />
                <p className="text-muted-foreground text-xs mt-2">
                  Your wallet is your identity
                </p>
              </div>
              <Button
                onClick={handleWalletContinue}
                disabled={!walletAddress.trim()}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base gap-2"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Step 2: Face Scan */}
          {step === "faceScan" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Initialization Loading Screen */}
              {(loadingModels || (!modelsLoaded && !modelLoadError)) && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-20 h-20 rounded-full border-4 border-accent/30 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-accent animate-spin" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Initializing HexGate...</h3>
                    <p className="text-sm text-muted-foreground">
                      {modelLoadProgress || "Loading face detection models"}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      First visit takes 1-2 mins. Instant after that.
                    </p>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full max-w-xs h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-accent to-primary rounded-full transition-all duration-500"
                      style={{ 
                        width: modelLoadProgress.includes("1/2") ? "50%" 
                             : modelLoadProgress.includes("2/2") ? "90%"
                             : "10%",
                        animation: "pulse 1.5s ease-in-out infinite"
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Camera Ready State - Only show after models are loaded */}
              {modelsLoaded && !loadingModels && (
                <>
                  {/* Webcam Preview with Face Guide */}
                  <div className="relative flex items-center justify-center">
                    <div className={`relative w-56 h-56 rounded-full overflow-hidden border-4 transition-colors duration-300 ${
                      isScanning ? 'border-accent' 
                        : facePositionStatus === 'perfect' ? 'border-success' 
                        : cameraReady ? 'border-border' 
                        : 'border-border'
                    }`}>
                      {/* Scanning ring animation */}
                      {isScanning && (
                        <>
                          <div className="absolute inset-0 rounded-full border-4 border-accent/50 animate-ping" />
                          <div className="absolute inset-[-8px] rounded-full border-2 border-accent animate-spin" style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
                        </>
                      )}
                      
                      {/* Webcam video */}
                      {cameraError ? (
                        <div className="w-full h-full bg-secondary flex flex-col items-center justify-center text-muted-foreground">
                          <Camera className="w-12 h-12 mb-2 opacity-50" />
                          <span className="text-xs">Camera unavailable</span>
                        </div>
                      ) : (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                      )}

                      {/* Face positioning oval guide overlay */}
                      {cameraReady && !isScanning && !cameraError && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div 
                            className={`w-32 h-40 rounded-full border-2 border-dashed transition-all duration-300 ${
                              facePositionStatus === 'perfect' 
                                ? 'border-success shadow-[0_0_20px_rgba(34,197,94,0.5),inset_0_0_20px_rgba(34,197,94,0.1)]' 
                                : facePositionStatus === 'no-face'
                                ? 'border-destructive/60'
                                : 'border-warning/60'
                            }`}
                          />
                          {/* Corner markers */}
                          <div className={`absolute top-8 left-10 w-4 h-4 border-t-2 border-l-2 rounded-tl transition-colors duration-300 ${
                            facePositionStatus === 'perfect' ? 'border-success' : 'border-muted-foreground/40'
                          }`} />
                          <div className={`absolute top-8 right-10 w-4 h-4 border-t-2 border-r-2 rounded-tr transition-colors duration-300 ${
                            facePositionStatus === 'perfect' ? 'border-success' : 'border-muted-foreground/40'
                          }`} />
                          <div className={`absolute bottom-8 left-10 w-4 h-4 border-b-2 border-l-2 rounded-bl transition-colors duration-300 ${
                            facePositionStatus === 'perfect' ? 'border-success' : 'border-muted-foreground/40'
                          }`} />
                          <div className={`absolute bottom-8 right-10 w-4 h-4 border-b-2 border-r-2 rounded-br transition-colors duration-300 ${
                            facePositionStatus === 'perfect' ? 'border-success' : 'border-muted-foreground/40'
                          }`} />
                        </div>
                      )}

                      {/* Hold countdown overlay */}
                      {holdCountdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-success/10">
                          <div className="text-4xl font-bold text-success animate-pulse">
                            {holdCountdown}
                          </div>
                        </div>
                      )}

                      {/* Glow effect when scanning */}
                      {isScanning && (
                        <div className="absolute inset-0 bg-accent/10 animate-pulse" />
                      )}

                      {/* Perfect position glow */}
                      {facePositionStatus === 'perfect' && !isScanning && (
                        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_30px_rgba(34,197,94,0.3)] pointer-events-none" />
                      )}
                    </div>
                  </div>

                  {/* Real-time face positioning feedback */}
                  <div className="text-center text-sm min-h-[24px]">
                    {isScanning ? (
                      <span className="text-accent font-medium">Analyzing face...</span>
                    ) : !cameraReady ? (
                      <span className="text-muted-foreground">Starting camera...</span>
                    ) : facePositionStatus === 'no-face' ? (
                      <span className="text-destructive font-medium">No face detected — look directly at the camera</span>
                    ) : facePositionStatus === 'too-far' ? (
                      <span className="text-warning font-medium">Move closer to the camera</span>
                    ) : facePositionStatus === 'too-left' ? (
                      <span className="text-warning font-medium">Center your face in the frame</span>
                    ) : facePositionStatus === 'too-right' ? (
                      <span className="text-warning font-medium">Center your face in the frame</span>
                    ) : facePositionStatus === 'too-high' ? (
                      <span className="text-warning font-medium">Adjust your camera angle — face too high</span>
                    ) : facePositionStatus === 'too-low' ? (
                      <span className="text-warning font-medium">Adjust your camera angle — face too low</span>
                    ) : facePositionStatus === 'perfect' ? (
                      <span className="text-success font-medium">
                        {holdCountdown !== null ? `Hold still... ${holdCountdown}` : 'Hold still...'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Position your face in the oval guide</span>
                    )}
                  </div>

                  {/* Error message */}
                  {modelLoadError && (
                    <p className="text-center text-destructive text-sm">
                      {modelLoadError}
                    </p>
                  )}

                  <Button
                    onClick={handleFaceScan}
                    disabled={isScanning || cameraError || !cameraReady || holdCountdown !== null}
                    className={`w-full h-12 font-semibold text-base gap-2 transition-all duration-300 ${
                      facePositionStatus === 'perfect' && !isScanning
                        ? 'bg-success hover:bg-success/90 text-white'
                        : 'bg-accent hover:bg-accent/90 text-accent-foreground'
                    } disabled:opacity-50`}
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Scanning...
                      </>
                    ) : !cameraReady ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Starting Camera...
                      </>
                    ) : holdCountdown !== null ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Auto-scanning in {holdCountdown}...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        Scan Face
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Model Load Error State */}
              {modelLoadError && !loadingModels && (
                <div className="text-center py-8 space-y-4">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl" />
                    <div className="relative w-16 h-16 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-destructive" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-destructive">Failed to Initialize</h3>
                    <p className="text-sm text-muted-foreground mt-1">{modelLoadError}</p>
                  </div>
                  <Button
                    onClick={() => {
                      setModelLoadError(null)
                      loadModels()
                    }}
                    className="bg-secondary hover:bg-secondary/80 text-foreground gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retry
                  </Button>
                </div>
              )}

              {/* Register/Login Toggle */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <Label htmlFor="mode-toggle" className="text-muted-foreground text-sm cursor-pointer">
                  Registering for first time?
                </Label>
                <Switch
                  id="mode-toggle"
                  checked={isRegisterMode}
                  onCheckedChange={setIsRegisterMode}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Mode: <span className="text-foreground font-medium">{isRegisterMode ? "Register" : "Login"}</span>
              </p>
            </div>
          )}

          {/* Step 3: Result States */}
          {step === "result" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Success State */}
              {resultState === "success" && (
                <div className="text-center space-y-4">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 bg-success/30 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-24 h-24 rounded-full bg-success/20 border-2 border-success flex items-center justify-center">
                      <CheckCircle2 className="w-12 h-12 text-success" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-success">Identity Verified</h2>
                    <p className="text-muted-foreground text-sm mt-1">{resultMessage || "Entering Hub..."}</p>
                  </div>
                  <div className="pt-4">
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-success animate-[loading_2s_ease-in-out_infinite]" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Rejected State */}
              {resultState === "rejected" && (
                <div className="text-center space-y-4">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 bg-destructive/30 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-24 h-24 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center">
                      <XCircle className="w-12 h-12 text-destructive" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-destructive">Face Not Recognized</h2>
                    <p className="text-muted-foreground text-sm mt-1">{resultMessage || "Try again with better lighting"}</p>
                  </div>
                  <Button
                    onClick={handleRetry}
                    className="w-full h-12 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-base gap-2 border border-border"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Try Again
                  </Button>
                </div>
              )}

              {/* Duplicate State */}
              {resultState === "duplicate" && (
                <div className="text-center space-y-4">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 bg-warning/30 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-24 h-24 rounded-full bg-warning/20 border-2 border-warning flex items-center justify-center">
                      <AlertTriangle className="w-12 h-12 text-warning" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-warning">Duplicate Detected</h2>
                    <p className="text-muted-foreground text-sm mt-1">{resultMessage || "Face already linked to another wallet"}</p>
                  </div>
                  <Button
                    onClick={handleStartOver}
                    className="w-full h-12 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-base gap-2 border border-border"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Start Over
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {["wallet", "faceScan", "result"].map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                step === s
                  ? "bg-primary w-6"
                  : ["wallet", "faceScan", "result"].indexOf(step) > i
                  ? "bg-primary/50"
                  : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-xs mt-8">
          Protected by HexGate Security Protocol
        </p>
      </div>
    </div>
  )
}
