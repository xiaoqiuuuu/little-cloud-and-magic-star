import { useParams } from 'react-router-dom';
import QuizPage from './QuizPage';

function AdminQuizPage() {
  const { questionId } = useParams();

  return <QuizPage initialQuestionId={questionId} />;
}

export default AdminQuizPage;
