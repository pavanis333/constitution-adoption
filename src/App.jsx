import { useState, useEffect, useCallback } from 'react'
import { constitutionData, quizQuestions } from './data'

// ===== Spaced Repetition (SM-2 simplified) =====
const SR_KEY = 'sr-flashcards'
const QUIZ_STATE_KEY = 'constitutionQuizState'
const QUIZ_HISTORY_KEY = 'quizHistory'

function getDefaultSR(cardKey) {
  return { key: cardKey, easeFactor: 2.5, interval: 0, repetitions: 0, nextReview: 0 }
}

function loadSR() {
  try { return JSON.parse(localStorage.getItem(SR_KEY)) || {} } catch { return {} }
}

function saveSR(data) { localStorage.setItem(SR_KEY, JSON.stringify(data)) }

function reviewCard(card, quality) {
  // quality: 0=Again, 3=Hard, 4=Good, 5=Easy
  let { easeFactor, interval, repetitions } = card
  if (quality < 3) {
    repetitions = 0
    interval = 0
  } else {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 3
    else interval = Math.round(interval * easeFactor)
    repetitions++
  }
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  const nextReview = Date.now() + interval * 86400000
  return { ...card, easeFactor, interval, repetitions, nextReview }
}

function getAllArticles() {
  const all = []
  constitutionData.parts.forEach(part => {
    part.keyArticles.forEach(article => {
      all.push({ ...article, partNumber: part.number, partTitle: part.title, key: `${part.number}-${article.num}` })
    })
  })
  return all
}

// ===== Quiz History =====
function loadQuizHistory() {
  try { return JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY)) || [] } catch { return [] }
}
function saveQuizHistory(h) { localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(h)) }

