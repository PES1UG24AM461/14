
import { Route, Routes } from 'react-router-dom';
import AttemptResult from './pages/AttemptResult.jsx';
import Home from './pages/Home.jsx';
import QuizDetail from './pages/QuizDetail.jsx';
import QuizTopics from './pages/QuizTopics.jsx';
import Register from './pages/Register.jsx';
import TakeQuiz from './pages/TakeQuiz.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/quizzes" element={<QuizTopics />} />
      <Route path="/quizzes/:quizId" element={<QuizDetail />} />
      <Route path="/quizzes/:quizId/take" element={<TakeQuiz />} />
      <Route path="/attempts/:attemptId/result" element={<AttemptResult />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
