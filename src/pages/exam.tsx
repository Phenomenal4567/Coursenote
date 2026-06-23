import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import ExamHome, { ExamHistoryEntry } from '../components/exam/ExamHome'
import StudyMode from '../components/exam/StudyMode'
import ExamMode from '../components/exam/ExamMode'
import { QUESTION_BANKS, QuestionBank } from '../lib/questionBank'
import ResultsScreen from '../components/exam/ResultsScreen'

type Screen = 'home' | 'study' | 'exam'

const HISTORY_KEY = '__cn_exam_history__'

export default function ExamPage() {
  const [screen, setScreen] = useState<Screen>('home')
  const [bank] = useState<QuestionBank>(QUESTION_BANKS[0])
  const [history, setHistory] = useState<ExamHistoryEntry[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      if (saved) setHistory(JSON.parse(saved))
    } catch {}
  }, [])

  function saveResult(entry: ExamHistoryEntry) {
    const next = [entry, ...history].slice(0, 20)
    setHistory(next)
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    } catch {}
  }

  return (
    <>
      <Head>
        <title>Exam Practice — {bank.courseCode} | CourseNotes</title>
        <meta name="description" content={`JAMB-style CBT practice for ${bank.courseCode} — ${bank.course}`} />
      </Head>

      <Navbar />

      <main className="exam-page-main">
        {/* Breadcrumb */}
        <div className="exam-breadcrumb">
          <Link href="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">Exam Practice</span>
        </div>

        <div className="exam-page-wrap">
          {screen === 'home' && (
            <ExamHome
              bank={bank}
              history={history}
              onStart={mode => setScreen(mode)}
            />
          )}

          {screen === 'study' && (
            <StudyMode
              questions={bank.questions}
              onExit={() => setScreen('home')}
            />
          )}

          {screen === 'exam' && (
            <ExamMode
              questions={bank.questions}
              onExit={() => setScreen('home')}
            />
          )}
        </div>
      </main>
    </>
  )
}
