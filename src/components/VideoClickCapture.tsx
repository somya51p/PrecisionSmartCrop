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

  return (
    <div className="p-4 max-w-xl mx-auto">
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
        src="https://smartimaging.scene7.com/is/content/AEMDevLabs1/ather-original"
        style={{ display: 'block', margin: '0 auto' }}
      />
      <div className="flex items-center mt-2 bg-white rounded p-2" style={{ width: "840px", margin: '0 auto' }}>
        <button
          onClick={handlePlayPause}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-4"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <span className="text-black mr-2" style={{ minWidth: 100 }}>{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 accent-blue-500"
          style={{ width: 400 }}
        />
        <span className="text-black ml-2" style={{ minWidth: 40 }}>{formatTime(duration)}</span>
      </div>

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