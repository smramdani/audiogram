import { Routes, Route } from 'react-router-dom'
import AppHeader from './components/AppHeader'
import LandingPage from './pages/LandingPage'
import CalibrationPage from './pages/CalibrationPage'
import SetupPage from './pages/SetupPage'
import TestPage from './pages/TestPage'
import ResultsPage from './pages/ResultsPage'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppHeader />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/calibration" element={<CalibrationPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
    </div>
  )
}
