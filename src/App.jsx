import { useState } from 'react'

// DRUM_MAP connects note numbers to drum names
// example: when you hit your snare, DTX sends note 38
// so we write 38: 'Snare' here
// we will fill this in tonight after testing with your kit!
const DRUM_MAP = {
  // 38: 'Snare',
  // 36: 'Kick',
  // 42: 'Hi-Hat Closed',
  // we will add your real DTX 532 numbers here
}

function App() {
  // hits = the list of drum hits that appear on screen
  const [hits, setHits] = useState([])

  // status = the text that shows connection state to the user
  const [status, setStatus] = useState('Not connected')

  // midi = stores the MIDI connection so we can disconnect later
  const [midi, setMidi] = useState(null)

  function connectDrumKit() {
    // requestMIDIAccess asks the browser for permission to use MIDI devices
    // this is what triggers the popup asking "Allow MIDI access?"
    navigator.requestMIDIAccess().then(function(midiAccess) {
      setStatus('Connected! Hit a pad...')

      // save the midi connection in state so disconnect button can use it
      setMidi(midiAccess)

      // loop through all connected MIDI devices (your DTX 532 will be one of them)
      midiAccess.inputs.forEach(function(input) {

        // onmidimessage fires every time a pad is hit
        input.onmidimessage = function(msg) {

          // msg.data contains 3 numbers:
          // command = type of MIDI message (144 = note on = pad hit)
          // note = which pad was hit (each pad has a unique number)
          // velocity = how hard you hit it (0-127)
          const [command, note, velocity] = msg.data

          // we only care about "note on" messages with velocity > 0
          // velocity 0 means pad was released, we ignore that
          if (command === 144 && velocity > 0) {

            // look up the drum name in our map
            // if we don't know the note yet show "Unknown pad (note: X)"
            const drumName = DRUM_MAP[note] || `Unknown pad (note: ${note})`

            // add the new hit to the top of the list
            // slice(0, 29) keeps only the last 30 hits so the list doesn't grow forever
            setHits(prev => [
              {
                drumName,
                note,
                velocity,
                time: new Date().toLocaleTimeString()
              },
              ...prev.slice(0, 29)
            ])
          }
        }
      })
    }).catch(function() {
      // if browser doesn't support Web MIDI (Firefox, Safari) show this message
      setStatus('MIDI not supported - use Chrome!')
    })
  }

  function disconnectDrumKit() {
    if (midi) {
      // remove the message listener from every MIDI input
      // this stops the app from receiving drum hits
      midi.inputs.forEach(function(input) {
        input.onmidimessage = null
      })
    }

    // reset everything back to the starting state
    setMidi(null)
    setHits([])
    setStatus('Not connected')
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace' }}>
      <h1>🥁 DrumSpace MIDI Test</h1>

      {/* shows current connection status */}
      <p>Status: <strong>{status}</strong></p>

      {/* button row */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>

        {/* connect button - disabled if already connected */}
        <button
          onClick={connectDrumKit}
          disabled={!!midi}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Connect Drum Kit
        </button>

        {/* disconnect button - disabled if not connected */}
        <button
          onClick={disconnectDrumKit}
          disabled={!midi}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Disconnect
        </button>

        {/* clear button - just empties the hits list */}
        <button
          onClick={() => setHits([])}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>

      {/* instruction text for tonight's testing */}
      <p style={{ color: '#888' }}>
        Hit each pad one by one and note down the number next to "note:" — we will use these tonight!
      </p>

      {/* list of drum hits */}
      <div style={{ marginTop: '10px' }}>
        {hits.map((hit, i) => (
          // most recent hit (i === 0) gets highlighted in dark green
          // older hits get a light grey background
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