import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import AttemptResult from './pages/AttemptResult.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import QuizDetail from './pages/QuizDetail.jsx';
import QuizManagement from './pages/QuizManagement.jsx';
import QuizTopics from './pages/QuizTopics.jsx';
import Register from './pages/Register.jsx';
import TakeQuiz from './pages/TakeQuiz.jsx';

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
        <Route path="/attempts/:attemptId/result" element={<AttemptResult />} />
        <Route path="/manage/quizzes" element={<QuizManagement />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
