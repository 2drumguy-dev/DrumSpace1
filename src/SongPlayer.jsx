import { useEffect, useRef, useState } from 'react'

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

const LANE_HEIGHT = 50
const NOTE_WIDTH = 30
const HIT_LINE_X = 200
const SCROLL_SPEED = 200

// map MIDI note numbers to drum names
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

export default function SongPlayer({ song, drumHits, midiOffset = 0 }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const audioRef = useRef(null)
  const startTimeRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const notesRef = useRef([])

  // parse drum notes when song loads
  useEffect(() => {
    if (!song) return
    const drumTrack = song.tracks[18]
    notesRef.current = drumTrack.notes.map(note => ({
      time: note.time - midiOffset,
      midi: note.midi,
      drumName: getDrumName(note.midi),
      hit: null,
    })).filter(n => n.drumName !== null)

    // reset hit states when song reloads
    notesRef.current = notesRef.current.map(n => ({ ...n, hit: null }))
  }, [song, midiOffset])

  async function startSong() {
    if (!song) return

    // reset all note hit states before starting
    notesRef.current = notesRef.current.map(n => ({ ...n, hit: null }))

    // create and play the MP3
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const audio = new Audio('/src/assets/songs/another-one.mp3')
    audioRef.current = audio

    // wait for audio to be ready then play
    await new Promise((resolve) => {
      audio.oncanplaythrough = resolve
      audio.load()
    })

    audio.play()

    // record the exact start time for syncing notes
    startTimeRef.current = performance.now() / 1000

    setPlaying(true)
    animate()
  }

  function stopSong() {
    setPlaying(false)

    // stop animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    // stop audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
  }

  function animate() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // use audio currentTime for perfect sync instead of performance.now
    // this way if audio lags the notes lag with it
    const elapsed = audioRef.current
      ? audioRef.current.currentTime
      : performance.now() / 1000 - startTimeRef.current

    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // draw dark background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // draw lanes
    LANES.forEach((lane, i) => {
      const y = i * LANE_HEIGHT

      // alternating lane colors
      ctx.fillStyle = i % 2 === 0 ? '#16213e' : '#0f3460'
      ctx.fillRect(0, y, canvas.width, LANE_HEIGHT)

      // lane label
      ctx.fillStyle = '#aaaaaa'
      ctx.font = '12px monospace'
      ctx.fillText(lane, 5, y + LANE_HEIGHT / 2 + 4)
    })

    // draw the green hit line
    ctx.strokeStyle = '#00ff88'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(HIT_LINE_X, 0)
    ctx.lineTo(HIT_LINE_X, LANES.length * LANE_HEIGHT)
    ctx.stroke()

    // draw notes
    notesRef.current.forEach(note => {
      const laneIndex = LANES.indexOf(note.drumName)
      if (laneIndex === -1) return

      // x position based on time difference from now
      const x = HIT_LINE_X + (note.time - elapsed) * SCROLL_SPEED

      // only draw notes visible on screen
      if (x < -NOTE_WIDTH || x > canvas.width) return

      const y = laneIndex * LANE_HEIGHT + 8

      // color based on whether it was hit correctly or missed
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

    // mark notes as missed if they passed the hit line by more than 300ms
    notesRef.current = notesRef.current.map(note => {
      if (note.hit !== null) return note
      if (elapsed - note.time > 0.3) {
        return { ...note, hit: 'missed' }
      }
      return note
    })

    animationRef.current = requestAnimationFrame(animate)
  }

  // check drum hits against expected notes
  useEffect(() => {
    if (!playing || drumHits.length === 0 || !audioRef.current) return

    const lastHit = drumHits[0]
    const elapsed = audioRef.current.currentTime
    const tolerance = 0.3

    // first check if the hit drum has a correct note within tolerance
    const hasCorrectHit = notesRef.current.some(note =>
      note.hit === null &&
      note.drumName === lastHit.drumName &&
      Math.abs(note.time - elapsed) < tolerance
    )

    notesRef.current = notesRef.current.map(note => {
      if (note.hit !== null) return note

      const diff = Math.abs(note.time - elapsed)
      if (diff >= tolerance) return note

      if (note.drumName === lastHit.drumName) {
        // correct drum, correct timing
        return { ...note, hit: 'correct' }
      } else if (!hasCorrectHit) {
        // wrong drum hit at this moment — mark this expected note as missed
        return { ...note, hit: 'missed' }
      }
      return note
    })
  }, [drumHits, playing])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
        <button
          onClick={startSong}
          disabled={playing || !song}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          ▶ Play
        </button>
        <button
          onClick={stopSong}
          disabled={!playing}
          style={{ padding: '10px 20px', cursor: 'pointer' }}
        >
          ■ Stop
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={900}
        height={LANES.length * LANE_HEIGHT}
        style={{ border: '1px solid #333', display: 'block' }}
      />

      <div style={{
        width: 900,
        marginTop: '6px',
        background: '#0d0d1a',
        border: '1px solid #333',
        borderRadius: '4px',
        padding: '6px 10px',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}>
        {drumHits.slice(0, 5).map((hit, i) => (
          <div key={i} style={{ color: i === 0 ? '#00ff88' : '#666', lineHeight: '1.6' }}>
            [{hit.time}] {hit.drumName} | vel: {hit.velocity}
          </div>
        ))}
        {drumHits.length === 0 && (
          <div style={{ color: '#444' }}>No hits yet...</div>
        )}
      </div>
    </div>
  )
}