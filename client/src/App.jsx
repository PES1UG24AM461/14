import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import About from './pages/About.jsx';
import AdminFeedback from './pages/AdminFeedback.jsx';
import AttemptResult from './pages/AttemptResult.jsx';
import Contact from './pages/Contact.jsx';
import Feedback from './pages/Feedback.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import QuizDetail from './pages/QuizDetail.jsx';
import QuizLeaderboard from './pages/QuizLeaderboard.jsx';
import QuizManagement from './pages/QuizManagement.jsx';
import QuizTopics from './pages/QuizTopics.jsx';
import Register from './pages/Register.jsx';
import TakeQuiz from './pages/TakeQuiz.jsx';
import MyScores from './pages/MyScores.jsx';

import UserManagement from './pages/UserManagement.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/quizzes" element={<QuizTopics />} />
        <Route path="/quizzes/:quizId" element={<QuizDetail />} />
        <Route path="/quizzes/:quizId/take" element={<TakeQuiz />} />
        <Route path="/quizzes/:quizId/leaderboard" element={<QuizLeaderboard />} />
        <Route path="/attempts/:attemptId/result" element={<AttemptResult />} />
        <Route path="/manage/quizzes" element={<QuizManagement />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/feedback" element={<AdminFeedback />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/scores" element={<MyScores />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
