import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';

// Add page routes here as backlog items are implemented, e.g.
//   <Route path="/register" element={<Register />} />   OQS-04
//   <Route path="/login" element={<Login />} />         OQS-05
//   <Route path="/quizzes" element={<QuizTopics />} />  OQS-10
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
