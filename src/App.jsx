import { useState, useRef } from 'react'

const DRUM_MAP = {}

function App() {
  const [hits, setHits] = useState([])
  const [status, setStatus] = useState('Not connected')
  const [connected, setConnected] = useState(false)
  const midiRef = useRef(null)

  function connectDrumKit() {
    navigator.requestMIDIAccess().then(function(midiAccess) {
      midiRef.current = midiAccess
      setConnected(true)
      setStatus('Connected! Hit a pad...')

      midiAccess.inputs.forEach(function(input) {
        console.log('Attaching listener to:', input.name)

        input.onmidimessage = function(msg) {
          if (msg.data[0] >= 248) return

          const [command, note, velocity] = msg.data
          console.log('MIDI message:', command, note, velocity)

          if ((command === 144 || command === 153) && velocity > 0) {
            const drumName = DRUM_MAP[note] || `Unknown pad (note: ${note})`
            setHits(prev => [
              { drumName, note, velocity, time: new Date().toLocaleTimeString() },
              ...prev.slice(0, 29)
            ])
          }
        }
      })
    }).catch(function(err) {
      console.log('MIDI error:', err)
      setStatus('MIDI not supported - use Chrome!')
    })
  }

  function disconnectDrumKit() {
    if (midiRef.current) {
      midiRef.current.inputs.forEach(function(input) {
        input.onmidimessage = null
      })
      midiRef.current = null
    }
    setConnected(false)
    setHits([])
    setStatus('Not connected')
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace' }}>
      <h1>🥁 DrumSpace MIDI Test</h1>
      <p>Status: <strong>{status}</strong></p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={connectDrumKit}
          disabled={connected}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Connect Drum Kit
        </button>

        <button
          onClick={disconnectDrumKit}
          disabled={!connected}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Disconnect
        </button>

        <button
          onClick={() => setHits([])}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>

      <p style={{ color: '#888' }}>
        Hit each pad one by one and note down the number next to "note:"
      </p>

      <div style={{ marginTop: '10px' }}>
        {hits.map((hit, i) => (
          <div
            key={i}
            style={{
              padding: '6px 10px',
              marginBottom: '4px',
              background: i === 0 ? '#1a1a2e' : '#f5f5f5',
              color: i === 0 ? '#00ff88' : '#333',
              borderRadius: '4px'
            }}
          >
            [{hit.time}] 🥁 {hit.drumName} | velocity: {hit.velocity}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App