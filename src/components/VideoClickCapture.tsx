import React, { useRef, useState } from 'react';

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

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const rect = e.currentTarget.getBoundingClientRect(); // video position on screen
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCoords({ x: Math.round(x), y: Math.round(y) });
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

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <form onSubmit={handleUrlSubmit} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24, gap: 12 }}>
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
          {loading ? 'Loading...' : 'Load Video'}
        </button>
      </form>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {videoId && (
        <div className="mb-2 text-green-700" style={{ textAlign: 'center', marginBottom: 24 }}>Video ID: {videoId}</div>
      )}
      {videoId && videoUrl && (
        <>
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
            style={{ display: 'block', margin: '0 auto' }}
          />
          <div className="flex items-center mt-2 bg-white rounded p-2" style={{ width: "840px", margin: '0 auto' }}>
            <button
              onClick={handlePlayPause}
              className="bg-blue-500 text-white px-4 py-2 rounded mr-4"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <span className="text-black mr-2" style={{ minWidth: 60 }}>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-blue-500"
              style={{ width: 680 }}
            />
            <span className="text-black ml-2" style={{ minWidth: 40 }}>{duration.toFixed(2)}</span>
          </div>
        </>
      )}
      {coords && (
        <div className="mt-4 text-lg">
          🧭 Clicked Coordinates (Bottom-Left Origin):  <br />
          X: {coords.x}, Y: {coords.y}
          <br />
          📸 Frame ID: {frameId}
        </div>
      )}
    </div>
  );
};

export default VideoClickCapture; 