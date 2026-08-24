export const CATEGORIES = [
  { id: 'all', label: 'All Sports' },
  { id: 'combat', label: 'Combat' },
  { id: 'ball', label: 'Ball Sports' },
  { id: 'racket', label: 'Racket Sports' },
  { id: 'individual', label: 'Individual & Athletics' },
]

export const SPORTS = [
  { id: 'boxing', name: 'Boxing', emoji: '🥊', category: 'combat', description: 'Punch mechanics, guard positioning, footwork and defensive analysis.', focusMetrics: ['Punch count', 'Punch speed (est. m/s)', 'Guard position score', 'Footwork agility score'] },
  { id: 'wrestling', name: 'Wrestling', emoji: '🤼', category: 'combat', description: 'Takedowns, grip control, balance and ground transitions.', focusMetrics: ['Takedown attempts', 'Grip control %', 'Balance stability score', 'Reaction time (est. s)'] },
  { id: 'judo', name: 'Judo', emoji: '🥋', category: 'combat', description: 'Throws, grip fighting (kumikata) and balance breaking (kuzushi).', focusMetrics: ['Throw attempts', 'Grip fighting score', 'Kuzushi (balance break) count', 'Ground transition speed'] },
  { id: 'karate', name: 'Karate', emoji: '🥋', category: 'combat', description: 'Strikes, stance stability and kime (focus/power) at impact.', focusMetrics: ['Strike count', 'Strike speed score', 'Stance stability score', 'Kime (focus) score'] },
  { id: 'basketball', name: 'Basketball', emoji: '🏀', category: 'ball', description: 'Shooting form, jump mechanics, sprint speed and dribble control.', focusMetrics: ['Shot attempts', 'Jump height (est. cm)', 'Sprint speed (est. km/h)', 'Dribble control score'] },
  { id: 'football', name: 'Football (Soccer)', emoji: '⚽', category: 'ball', description: 'Sprint speed, ball control, shot power and passing accuracy.', focusMetrics: ['Sprint speed (est. km/h)', 'Ball touches', 'Shot power score', 'Passing accuracy %'] },
  { id: 'volleyball', name: 'Volleyball', emoji: '🏐', category: 'ball', description: 'Jump mechanics, spike power, serve consistency and block timing.', focusMetrics: ['Jump height (est. cm)', 'Spike speed score', 'Serve count', 'Block timing score'] },
  { id: 'cricket', name: 'Cricket', emoji: '🏏', category: 'ball', description: 'Bat swing mechanics, bowling action and footwork to the pitch.', focusMetrics: ['Bat swing speed score', 'Bowling arm angle (deg)', 'Footwork score', 'Shot timing score'] },
  { id: 'field_hockey', name: 'Field Hockey', emoji: '🏑', category: 'ball', description: 'Stick handling, sprint speed, shot power and passing accuracy.', focusMetrics: ['Sprint speed (est. km/h)', 'Stick handling score', 'Shot power score', 'Passing accuracy %'] },
  { id: 'ice_hockey', name: 'Ice Hockey', emoji: '🏒', category: 'ball', description: 'Skating speed, shot mechanics, stick handling and balance on turns.', focusMetrics: ['Skating speed score', 'Shot speed score', 'Stick handling score', 'Turn balance score'] },
  { id: 'tennis', name: 'Tennis', emoji: '🎾', category: 'racket', description: 'Serve mechanics, rally consistency and footwork recovery.', focusMetrics: ['Serve speed score', 'Rally shot count', 'Footwork recovery time (est. s)', 'Swing consistency score'] },
  { id: 'badminton', name: 'Badminton', emoji: '🏸', category: 'racket', description: 'Smash power, court coverage, reaction time and shot placement.', focusMetrics: ['Smash speed score', 'Court coverage score', 'Reaction time (est. s)', 'Shot placement accuracy %'] },
  { id: 'table_tennis', name: 'Table Tennis', emoji: '🏓', category: 'racket', description: 'Rally speed, spin consistency and footwork agility.', focusMetrics: ['Rally shot count', 'Swing speed score', 'Footwork agility score', 'Spin consistency score'] },
  { id: 'running', name: 'Running', emoji: '🏃', category: 'individual', description: 'Cadence, stride length, pace and running posture.', focusMetrics: ['Cadence (steps/min)', 'Stride length (est. m)', 'Pace (est. min/km)', 'Posture lean angle (deg)'] },
  { id: 'cycling', name: 'Cycling', emoji: '🚴', category: 'individual', description: 'Cadence, aerodynamic posture and pedal stroke symmetry.', focusMetrics: ['Cadence (est. rpm)', 'Speed (est. km/h)', 'Aerodynamic posture score', 'Pedal stroke symmetry %'] },
  { id: 'swimming', name: 'Swimming', emoji: '🏊', category: 'individual', description: 'Stroke rate, turn efficiency and body roll symmetry.', focusMetrics: ['Stroke rate (per min)', 'Stroke count', 'Turn efficiency score', 'Body roll symmetry %'] },
  { id: 'archery', name: 'Archery', emoji: '🏹', category: 'individual', description: 'Draw consistency, stance stability and release timing.', focusMetrics: ['Draw consistency score', 'Stance stability score', 'Release timing score', 'Follow-through hold (est. s)'] },
  { id: 'golf', name: 'Golf', emoji: '⛳', category: 'individual', description: 'Swing speed, backswing angle and tempo consistency.', focusMetrics: ['Swing speed score', 'Backswing angle (deg)', 'Follow-through balance score', 'Tempo ratio'] },
  { id: 'gymnastics', name: 'Gymnastics', emoji: '🤸', category: 'individual', description: 'Rotation control, landing stability and form extension.', focusMetrics: ['Rotation count', 'Landing stability score', 'Form extension score', 'Air time (est. s)'] },
  { id: 'skateboarding', name: 'Skateboarding', emoji: '🛹', category: 'individual', description: 'Trick execution, landing stability and board control.', focusMetrics: ['Trick count', 'Landing stability score', 'Air time (est. s)', 'Board control score'] },
]

export function getSportById(id) {
  return SPORTS.find((s) => s.id === id)
}
