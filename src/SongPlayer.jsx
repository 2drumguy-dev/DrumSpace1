// Import necessary React hooks
import { useEffect, useRef, useState } from 'react'
// Import Tone.js for audio playback
import * as Tone from 'tone'

// Define colors for each drum lane
const LANE_COLORS = {
  'Closed Hi-Hat': '#4A90D9',
  'Snare': '#E74C3C',
  'Bass Kick': '#E67E22',
  'Crash': '#9B59B6',
  'Open Hi-Hat': '#1ABC9C',
  'Tom 1': '#27AE60',
  'Tom 2': '#27AE60',
  'Floor Tom': '#27AE60',
  'Ride': '#F39C12',
}

// Define the order of drum lanes
const LANES = [
  'Crash',
  'Closed Hi-Hat',
  'Open Hi-Hat',
  'Snare',
  'Tom 1',
  'Tom 2',
  'Floor Tom',
  'Bass Kick',
]

// Constants for lane and note dimensions
const LANE_HEIGHT = 50
const NOTE_WIDTH = 30
const HIT_LINE_X = 200
const SCROLL_SPEED = 200

// Helper function to get the current time in seconds
function nowSeconds() {
  if (typeof globalThis !== 'undefined' && globalThis.performance?.now) {
    return globalThis.performance.now() / 1000
  }
  return Date.now() / 1000
}

// Map MIDI note numbers to drum names
function getDrumName(midi) {
  const map = {
    38: 'Snare', 40: 'Snare',
    48: 'Tom 1', 47: 'Tom 2',
    43: 'Floor Tom',
    42: 'Closed Hi-Hat', 46: 'Open Hi-Hat',
    49: 'Crash', 51: 'Ride',
    35: 'Bass Kick', 36: 'Bass Kick',
  }
  return map[midi] || null
}

export default function SongPlayer({ song, drumHits }) {
  // Refs for canvas, animation, and start time
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const startTimeRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const notesRef = useRef([])
  const synthRef = useRef(null) // Ref to store the Tone.PolySynth instance

  // Parse the song and extract drum notes
  useEffect(() => {
    if (!song) return

    const drumTrack = song.tracks[18]

    notesRef.current = drumTrack.notes.map(note => ({
      time: note.time,
      midi: note.midi,
      drumName: getDrumName(note.midi),
      hit: null,
    })).filter(n => n.drumName !== null)

  }, [song])

  // Start playing the song and audio
  async function startSong() {
    if (!song) return

    // Start visual playback
    startTimeRef.current = nowSeconds()
    setPlaying(true)
    animate()

    // Initialize Tone.PolySynth
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination()
      await Tone.start()
    }

    const synth = synthRef.current
    const now = Tone.now()

    // Schedule MIDI notes for playback
    song.tracks.forEach(track => {
      track.notes.forEach(note => {
        synth.triggerAttackRelease(Tone.Frequency(note.midi, 'midi').toNote(), note.duration, now + note.time)
      })
    })
  }

  // Stop playing the song
  function stopSong() {
    setPlaying(false)
    if (animationRef.current) cancelAnimationFrame(animationRef.current)

    // Dispose the synth to stop all sounds
    if (synthRef.current) {
      synthRef.current.disconnect()
      synthRef.current.dispose()
      synthRef.current = null
    }
  }

  // Animate the drum notes on the canvas
  function animate() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const elapsed = nowSeconds() - startTimeRef.current

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw the background and lanes
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    LANES.forEach((lane, i) => {
      const y = i * LANE_HEIGHT

      ctx.fillStyle = i % 2 === 0 ? '#16213e' : '#0f3460'
      ctx.fillRect(0, y, canvas.width, LANE_HEIGHT)

      ctx.fillStyle = '#aaaaaa'
      ctx.font = '12px monospace'
      ctx.fillText(lane, 5, y + LANE_HEIGHT / 2 + 4)
    })

    // Draw the hit line
    ctx.strokeStyle = '#00ff88'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(HIT_LINE_X, 0)
    ctx.lineTo(HIT_LINE_X, LANES.length * LANE_HEIGHT)
    ctx.stroke()

    // Draw the notes
    notesRef.current.forEach(note => {
      const laneIndex = LANES.indexOf(note.drumName)
      if (laneIndex === -1) return

      const x = HIT_LINE_X + (note.time - elapsed) * SCROLL_SPEED

      if (x < -NOTE_WIDTH || x > canvas.width) return

      const y = laneIndex * LANE_HEIGHT + 8

      if (note.hit === 'correct') {
        ctx.fillStyle = '#00ff88'
      } else if (note.hit === 'missed') {
        ctx.fillStyle = '#ff4444'
      } else {
        ctx.fillStyle = LANE_COLORS[note.drumName] || '#ffffff'
      }

      ctx.beginPath()
      ctx.roundRect(x, y, NOTE_WIDTH, LANE_HEIGHT - 16, 4)
      ctx.fill()
    })

    animationRef.current = requestAnimationFrame(animate)
  }

  // Check for drum hits and mark notes as correct or missed
  useEffect(() => {
    if (!playing || drumHits.length === 0) return

    const lastHit = drumHits[0]
    const elapsed = nowSeconds() - startTimeRef.current
    const tolerance = 0.3

    notesRef.current = notesRef.current.map(note => {
      if (note.hit !== null) return note
      if (note.drumName !== lastHit.drumName) return note

      const diff = Math.abs(note.time - elapsed)
      if (diff < tolerance) {
        return { ...note, hit: 'correct' }
      }
      return note
    })
  }, [drumHits, playing])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
        <button onClick={startSong} disabled={playing || !song} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          ▶ Play
        </button>
        <button onClick={stopSong} disabled={!playing} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          ■ Stop
        </button>
      </div>

      {/* Canvas for visualizing drum notes */}
      <canvas
        ref={canvasRef}
        width={900}
        height={LANES.length * LANE_HEIGHT}
        style={{ border: '1px solid #333', display: 'block' }}
      />
    </div>
  )
}