import { useState } from 'react'

function App() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleScan = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/.netlify/functions/claude', {
        method: 'POST',
        body: JSON.stringify({ prompt: `Analyze this soul: ${input}` }),
      });
      const data = await res.json();
      if (data.content && data.content[0]) {
        setResult(data.content[0].text);
      } else {
        setResult("Could not scan soul. " + JSON.stringify(data));
      }
    } catch (error) {
      setResult("Error: " + error.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Sjelsscanner</h1>
      <p>Enter your details to scan your soul.</p>
      <textarea 
        value={input} 
        onChange={e => setInput(e.target.value)} 
        rows={4} 
        cols={50}
        placeholder="Describe yourself..."
      /><br/>
      <button onClick={handleScan} disabled={loading || !input}>
        {loading ? 'Scanning...' : 'Scan Soul'}
      </button>
      
      {result && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc' }}>
          <h2>Scan Result:</h2>
          <p>{result}</p>
        </div>
      )}
    </div>
  )
}

export default App