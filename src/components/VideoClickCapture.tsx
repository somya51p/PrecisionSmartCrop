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
        const response = await fetch('https://9610-130-248-126-34.ngrok-free.app/get_mask', {
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
  const handlePause = () => setIsPlaying(false);

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

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setVideoId(null);
    try {
      const response = await fetch('https://9610-130-248-126-34.ngrok-free.app/upload_video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: inputUrl })
      });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      setVideoId(data.video_id);
      setVideoUrl(inputUrl);
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
      const response = await fetch(`https://9610-130-248-126-34.ngrok-free.app/get_smartcrop/${videoId}`, {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'somya' },
      });
      if (!response.ok) throw new Error('Failed to track object');
      const data = await response.json();
      console.log('Data', data);
      setVideoUrl(data.smartcrop_url);
      setMaskData(null);
    } catch (err) {
      // Optionally handle error
    } finally {
      setTrackLoading(false);
    }
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
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                fontSize: 16,
                width: 400,
                marginRight: 12
              }}
            />
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
          </form>
          {error && <div className="text-red-500 mb-2" style={{ textAlign: 'left' }}>{error}</div>}
          {videoUrl && (
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
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    border: '3px solid #2563eb',
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
          {videoId && (
            <div className="mb-2 text-green-700" style={{ textAlign: 'center', marginBottom: 24, color: '#4ade80', fontWeight: 600 }}>
              Video ID: {videoId}
            </div>
          )}
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
          {coords && (
            <div className="mt-4 text-lg" style={{ textAlign: 'center', color: 'white' }}>
              🧭 Clicked Coordinates (Bottom-Left Origin):  <br />
              X: {coords.x}, Y: {coords.y}
              <br />
              📸 Frame ID: {frameId}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoClickCapture; 