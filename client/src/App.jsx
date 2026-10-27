import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import QuizDetail from './pages/QuizDetail.jsx';
import QuizTopics from './pages/QuizTopics.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/quizzes" element={<QuizTopics />} />
      <Route path="/quizzes/:quizId" element={<QuizDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