// ===== App =====
function App() {
  const [mode, setMode] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState([])
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedParts, setExpandedParts] = useState([])
  const [showNavigator, setShowNavigator] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [selectedPart, setSelectedPart] = useState(null)
  const [srData, setSrData] = useState(loadSR)
  const [quizHistory, setQuizHistory] = useState(loadQuizHistory)

  // Load quiz state on mode switch
  useEffect(() => {
    if (mode === 'quiz') {
      const saved = localStorage.getItem(QUIZ_STATE_KEY)
      if (saved) {
        const d = JSON.parse(saved)
        setCurrentIndex(d.currentIndex || 0)
        setScore(d.score || 0)
        setQuizAnswers(d.quizAnswers || [])
      }
    }
  }, [mode])

  const saveQuizState = (index, s, answers) => {
    localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify({ currentIndex: index, score: s, quizAnswers: answers }))
  }

  const resetMode = () => {
    setMode(null); setCurrentIndex(0); setScore(0); setQuizAnswers([]); setSelectedAnswer(null)
    setShowResult(false); setSearchQuery(''); setFlipped(false); setSelectedPart(null); setShowNavigator(false)
  }

  const resetQuiz = () => {
    localStorage.removeItem(QUIZ_STATE_KEY)
    setCurrentIndex(0); setScore(0); setQuizAnswers([]); setSelectedAnswer(null); setShowResult(false)
  }

  // ===== Spaced Rep Helpers =====
  const getDueCards = useCallback((partFilter) => {
    const articles = getAllArticles().filter(a => !partFilter || a.partNumber === partFilter)
    const now = Date.now()
    const due = []; const notDue = []
    articles.forEach(a => {
      const sr = srData[a.key]
      if (!sr || sr.nextReview <= now) due.push(a)
      else notDue.push(a)
    })
    // Sort due by nextReview ascending (oldest first), then new cards
    due.sort((a, b) => (srData[a.key]?.nextReview || 0) - (srData[b.key]?.nextReview || 0))
    return [...due, ...notDue]
  }, [srData])

  const handleSRRating = (cardKey, quality) => {
    const current = srData[cardKey] || getDefaultSR(cardKey)
    const updated = reviewCard(current, quality)
    const newData = { ...srData, [cardKey]: updated }
    setSrData(newData); saveSR(newData)
    // Move to next card
    setFlipped(false)
    setCurrentIndex(prev => prev + 1)
  }

  const getSRStats = () => {
    const articles = getAllArticles()
    const now = Date.now()
    let mastered = 0, learning = 0, newCount = 0, dueCount = 0
    articles.forEach(a => {
      const sr = srData[a.key]
      if (!sr) { newCount++; dueCount++; return }
      if (sr.nextReview <= now) dueCount++
      if (sr.repetitions >= 3 && sr.interval >= 7) mastered++
      else learning++
    })
    return { total: articles.length, mastered, learning, new: newCount, due: dueCount }
  }

  // ===== RENDERERS =====

  const renderHome = () => (
    <div className="mode-selector">
      {[
        { key: 'flashcards', icon: '🗂️', title: 'Flashcards', desc: 'Spaced repetition learning' },
        { key: 'browse', icon: '📚', title: 'Browse', desc: 'Parts & articles reference' },
        { key: 'search', icon: '🔍', title: 'Search', desc: 'Find any article quickly' },
        { key: 'quiz', icon: '❓', title: 'Quiz', desc: 'UPSC-style MCQs' },
        { key: 'progress', icon: '📊', title: 'Progress', desc: 'Track your preparation' },
      ].map(m => (
        <div key={m.key} className="mode-card" onClick={() => { resetMode(); setMode(m.key) }}>
          <div className="mode-icon">{m.icon}</div>
          <h3>{m.title}</h3>
          <p>{m.desc}</p>
          {m.key === 'flashcards' && (() => { const s = getSRStats(); return s.due > 0 ? <div style={{marginTop:8}}><span className="due-badge">🔔 {s.due} due</span></div> : null })()}
        </div>
      ))}
    </div>
  )

  const renderFlashcards = () => {
    const cards = getDueCards(selectedPart)
    const allArticles = getAllArticles()
    const stats = getSRStats()

    if (cards.length === 0) return <p style={{color:'var(--text-secondary)'}}>No articles available for this filter.</p>
    if (currentIndex >= cards.length) {
      return (
        <div style={{textAlign:'center', padding:'40px 0'}}>
          <div style={{fontSize:'3rem', marginBottom:16}}>🎉</div>
          <h2 style={{color:'var(--accent)', marginBottom:12}}>All caught up!</h2>
          <p style={{color:'var(--text-secondary)', marginBottom:24}}>No more cards to review right now.</p>
          <button className="btn btn-primary" onClick={() => setCurrentIndex(0)}>Review Again</button>
        </div>
      )
    }

    const card = cards[currentIndex]
    const sr = srData[card.key]
    const isDue = !sr || sr.nextReview <= Date.now()

    return (
      <div>
        {/* Filter + Stats Row */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:18}}>
          <select
            value={selectedPart || 'all'}
            onChange={e => { setSelectedPart(e.target.value === 'all' ? null : e.target.value); setCurrentIndex(0); setFlipped(false) }}
            style={{ padding:'8px 14px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-primary)', fontSize:'0.95rem', cursor:'pointer' }}
          >
            <option value="all">All Parts ({allArticles.length})</option>
            {constitutionData.parts.map(p => <option key={p.id} value={p.number}>Part {p.number} ({p.keyArticles.length})</option>)}
          </select>
          <span className="due-badge">🔔 {stats.due} due today</span>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{width:`${((currentIndex + 1) / cards.length) * 100}%`}} />
        </div>

        {/* Card */}
        <div className="flashcard">
          <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
            <div className="flashcard-front">
              <div style={{fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:8}}>Part {card.partNumber}</div>
              <h2 style={{fontSize:'1.8rem', marginBottom:16, color:'var(--accent)'}}>Article {card.num}</h2>
              <p style={{fontSize:'1.15rem', color:'var(--text-secondary)'}}>{card.title}</p>
              {isDue && <span style={{position:'absolute', top:16, right:16, fontSize:'0.8rem', color:'var(--accent)', background:'var(--accent-dim)', padding:'3px 10px', borderRadius:12}}>Due</span>}
              <p className="flashcard-hint">Tap to flip</p>
            </div>
            <div className="flashcard-back">
              <h3 style={{marginBottom:12, color:'var(--accent)'}}>Summary</h3>
              <p style={{fontSize:'1.05rem', lineHeight:1.8, textAlign:'left', color:'var(--text-primary)'}}>{card.summary}</p>
              <div style={{marginTop:16, padding:10, background:'var(--accent-dim)', borderRadius:'var(--radius-sm)', width:'100%', textAlign:'center'}}>
                <span style={{color:'var(--accent)', fontWeight:600}}>Part {card.partNumber}:</span> <span style={{color:'var(--text-secondary)'}}>{card.partTitle}</span>
              </div>
              <p className="flashcard-hint">Rate below ↓</p>
            </div>
          </div>
        </div>

        {/* SR Buttons (only when flipped) */}
        {flipped && (
          <div className="sr-buttons" style={{marginTop:24}}>
            <button className="sr-btn again" onClick={e => { e.stopPropagation(); handleSRRating(card.key, 0) }}>Again</button>
            <button className="sr-btn hard" onClick={e => { e.stopPropagation(); handleSRRating(card.key, 3) }}>Hard</button>
            <button className="sr-btn good" onClick={e => { e.stopPropagation(); handleSRRating(card.key, 4) }}>Good</button>
            <button className="sr-btn easy" onClick={e => { e.stopPropagation(); handleSRRating(card.key, 5) }}>Easy</button>
          </div>
        )}

        {/* Nav */}
        <div style={{textAlign:'center', marginTop:16, color:'var(--text-muted)', fontSize:'0.9rem'}}>
          Card {currentIndex + 1} of {cards.length}
          {sr && sr.repetitions > 0 && <span style={{marginLeft:12, color:'var(--green)'}}>Interval: {sr.interval}d</span>}
        </div>
        <div className="controls">
          <button className="btn btn-secondary" onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setFlipped(false) }} disabled={currentIndex === 0}>⬅ Prev</button>
          <button className="btn btn-secondary" onClick={() => { setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1)); setFlipped(false) }} disabled={currentIndex >= cards.length - 1}>Next ➡</button>
        </div>
      </div>
    )
  }

  const renderBrowse = () => (
    <div>
      <div className="preamble">
        <h2>PREAMBLE</h2>
        <p className="preamble-text">{constitutionData.preamble.text}</p>
        <div className="preamble-keywords">
          {constitutionData.preamble.keywords.map((kw, i) => <span key={i} className="keyword">{kw}</span>)}
        </div>
      </div>
      <h2 style={{marginBottom:16, color:'var(--accent)', fontSize:'1.3rem'}}>Parts of the Constitution</h2>
      <div className="parts-list">
        {constitutionData.parts.map(part => (
          <div key={part.id} className="part-card" onClick={() => setExpandedParts(prev => prev.includes(part.id) ? prev.filter(x => x !== part.id) : [...prev, part.id])}>
            <div className="part-header">
              <div>
                <div className="part-number">PART {part.number}</div>
                <div className="part-title">{part.title}</div>
              </div>
              <span className="article-range">Articles {part.articles}</span>
            </div>
            {part.chapters && <div style={{fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:8}}>Chapters: {part.chapters.map(c => c.name).join(' | ')}</div>}
            {expandedParts.includes(part.id) && (
              <div className="article-list">
                <h4 style={{color:'var(--accent)', marginBottom:10, fontSize:'0.95rem'}}>Key Articles:</h4>
                {part.keyArticles.map((a, i) => (
                  <div key={i} className="article-item">
                    <span className="article-num">Art. {a.num}</span>
                    <strong style={{color:'var(--text-primary)'}}>{a.title}</strong>
                    <p style={{marginTop:4, color:'var(--text-secondary)', fontSize:'0.9rem'}}>{a.summary}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="tags" style={{marginTop:12}}>
              <span className="tag">{part.importance} Priority</span>
              <span className="tag">{part.keyArticles.length} Articles</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSearch = () => {
    const allArticles = getAllArticles()
    const filtered = searchQuery.trim()
      ? allArticles.filter(a => a.num.toString().includes(searchQuery) || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.summary.toLowerCase().includes(searchQuery.toLowerCase()))
      : allArticles
    return (
      <div>
        <div className="search-box">
          <input className="search-input" placeholder="Search by article number, title, or keyword..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <p style={{marginBottom:16, color:'var(--text-muted)', fontSize:'0.9rem'}}>{filtered.length} article(s) found</p>
        <div className="parts-list">
          {filtered.map((a, i) => (
            <div key={i} className="article-item" style={{marginBottom:10}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:6}}>
                <span className="article-num">Article {a.num}</span>
                <span style={{fontSize:'0.82rem', color:'var(--text-muted)'}}>Part {a.partNumber}</span>
              </div>
              <strong style={{color:'var(--text-primary)', display:'block', marginBottom:4}}>{a.title}</strong>
              <p style={{color:'var(--text-secondary)', fontSize:'0.9rem'}}>{a.summary}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderQuiz = () => {
    if (showResult) {
      const pct = ((score / quizQuestions.length) * 100).toFixed(0)
      const emoji = pct >= 90 ? '🏆' : pct >= 75 ? '🌟' : pct >= 60 ? '👍' : pct >= 50 ? '😊' : '📚'
      return (
        <div className="result-screen">
          <div className="result-emoji">{emoji}</div>
          <h2 style={{color:'var(--text-primary)'}}>Quiz Complete!</h2>
          <div className="result-score">{score} / {quizQuestions.length}</div>
          <p style={{fontSize:'1.2rem', color:'var(--text-secondary)', marginBottom:24}}>You scored {pct}%</p>
          <div style={{textAlign:'left', marginBottom:24}}>
            <h3 style={{marginBottom:12, color:'var(--accent)'}}>Review:</h3>
            {quizAnswers.map((ans, i) => (
              <div key={i} className={`explanation-box ${ans.correct ? 'correct-exp' : 'incorrect-exp'}`} style={{marginBottom:10}}>
                <p style={{fontWeight:600, marginBottom:4, color:'var(--text-primary)'}}>Q{i+1}: {quizQuestions[i].question}</p>
                <p style={{color:'var(--text-secondary)'}}>{ans.correct ? '✓ Correct!' : `✗ Wrong — ${quizQuestions[i].explanation}`}</p>
              </div>
            ))}
          </div>
          <div className="controls">
            <button className="btn btn-primary" onClick={resetQuiz}>🔄 Retry</button>
            <button className="btn btn-secondary" onClick={resetMode}>🏠 Home</button>
          </div>
        </div>
      )
    }

    const q = quizQuestions[currentIndex]
    const jumpTo = idx => { setCurrentIndex(idx); setSelectedAnswer(quizAnswers[idx]?.selected ?? null); setShowNavigator(false) }

    const handleAnswer = idx => {
      setSelectedAnswer(idx)
      const correct = q.correct === idx
      const newAnswers = [...quizAnswers]
      const oldAns = newAnswers[currentIndex]
      let newScore = score
      if (oldAns) {
        if (oldAns.correct && !correct) newScore--
        if (!oldAns.correct && correct) newScore++
      } else if (correct) newScore++
      newAnswers[currentIndex] = { question: currentIndex, selected: idx, correct }
      setQuizAnswers(newAnswers); setScore(newScore)
      saveQuizState(currentIndex, newScore, newAnswers)
    }

    const goNext = () => {
      if (currentIndex < quizQuestions.length - 1) {
        const ni = currentIndex + 1
        setCurrentIndex(ni); setSelectedAnswer(quizAnswers[ni]?.selected ?? null)
        saveQuizState(ni, score, quizAnswers)
      } else if (quizAnswers.length === quizQuestions.length) {
        setShowResult(true)
        localStorage.removeItem(QUIZ_STATE_KEY)
        const hist = loadQuizHistory()
        hist.push({ date: Date.now(), score, total: quizQuestions.length })
        saveQuizHistory(hist)
        setQuizHistory(hist)
      }
    }
    const goPrev = () => {
      if (currentIndex > 0) {
        const pi = currentIndex - 1
        setCurrentIndex(pi); setSelectedAnswer(quizAnswers[pi]?.selected ?? null)
        saveQuizState(pi, score, quizAnswers)
      }
    }

    return (
      <div>
        <div className="progress-bar">
          <div className="progress-fill" style={{width:`${(quizAnswers.length / quizQuestions.length) * 100}%`}} />
        </div>
        <div style={{textAlign:'center', margin:'12px 0'}}>
          <button className="btn btn-secondary" onClick={() => setShowNavigator(true)} style={{fontSize:'0.9rem'}}>
            📋 Navigator ({quizAnswers.length}/{quizQuestions.length})
          </button>
        </div>

        {showNavigator && (
          <div className="modal-overlay" onClick={() => setShowNavigator(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <h3 style={{color:'var(--accent)'}}>Question Navigator</h3>
                <button onClick={() => setShowNavigator(false)} style={{background:'none', border:'none', fontSize:'1.3rem', cursor:'pointer', color:'var(--text-secondary)'}}>✕</button>
              </div>
              <div className="nav-grid">
                {quizQuestions.map((_, i) => {
                  const ans = quizAnswers[i]
                  let cls = 'nav-btn'
                  if (i === currentIndex) cls += ' current'
                  else if (ans) cls += ans.correct ? ' correct-nav' : ' incorrect-nav'
                  return <button key={i} className={cls} onClick={() => jumpTo(i)}>{i+1}</button>
                })}
              </div>
            </div>
          </div>
        )}

        <div className="quiz-question">
          <h3>Question {currentIndex + 1} of {quizQuestions.length}</h3>
          <p style={{fontSize:'1.1rem', marginBottom:20, color:'var(--text-primary)', lineHeight:1.7, whiteSpace:'pre-line'}}>{q.question}</p>
          <div className="quiz-options">
            {q.options.map((opt, i) => {
              let cls = 'quiz-option'
              if (selectedAnswer !== null) {
                if (i === q.correct) cls += ' correct'
                else if (i === selectedAnswer) cls += ' incorrect'
              }
              return <div key={i} className={cls} onClick={() => handleAnswer(i)}><strong>{String.fromCharCode(65+i)}.</strong> {opt}</div>
            })}
          </div>
          {selectedAnswer !== null && (
            <div className={`explanation-box ${selectedAnswer === q.correct ? 'correct-exp' : 'incorrect-exp'}`}>
              <p style={{fontWeight:600, marginBottom:4, color:'var(--text-primary)'}}>{selectedAnswer === q.correct ? '✓ Correct!' : '✗ Incorrect'}</p>
              <p style={{color:'var(--text-secondary)'}}>{q.explanation}</p>
            </div>
          )}
        </div>

        <div style={{textAlign:'center', marginTop:14, color:'var(--text-muted)', fontSize:'0.9rem'}}>Score: {score} / {quizAnswers.length}</div>
        <div className="controls">
          <button className="btn btn-secondary" onClick={goPrev} disabled={currentIndex === 0}>⬅ Previous</button>
          <button className="btn btn-primary" onClick={goNext} disabled={currentIndex === quizQuestions.length - 1 && quizAnswers.length < quizQuestions.length}>
            {currentIndex === quizQuestions.length - 1 && quizAnswers.length === quizQuestions.length ? '✓ Finish' : 'Next ➡'}
          </button>
        </div>
        <div className="controls" style={{marginTop:8}}>
          <button className="btn btn-secondary" onClick={resetQuiz}>🔄 Reset Quiz</button>
        </div>
      </div>
    )
  }

  const renderProgress = () => {
    const stats = getSRStats()
    const masteredPct = stats.total ? Math.round((stats.mastered / stats.total) * 100) : 0

    return (
      <div>
        <h2 style={{marginBottom:20, color:'var(--accent)', fontSize:'1.3rem'}}>Your Progress</h2>

        {/* Overview Stats */}
        <div className="stats">
          <div className="stat-card"><h4>Total Articles</h4><div className="value">{stats.total}</div></div>
          <div className="stat-card"><h4>Mastered</h4><div className="value" style={{color:'var(--green)'}}>{stats.mastered}</div></div>
          <div className="stat-card"><h4>Learning</h4><div className="value" style={{color:'var(--blue)'}}>{stats.learning}</div></div>
          <div className="stat-card"><h4>New</h4><div className="value" style={{color:'var(--text-muted)'}}>{stats.new}</div></div>
          <div className="stat-card"><h4>Due Today</h4><div className="value" style={{color:'var(--accent)'}}>{stats.due}</div></div>
        </div>

        {/* Mastery Progress */}
        <div className="progress-section">
          <h3>Overall Mastery — {masteredPct}%</h3>
          <div className="progress-bar" style={{height:12, marginBottom:0}}>
            <div className="progress-fill" style={{width:`${masteredPct}%`, background:'var(--green)'}} />
          </div>
        </div>

        {/* Quiz History */}
        <div className="progress-section">
          <h3>Quiz History</h3>
          {quizHistory.length === 0 ? (
            <p style={{color:'var(--text-muted)'}}>No quizzes taken yet.</p>
          ) : (
            quizHistory.slice(-10).reverse().map((h, i) => (
              <div key={i} className="progress-row">
                <span style={{color:'var(--text-secondary)'}}>{new Date(h.date).toLocaleDateString()}</span>
                <span style={{fontWeight:600, color: (h.score / h.total) >= 0.7 ? 'var(--green)' : (h.score / h.total) >= 0.5 ? 'var(--accent)' : 'var(--red)'}}>
                  {h.score}/{h.total} ({Math.round((h.score / h.total) * 100)}%)
                </span>
              </div>
            ))
          )}
        </div>

        {/* Key Facts */}
        <div className="progress-section">
          <h3>Key Facts</h3>
          <ul style={{paddingLeft:20, lineHeight:2, color:'var(--text-secondary)'}}>
            <li>Total Articles: 395 (original) + amendments</li>
            <li>Total Parts: 22 + additional (IVA, IXA, IXB, XIVA)</li>
            <li>Schedules: 12</li>
            <li>Adopted: 26 November 1949</li>
            <li>Came into force: 26 January 1950</li>
            <li>Longest written constitution in the world</li>
          </ul>
        </div>

        {/* Reset Buttons */}
        <div className="progress-section" style={{borderColor:'var(--red)', borderWidth:1}}>
          <h3 style={{color:'var(--red)'}}>Reset Data</h3>
          <div className="controls" style={{justifyContent:'flex-start', marginTop:12}}>
            <button className="btn btn-danger" onClick={() => {
              if (confirm('Reset all flashcard progress? This clears spaced repetition data.')) {
                setSrData({}); saveSR({}); localStorage.removeItem('constitutionProgress')
              }
            }}>🔄 Reset Flashcards</button>
            <button className="btn btn-danger" onClick={() => {
              if (confirm('Reset all quiz history and current quiz progress?')) {
                resetQuiz(); setQuizHistory([]); saveQuizHistory([]); localStorage.removeItem(QUIZ_STATE_KEY)
              }
            }}>🔄 Reset Quizzes</button>
            <button className="btn btn-danger" onClick={() => {
              if (confirm('Reset ALL progress? This cannot be undone.')) {
                setSrData({}); saveSR({}); setQuizHistory([]); saveQuizHistory([])
                localStorage.removeItem('constitutionProgress'); localStorage.removeItem(QUIZ_STATE_KEY)
                resetQuiz()
              }
            }}>⚠️ Reset Everything</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h1>⚖️ Constitution of India</h1>
          <p>Master the Constitution for UPSC Prelims</p>
        </div>
        {!mode && renderHome()}
        {mode && (
          <div className="content-area">
            <button className="btn btn-secondary" onClick={resetMode} style={{marginBottom:18}}>← Back to Home</button>
            {mode === 'flashcards' && renderFlashcards()}
            {mode === 'browse' && renderBrowse()}
            {mode === 'search' && renderSearch()}
            {mode === 'quiz' && renderQuiz()}
            {mode === 'progress' && renderProgress()}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
