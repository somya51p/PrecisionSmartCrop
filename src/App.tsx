import VideoClickCapture from './components/VideoClickCapture';

function App() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4 text-center">Precision Smart Crop</h1>
      <VideoClickCapture />
    </div>
  );
}

export default App;
