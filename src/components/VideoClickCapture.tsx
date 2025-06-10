import React, { useRef, useState, useEffect } from 'react';

const FPS = 30;

type Coords = { x: number; y: number } | null;

const VideoClickCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [frameId, setFrameId] = useState<number>(0);
  const [coords, setCoords] = useState<Coords>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [inputUrl, setInputUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('https://smartimaging.scene7.com/is/content/AEMDevLabs1/ather-original');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maskData, setMaskData] = useState<number[][] | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [totalFrames, setTotalFrames] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const API_BASE = process.env.REACT_APP_API_BASE_URL;
  console.log('API_BASE', API_BASE);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleClick = async (e: React.MouseEvent<HTMLVideoElement>) => {
    const rect = e.currentTarget.getBoundingClientRect(); // video position on screen
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    // Scale to original video size
    const video = videoRef.current;
    let x = Math.round(displayX);
    let y = Math.round(displayY);
    if (video) {
      const scaleX = video.videoWidth / rect.width;
      const scaleY = video.videoHeight / rect.height;
      x = Math.round(displayX * scaleX);
      y = Math.round(displayY * scaleY);
    }
    setCoords({ x, y });

    // Only call API if videoId and frameId are available
    if (videoId && typeof frameId === 'number') {
      try {
        const response = await fetch(`${API_BASE}/get_mask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_id: videoId,
            frame_id: frameId,
            points: [[x, y]],
            labels: [1]
          })
        });
        if (!response.ok) throw new Error('Failed to get mask');
        const data = await response.json();
        setMaskData(data.mask_data);
      } catch (err) {
        setMaskData(null);
      }
    }
  };

  // Keep isPlaying in sync with video events
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      let frame = Math.floor((videoRef.current.currentTime || 0) * FPS);
      if (totalFrames !== null) {
        frame = Math.min(frame, totalFrames - 1);
      }
      setFrameId(frame);
    }
  };

  // Update current time as video plays
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Set duration when metadata is loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Seek video when slider is changed
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      let frame = Math.floor(time * FPS);
      if (totalFrames !== null) {
        frame = Math.min(frame, totalFrames - 1);
      }
      setFrameId(frame);
    }
  };

  // Format time as mm:ss.SSS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputUrl(e.target.value);
  };

  const handleCopyUrl = () => {
    if (inputUrl) {
      navigator.clipboard.writeText(inputUrl);
      setCopied(true);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setVideoId(null);
    try {
      const response = await fetch(`${API_BASE}/upload_video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: inputUrl })
      });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      setVideoId(data.video_id);
      setVideoUrl(inputUrl);
      setTotalFrames(data.total_frames);
    } catch (err: any) {
      setError('Failed to process video.');
    } finally {
      setLoading(false);
    }
  };

  // Draw mask overlay on canvas when maskData changes
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!maskData || !canvasRef.current || !videoRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    ctx.clearRect(0, 0, width, height);
    const imageData = ctx.createImageData(width, height);
    // Draw mask
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (maskData[y] && maskData[y][x] === 1) {
          imageData.data[idx] = 0;     // R
          imageData.data[idx + 1] = 200; // G
          imageData.data[idx + 2] = 255; // B
          imageData.data[idx + 3] = 100; // Alpha (semi-transparent)
        } else {
          imageData.data[idx + 3] = 0; // Fully transparent
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Draw border (blue, 2px thick)
    ctx.save();
    ctx.strokeStyle = '#2196f3'; // blue
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (maskData[y] && maskData[y][x] === 1) {
          // Check 4-neighbors for border
          if (
            !maskData[y][x - 1] ||
            !maskData[y][x + 1] ||
            !(maskData[y - 1] && maskData[y - 1][x]) ||
            !(maskData[y + 1] && maskData[y + 1][x])
          ) {
            ctx.moveTo(x + 0.5, y + 0.5);
            ctx.lineTo(x + 0.5, y + 0.5);
          }
        }
      }
    }
    ctx.stroke();
    ctx.restore();
  }, [maskData, videoRef.current?.videoWidth, videoRef.current?.videoHeight]);

  // Track object handler
  const handleTrackObject = async () => {
    console.log('Tracking object', videoId);
    if (!videoId) return;
    setTrackLoading(true);
    try {
      const response = await fetch(`${API_BASE}/get_smartcrop/${videoId}`, {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'somya' },
      });
      if (!response.ok) throw new Error('Failed to track object');
      const data = await response.json();
      console.log('Data', data);
      setVideoUrl('');
      setInputUrl(data.smartcrop_url);
      setVideoId('');
      setMaskData(null);
    } catch (err) {
      // Optionally handle error
    } finally {
      setTrackLoading(false);
    }
  };

  // Handler to clear only the mask
  const handleStartOver = () => {
    setMaskData(null);
    setCoords(null);
  };

  // Handler to reset everything (change video)
  const handleChangeVideo = () => {
    setVideoId(null);
    setVideoUrl('');
    setInputUrl('');
    setMaskData(null);
    setCoords(null);
    setFrameId(0);
    setCurrentTime(0);
    setDuration(0);
    setTotalFrames(null);
    setError(null);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto" style={{ minHeight: '100vh', background: '#18181b', paddingTop: 70 }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 40, alignItems: 'flex-start', justifyContent: 'center' }}>
        {/* Left column: Video, input, controls */}
        <div style={{ background: '#23232a', borderRadius: 16, padding: 24, boxSizing: 'border-box' }}>
          <form onSubmit={handleUrlSubmit} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24, gap: 12, width: '100%' }}>
            <input
              type="text"
              value={inputUrl}
              onChange={handleUrlChange}
              placeholder="Enter video URL"
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                fontSize: 16,
                width: 400,
                marginRight: 12
              }}
              disabled={videoId === '' && !!inputUrl}
            />
            {videoId === '' && inputUrl ? (
              <button
                type="button"
                onClick={handleCopyUrl}
                style={{
                  background: copied ? '#22c55e' : '#2563eb',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                }}
              >
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
            ) : (
              <button
                type="submit"
                style={{
                  background: '#2563eb',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                }}
                disabled={loading}
              >
                {loading ? 'Importing...' : 'Import Video'}
              </button>
            )}
          </form>
          {error && <div className="text-red-500 mb-2" style={{ textAlign: 'left', color: '#fff' }}>{error}</div>}
          {videoId && videoUrl && (
            <div style={{ position: 'relative', width: 840, margin: '0 auto' }}>
              <video
                ref={videoRef}
                width="840"
                onClick={handleClick}
                onPause={() => {
                  setFrameId(Math.floor((videoRef.current?.currentTime || 0) * FPS));
                  handlePause();
                }}
                onPlay={handlePlay}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                controls={false}
                src={videoUrl}
                style={{ display: 'block', margin: '0 auto', borderRadius: 8 }}
              />
              {maskData && (
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    pointerEvents: 'none',
                    width: '840px',
                    height: videoRef.current ? `${videoRef.current.clientHeight}px` : 'auto',
                    zIndex: 2,
                    borderRadius: 8
                  }}
                />
              )}
              <div className="flex items-center mt-2 bg-white rounded p-2" style={{ width: "800px", margin: '0 auto', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, background: '#23232a', padding: '16px', borderRadius: 12 }}>
                <button
                  onClick={handlePlayPause}
                  className="bg-blue-500 text-white rounded-full mr-4"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    minWidth: 48,
                    minHeight: 48,
                    background: '#fff',
                    margin: 0,
                    borderRadius: '50%'
                  }}
                >
                  {isPlaying ? (
                    // Pause icon
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="4" y="3" width="4" height="14" rx="1" fill="#2563eb"/>
                      <rect x="12" y="3" width="4" height="14" rx="1" fill="#2563eb"/>
                    </svg>
                  ) : (
                    // Play icon
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="5,3 17,10 5,17" fill="#2563eb" />
                    </svg>
                  )}
                </button>
                <span className="mr-2" style={{ minWidth: 80, color: '#fff', fontSize: 22, fontFamily: 'monospace' }}>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.01}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 accent-blue-500"
                  style={{ width: 650, height: 8 }}
                />
                <span className="ml-2" style={{ minWidth: 60, color: '#fff', fontSize: 22, fontFamily: 'monospace' }}>{duration.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
        {/* Right column: Buttons, info, status */}
        <div style={{ minWidth: 320, maxWidth: 400, background: '#23232a', borderRadius: 16, padding: 24, color: 'white', minHeight: 500 }}>
          {/* {videoId && (
            <div className="mb-2 text-green-700" style={{ textAlign: 'center', marginBottom: 24, color: '#4ade80', fontWeight: 600 }}>
              Video ID: {videoId}
            </div>
          )} */}
          {!videoId && (
            <div style={{ color: '#fff', background: 'rgba(36,36,36,0.85)', borderRadius: 16, padding: 20, fontSize: 16, textAlign: 'center', fontWeight: 400, marginBottom: 24 }}>
              <span style={{ fontSize: 15, color: '#a3a3a3' }}>
              Precision Smart Crop automatically detects and focuses on objects you select in a video. By clicking on any object, a mask will highlight it, and you can track and crop the video to keep that object in focus throughout the clip. 
              <br/><br/>This enables precise, object-centric video editing and smart cropping with just a few clicks.
              </span>
            </div>
          )}
          {videoId === '' && inputUrl && (
            <div style={{ color: '#fff', background: 'rgba(36,36,36,0.85)', borderRadius: 16, padding: 20, fontSize: 16, textAlign: 'center', fontWeight: 400, marginBottom: 24 }}>
              <span style={{ fontSize: 15, color: '#a3a3a3' }}>
                The smartcrop URL has been generated!<br/>
                You can copy it and play around with it.
              </span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
            {(videoId || (videoId === '' && inputUrl)) && <button
              onClick={handleChangeVideo}
              style={{
                width: '100%',
                background: '#111',
                color: '#fff',
                padding: '16px 0',
                borderRadius: 9999,
                border: 'none',
                fontWeight: 600,
                fontSize: 18,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                letterSpacing: 0.5
              }}
            >
              <span style={{marginLeft: 6}}>Change video</span>
            </button>}
            {coords && videoId ? (
              <button
                onClick={handleStartOver}
                style={{
                  width: '100%',
                  background: '#111',
                  color: '#fff',
                  padding: '16px 0',
                  borderRadius: 9999,
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 18,
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  letterSpacing: 0.5
                }}
                disabled={!maskData}
              >
                <span style={{marginLeft: 6}}>Start over</span>
              </button>
            ) : videoId && (
              <div style={{ color: '#fff', background: 'rgba(36,36,36,0.85)', borderRadius: 16, padding: 20, fontSize: 16, textAlign: 'center', fontWeight: 400 }}>
                <span style={{ fontSize: 15, color: '#a3a3a3' }}>
                A mask will appear over the object you select, and you'll be able to focus on and track that object throughout the video.<br/>
                  <br/>
                  To start, click any object in the video.
                </span>
              </div>
            )}
          </div>
          {maskData && (
            <button
              onClick={handleTrackObject}
              disabled={trackLoading}
              style={{
                width: '100%',
                marginBottom: 32,
                background: '#2563eb',
                color: 'white',
                padding: '14px 0',
                borderRadius: 8,
                border: 'none',
                fontWeight: 600,
                fontSize: 18,
                cursor: trackLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
              }}
            >
              {trackLoading ? 'Tracking...' : 'Track object'}
            </button>
          )}
          {/* {coords && (
            <div className="mt-4 text-lg" style={{ textAlign: 'center', color: 'white' }}>
              🧭 Clicked Coordinates (Bottom-Left Origin):  <br />
              X: {coords.x}, Y: {coords.y}
              <br />
              📸 Frame ID: {frameId}
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default VideoClickCapture; 