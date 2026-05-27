// Import necessary libraries and components
import { useState, useRef, useEffect } from 'react'
import { Midi } from '@tonejs/midi'
import SongPlayer from './SongPlayer'

// Map MIDI note numbers to drum names
const DRUM_MAP = {
  38: 'Snare',
  40: 'Snare',
  48: 'Tom 1',
  47: 'Tom 2',
  43: 'Floor Tom',
  42: 'Closed Hi-Hat',
  46: 'Open Hi-Hat',
  49: 'Crash',
  51: 'Ride',
  35: 'Bass Kick',
  36: 'Bass Kick',
}

function App() {
  // State variables for song, MIDI connection, drum hits, and status
  const [song, setSong] = useState(null)
  const midiRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [hits, setHits] = useState([])
  const [status, setStatus] = useState('Not connected')

  // Load the MIDI file and parse it
  useEffect(() => {
    fetch('/src/assets/songs/Bites-The-Dust-1.mid')
      .then(res => res.arrayBuffer())
      .then(buffer => {
        const midi = new Midi(buffer)
        setSong(midi)
      })
  }, [])

  // Connect to the drum kit via MIDI
  function connectDrumKit() {
    navigator.requestMIDIAccess().then(midiAccess => {
      midiRef.current = midiAccess
      setConnected(true)
      setStatus('Connected! Hit a pad...')

      // Listen for MIDI messages
      midiAccess.inputs.forEach(input => {
        input.onmidimessage = msg => {
          if (msg.data[0] >= 248) return

          const [command, note, velocity] = msg.data

          if ((command === 144 || command === 153) && velocity > 0) {
            const drumName = DRUM_MAP[note] || `Unknown pad (note: ${note})`
            setHits(prev => [
              { drumName, note, velocity, time: new Date().toLocaleTimeString() },
              ...prev.slice(0, 29)
            ])
          }
        }
      })
    })
  }

  // Disconnect from the drum kit
  function disconnectDrumKit() {
    if (midiRef.current) {
      midiRef.current.inputs.forEach(input => {
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
      <h1>🥁 DrumSpace</h1>

      {/* Display song information if loaded */}
      {song && (
        <p style={{ color: 'green' }}>
          ✅ Song loaded! BPM: {Math.round(song.header.tempos[0].bpm)} | Tracks: {song.tracks.length}
        </p>
      )}

      <p>Status: <strong>{status}</strong></p>

      {/* Buttons for connecting, disconnecting, and clearing hits */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={connectDrumKit} disabled={connected} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Connect Drum Kit
        </button>
        <button onClick={disconnectDrumKit} disabled={!connected} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Disconnect
        </button>
        <button onClick={() => setHits([])} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Clear
        </button>
      </div>

      {/* Display the list of drum hits */}
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

      {/* Render the SongPlayer component */}
      <SongPlayer song={song} drumHits={hits} />
    </div>
  )
}

export default App