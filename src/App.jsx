import { useState, useEffect } from 'react'
import { constitutionData, quizQuestions } from './data'

function App() {
  const [mode, setMode] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState([])
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [masteredArticles, setMasteredArticles] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedParts, setExpandedParts] = useState([])
  const [showNavigator, setShowNavigator] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [selectedPart, setSelectedPart] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('constitutionProgress')
    if (saved) {
      const data = JSON.parse(saved)
      setMasteredArticles(data.masteredArticles || [])
    }

    const savedQuiz = localStorage.getItem('constitutionQuizState')
    if (savedQuiz && mode === 'quiz') {
      const quizData = JSON.parse(savedQuiz)
      setCurrentIndex(quizData.currentIndex || 0)
      setScore(quizData.score || 0)
      setQuizAnswers(quizData.quizAnswers || [])
    }
  }, [mode])

  const saveProgress = (mastered) => {
    localStorage.setItem('constitutionProgress', JSON.stringify({
      masteredArticles: mastered
    }))
  }

  const saveQuizState = (index, currentScore, answers) => {
    localStorage.setItem('constitutionQuizState', JSON.stringify({
      currentIndex: index,
      score: currentScore,
      quizAnswers: answers
    }))
  }

  const resetQuiz = () => {
    localStorage.removeItem('constitutionQuizState')
    setCurrentIndex(0)
    setScore(0)
    setQuizAnswers([])
    setSelectedAnswer(null)
    setShowResult(false)
  }

  const resetMode = () => {
    setMode(null)
    setCurrentIndex(0)
    setScore(0)
    setQuizAnswers([])
    setSelectedAnswer(null)
    setShowResult(false)
    setSearchQuery('')
    setFlipped(false)
    setSelectedPart(null)
  }

  const togglePartExpansion = (partId) => {
    if (expandedParts.includes(partId)) {
      setExpandedParts(expandedParts.filter(id => id !== partId))
    } else {
      setExpandedParts([...expandedParts, partId])
    }
  }

  const handleQuizAnswer = (answerIndex) => {
    if (quizAnswers[currentIndex]) {
      const newAnswers = [...quizAnswers]
      const correct = quizQuestions[currentIndex].correct === answerIndex
      
      const oldCorrect = newAnswers[currentIndex].correct
      let newScore = score
      if (oldCorrect && !correct) newScore--
      if (!oldCorrect && correct) newScore++
      
      newAnswers[currentIndex] = {
        question: currentIndex,
        selected: answerIndex,
        correct: correct
      }
      
      setQuizAnswers(newAnswers)
      setScore(newScore)
      setSelectedAnswer(answerIndex)
      saveQuizState(currentIndex, newScore, newAnswers)
      return
    }
    
    setSelectedAnswer(answerIndex)
    const correct = quizQuestions[currentIndex].correct === answerIndex
    
    const newScore = correct ? score + 1 : score
    const newAnswers = [...quizAnswers, {
      question: currentIndex,
      selected: answerIndex,
      correct: correct
    }]
    
    if (correct) {
      setScore(newScore)
    }
    
    setQuizAnswers(newAnswers)
    saveQuizState(currentIndex, newScore, newAnswers)
  }

  const nextQuizQuestion = () => {
    if (currentIndex < quizQuestions.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      if (quizAnswers[nextIndex]) {
        setSelectedAnswer(quizAnswers[nextIndex].selected)
      } else {
        setSelectedAnswer(null)
      }
      saveQuizState(nextIndex, score, quizAnswers)
    } else if (quizAnswers.length === quizQuestions.length) {
      setShowResult(true)
      localStorage.removeItem('constitutionQuizState')
    }
  }

  const prevQuizQuestion = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      setCurrentIndex(prevIndex)
      if (quizAnswers[prevIndex]) {
        setSelectedAnswer(quizAnswers[prevIndex].selected)
      } else {
        setSelectedAnswer(null)
      }
      saveQuizState(prevIndex, score, quizAnswers)
    }
  }

  const getScoreEmoji = () => {
    const percentage = (score / quizQuestions.length) * 100
    if (percentage >= 90) return '🏆'
    if (percentage >= 75) return '🌟'
    if (percentage >= 60) return '👍'
    if (percentage >= 50) return '😊'
    return '📚'
  }

  const renderModeSelector = () => (
    <div className="mode-selector">
      <div className="mode-card" onClick={() => setMode('flashcards')}>
        <div className="mode-icon">🗂️</div>
        <h3>Flashcards</h3>
        <p>Learn articles with interactive flashcards</p>
      </div>

      <div className="mode-card" onClick={() => setMode('browse')}>
        <div className="mode-icon">📚</div>
        <h3>Parts & Articles</h3>
        <p>Browse all parts with key articles and summaries</p>
      </div>
      
      <div className="mode-card" onClick={() => setMode('search')}>
        <div className="mode-icon">🔍</div>
        <h3>Article Search</h3>
        <p>Quick search by article number or keyword</p>
      </div>
      
      <div className="mode-card" onClick={() => setMode('quiz')}>
        <div className="mode-icon">❓</div>
        <h3>Quiz Mode</h3>
        <p>Test knowledge with UPSC-style questions</p>
      </div>
      
      <div className="mode-card" onClick={() => setMode('progress')}>
        <div className="mode-icon">📊</div>
        <h3>Progress</h3>
        <p>Track your learning progress</p>
      </div>
    </div>
  )

  const renderFlashcards = () => {
    // Get all articles as flashcards
    const allArticles = []
    constitutionData.parts.forEach(part => {
      part.keyArticles.forEach(article => {
        allArticles.push({
          ...article,
          partNumber: part.number,
          partTitle: part.title
        })
      })
    })

    // Filter by selected part if any
    const articles = selectedPart 
      ? allArticles.filter(a => a.partNumber === selectedPart)
      : allArticles

    if (articles.length === 0) return <p>No articles available.</p>

    const currentArticle = articles[currentIndex]

    const nextCard = () => {
      if (currentIndex < articles.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setFlipped(false)
      }
    }

    const prevCard = () => {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
        setFlipped(false)
      }
    }

    const markAsMastered = () => {
      const articleKey = `${currentArticle.partNumber}-${currentArticle.num}`
      if (masteredArticles.includes(articleKey)) {
        const updated = masteredArticles.filter(key => key !== articleKey)
        setMasteredArticles(updated)
        saveProgress(updated)
      } else {
        const updated = [...masteredArticles, articleKey]
        setMasteredArticles(updated)
        saveProgress(updated)
        nextCard()
      }
    }

    const articleKey = `${currentArticle.partNumber}-${currentArticle.num}`
    const isMastered = masteredArticles.includes(articleKey)

    return (
      <div>
        {/* Part Filter */}
        <div style={{marginBottom: '20px'}}>
          <label style={{marginRight: '10px', color: '#1a1f71', fontWeight: 'bold'}}>Filter by Part:</label>
          <select 
            value={selectedPart || 'all'}
            onChange={(e) => {
              setSelectedPart(e.target.value === 'all' ? null : e.target.value)
              setCurrentIndex(0)
              setFlipped(false)
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '2px solid #D4AF37',
              background: 'white',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Parts ({allArticles.length} articles)</option>
            {constitutionData.parts.map(part => (
              <option key={part.id} value={part.number}>
                Part {part.number} ({part.keyArticles.length} articles)
              </option>
            ))}
          </select>
        </div>

        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{width: `${((currentIndex + 1) / articles.length) * 100}%`}}
          />
        </div>

        {/* Flashcard */}
        <div className="flashcard">
          <div 
            className={`flashcard-inner ${flipped ? 'flipped' : ''}`}
            onClick={() => setFlipped(!flipped)}
          >
            <div className="flashcard-front">
              <div style={{fontSize: '0.9rem', color: '#5A67D8', marginBottom: '10px'}}>
                Part {currentArticle.partNumber}
              </div>
              <h2 style={{fontSize: '2rem', marginBottom: '20px', color: '#1a1f71'}}>
                Article {currentArticle.num}
              </h2>
              <p style={{fontSize: '1.3rem', color: '#2c3896'}}>
                {currentArticle.title}
              </p>
              <p className="flashcard-hint">👆 Tap to flip</p>
            </div>
            <div className="flashcard-back">
              <h3 style={{marginBottom: '15px', color: '#1a1f71'}}>Summary</h3>
              <p style={{fontSize: '1.1rem', lineHeight: '1.8', textAlign: 'left'}}>
                {currentArticle.summary}
              </p>
              <div style={{marginTop: '20px', padding: '10px', background: 'rgba(212,175,55,0.2)', borderRadius: '8px'}}>
                <strong style={{color: '#1a1f71'}}>Part:</strong> {currentArticle.partTitle}
              </div>
            </div>
          </div>
        </div>

        <div className="controls">
          <button 
            className="btn btn-secondary" 
            onClick={prevCard}
            disabled={currentIndex === 0}
          >
            ⬅️ Previous
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={markAsMastered}
          >
            {isMastered ? '✓ Mastered (click to unmark)' : '✓ Mark as Mastered'}
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={nextCard}
            disabled={currentIndex === articles.length - 1}
          >
            Next ➡️
          </button>
        </div>

        <div style={{textAlign: 'center', marginTop: '20px', color: '#1a1f71', fontSize: '1.1rem'}}>
          Card {currentIndex + 1} of {articles.length}
          {isMastered && <span style={{marginLeft: '15px', color: '#10b981'}}>✓ Mastered</span>}
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
          {constitutionData.preamble.keywords.map((keyword, idx) => (
            <span key={idx} className="keyword">{keyword}</span>
          ))}
        </div>
      </div>

      <h2 style={{marginBottom: '20px', color: '#1a1f71'}}>Parts of the Constitution</h2>
      
      <div className="parts-list">
        {constitutionData.parts.map(part => (
          <div key={part.id} className="part-card" onClick={() => togglePartExpansion(part.id)}>
            <div className="part-header">
              <div>
                <div className="part-number">PART {part.number}</div>
                <div className="part-title">{part.title}</div>
              </div>
              <span className="article-range">Articles {part.articles}</span>
            </div>
            
            {part.chapters && (
              <div style={{fontSize: '0.9rem', color: '#5A67D8', marginBottom: '10px'}}>
                Chapters: {part.chapters.map(ch => ch.name).join(' | ')}
              </div>
            )}
            
            {expandedParts.includes(part.id) && (
              <div className="article-list">
                <h4 style={{color: '#1a1f71', marginBottom: '10px'}}>Key Articles:</h4>
                {part.keyArticles.map((article, idx) => (
                  <div key={idx} className="article-item">
                    <span className="article-num">Art. {article.num}</span>
                    <strong>{article.title}</strong>
                    <p style={{marginTop: '5px', color: '#666', fontSize: '0.95rem'}}>
                      {article.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            <div className="tags" style={{marginTop: '15px'}}>
              <span className="tag">{part.importance} Priority</span>
              <span className="tag">{part.keyArticles.length} Key Articles</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSearch = () => {
    const allArticles = []
    constitutionData.parts.forEach(part => {
      part.keyArticles.forEach(article => {
        allArticles.push({...article, partNumber: part.number, partTitle: part.title})
      })
    })

    const filtered = searchQuery.trim() 
      ? allArticles.filter(article => 
          article.num.toString().includes(searchQuery) ||
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.summary.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allArticles

    return (
      <div>
        <div className="search-box">
          <input
            type="text"
            className="search-input"
            placeholder="Search by article number, title, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <p style={{marginBottom: '20px', color: '#5A67D8'}}>
          {filtered.length} article(s) found
        </p>

        <div className="parts-list">
          {filtered.map((article, idx) => (
            <div key={idx} className="article-item" style={{marginBottom: '15px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px'}}>
                <span className="article-num">Article {article.num}</span>
                <span style={{fontSize: '0.85rem', color: '#5A67D8'}}>Part {article.partNumber}</span>
              </div>
              <strong style={{color: '#1a1f71', display: 'block', marginBottom: '5px'}}>{article.title}</strong>
              <p style={{color: '#666', fontSize: '0.95rem'}}>{article.summary}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderQuiz = () => {
    if (showResult) {
      const percentage = ((score / quizQuestions.length) * 100).toFixed(0)
      
      return (
        <div className="result-screen">
          <div className="result-emoji">{getScoreEmoji()}</div>
          <h2>Quiz Complete!</h2>
          <div className="result-score">
            {score} / {quizQuestions.length}
          </div>
          <p style={{fontSize: '1.5rem', color: '#1a1f71', marginBottom: '30px'}}>
            You scored {percentage}%
          </p>
          
          <div style={{textAlign: 'left', marginBottom: '30px'}}>
            <h3 style={{marginBottom: '15px'}}>Review:</h3>
            {quizAnswers.map((answer, idx) => (
              <div key={idx} style={{
                padding: '15px',
                marginBottom: '10px',
                background: answer.correct ? '#d1fae5' : '#fee2e2',
                borderRadius: '8px',
                border: '2px solid ' + (answer.correct ? '#10b981' : '#ef4444')
              }}>
                <p style={{fontWeight: 'bold', marginBottom: '5px'}}>
                  Q{idx + 1}: {quizQuestions[idx].question}
                </p>
                <p style={{color: '#666'}}>
                  {answer.correct ? '✓ Correct!' : `✗ Wrong - ${quizQuestions[idx].explanation}`}
                </p>
              </div>
            ))}
          </div>

          <div className="controls">
            <button className="btn btn-primary" onClick={resetQuiz}>
              🔄 Retry Quiz
            </button>
            <button className="btn btn-secondary" onClick={resetMode}>
              🏠 Back to Home
            </button>
          </div>
        </div>
      )
    }

    const question = quizQuestions[currentIndex]

    const jumpToQuestion = (index) => {
      setCurrentIndex(index)
      if (quizAnswers[index]) {
        setSelectedAnswer(quizAnswers[index].selected)
      } else {
        setSelectedAnswer(null)
      }
      saveQuizState(index, score, quizAnswers)
      setShowNavigator(false)
    }

    return (
      <div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{width: `${(quizAnswers.length / quizQuestions.length) * 100}%`}}
          />
        </div>

        <div style={{textAlign: 'center', margin: '15px 0'}}>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowNavigator(true)}
            style={{fontSize: '0.95rem'}}
          >
            📋 Question Navigator ({quizAnswers.length}/{quizQuestions.length})
          </button>
        </div>

        {showNavigator && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }} onClick={() => setShowNavigator(false)}>
            <div style={{
              background: '#FAFAD2',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '700px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '100%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              border: '3px solid #D4AF37'
            }} onClick={(e) => e.stopPropagation()}>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{margin: 0, color: '#1a1f71'}}>Question Navigator</h3>
                <button 
                  onClick={() => setShowNavigator(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: '5px 10px',
                    color: '#1a1f71'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
                gap: '10px'
              }}>
                {quizQuestions.map((_, idx) => {
                  const isAnswered = quizAnswers[idx] !== undefined
                  const isCurrent = idx === currentIndex
                  const isCorrect = isAnswered && quizAnswers[idx].correct
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => jumpToQuestion(idx)}
                      style={{
                        padding: '12px',
                        border: isCurrent ? '3px solid #D4AF37' : '2px solid #5A67D8',
                        borderRadius: '8px',
                        background: isCurrent 
                          ? '#FFE4B5'
                          : isAnswered 
                            ? (isCorrect ? '#d1fae5' : '#fee2e2')
                            : 'white',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: isCurrent ? 'bold' : 'normal',
                        color: '#1a1f71',
                        transition: 'all 0.2s'
                      }}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>

              <div style={{marginTop: '20px', textAlign: 'center'}}>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowNavigator(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="quiz-question">
          <h3>Question {currentIndex + 1} of {quizQuestions.length}</h3>
          <p style={{fontSize: '1.3rem', marginBottom: '30px', color: '#1a1f71'}}>
            {question.question}
          </p>

          <div className="quiz-options">
            {question.options.map((option, idx) => {
              let className = 'quiz-option'
              if (selectedAnswer !== null) {
                if (idx === question.correct) {
                  className += ' correct'
                } else if (idx === selectedAnswer) {
                  className += ' incorrect'
                }
              }

              return (
                <div
                  key={idx}
                  className={className}
                  onClick={() => handleQuizAnswer(idx)}
                >
                  <strong>{String.fromCharCode(65 + idx)}.</strong> {option}
                </div>
              )
            })}
          </div>

          {selectedAnswer !== null && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              background: selectedAnswer === question.correct ? '#d1fae5' : '#fee2e2',
              borderRadius: '12px',
              border: '2px solid ' + (selectedAnswer === question.correct ? '#10b981' : '#ef4444')
            }}>
              <p style={{fontWeight: 'bold', marginBottom: '10px', color: '#1a1f71'}}>
                {selectedAnswer === question.correct ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p style={{color: '#2c3896'}}>{question.explanation}</p>
            </div>
          )}
        </div>

        <div style={{textAlign: 'center', marginTop: '20px', color: '#1a1f71'}}>
          Score: {score} / {quizAnswers.length}
        </div>

        <div className="controls" style={{marginTop: '20px'}}>
          <button 
            className="btn btn-secondary" 
            onClick={prevQuizQuestion}
            disabled={currentIndex === 0}
          >
            ⬅️ Previous
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={nextQuizQuestion}
            disabled={currentIndex === quizQuestions.length - 1 && quizAnswers.length < quizQuestions.length}
          >
            {currentIndex === quizQuestions.length - 1 && quizAnswers.length === quizQuestions.length ? '✓ Finish Quiz' : 'Next ➡️'}
          </button>
        </div>

        <div className="controls" style={{marginTop: '10px'}}>
          <button className="btn btn-secondary" onClick={resetQuiz}>
            🔄 Reset Quiz
          </button>
          <button className="btn btn-secondary" onClick={resetMode}>
            🏠 Back to Home
          </button>
        </div>
      </div>
    )
  }

  const renderProgress = () => {
    const totalParts = constitutionData.parts.length
    const highPriorityParts = constitutionData.parts.filter(p => p.importance === 'HIGH').length

    return (
      <div>
        <h2 style={{marginBottom: '30px', color: '#1a1f71'}}>Your Progress</h2>
        
        <div className="stats">
          <div className="stat-card">
            <h4>Total Parts</h4>
            <div className="value">{totalParts}</div>
          </div>
          <div className="stat-card">
            <h4>High Priority</h4>
            <div className="value">{highPriorityParts}</div>
          </div>
          <div className="stat-card">
            <h4>Quiz Questions</h4>
            <div className="value">{quizQuestions.length}</div>
          </div>
        </div>

        <div style={{marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '2px solid #D4AF37'}}>
          <h3 style={{color: '#1a1f71', marginBottom: '15px'}}>Key Facts</h3>
          <ul style={{paddingLeft: '20px', lineHeight: '2', color: '#2c3896'}}>
            <li>Total Articles: 395 (original) + Additional articles through amendments</li>
            <li>Total Parts: 22 + Additional parts (IVA, IXA, IXB, XIVA)</li>
            <li>Schedules: 12</li>
            <li>Adopted: 26 November 1949</li>
            <li>Came into force: 26 January 1950</li>
            <li>Longest written constitution in the world</li>
          </ul>
        </div>

        <div style={{marginTop: '30px'}}>
          <h3 style={{color: '#1a1f71', marginBottom: '15px'}}>Coverage Summary</h3>
          <div className="parts-list">
            {constitutionData.parts.map(part => (
              <div key={part.id} style={{
                padding: '15px',
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '8px',
                marginBottom: '10px',
                border: '2px solid #D4AF37'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <strong style={{color: '#1a1f71'}}>Part {part.number}:</strong> {part.title}
                  </div>
                  <div className="tags">
                    <span className="tag">{part.keyArticles.length} Articles</span>
                    <span className="tag">{part.importance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="controls" style={{marginTop: '30px'}}>
          <button 
            className="btn btn-danger" 
            onClick={() => {
              if (confirm('Are you sure you want to reset all progress?')) {
                setMasteredArticles([])
                localStorage.removeItem('constitutionProgress')
              }
            }}
          >
            🔄 Reset Progress
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h1>⚖️ Constitution of India</h1>
          <p>Master the Constitution for UPSC Civil Services Examination</p>
        </div>

        {!mode && renderModeSelector()}

        {mode && (
          <div className="content-area">
            <button 
              className="btn btn-secondary" 
              onClick={resetMode}
              style={{marginBottom: '20px'}}
            >
              ← Back to Home
            </button>

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
