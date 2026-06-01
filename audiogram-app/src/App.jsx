import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CalibrationPage from './pages/CalibrationPage'
import SetupPage from './pages/SetupPage'
import TestPage from './pages/TestPage'
import ResultsPage from './pages/ResultsPage'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/calibration" element={<CalibrationPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </div>
  )
}
