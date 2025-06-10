import VideoClickCapture from './components/VideoClickCapture';

function App() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {/* <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: 'monospace', background: '#23232a', color: '#fff', padding: '10px 20px', borderRadius: 12, textAlign: 'center', marginBottom: 24 }}>Precision Smart Crop</h1> */}
      <VideoClickCapture />
    </div>
  );
}

export default App;
