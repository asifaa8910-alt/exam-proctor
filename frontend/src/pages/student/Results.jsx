import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { Award, CheckCircle, XCircle, MinusCircle, BookOpen } from 'lucide-react';

export default function Results() {
    const { user } = useAuth();
    const { getCompletedExams, exams } = useExam();

    const completed = getCompletedExams(user.id);
    const publishedResults = completed.filter(sub => {
        const exam = exams.find(e => e.id === sub.examId);
        return exam?.resultsPublished && sub.isGraded;
    });

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>My Results</h1>
                <p>View your exam scores and question-wise breakdown</p>
            </div>

            {publishedResults.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                    <Award size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                    <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No Results Available</h3>
                    <p>Results will appear here once your exams are graded and published.</p>
                </div>
            ) : (
                publishedResults.map(sub => {
                    const exam = sub.exam;
                    if (!exam) return null;
                    const percentage = Math.round((sub.totalScore / exam.totalMarks) * 100);

                    return (
                        <div key={sub.id} className="card" style={{ marginBottom: 24 }}>
                            {/* Exam Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                                <div>
                                    <h2 style={{ fontSize: '1.15rem', marginBottom: 4 }}>{exam.title}</h2>
                                    <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                        <span><BookOpen size={13} style={{ verticalAlign: 'middle' }} /> {exam.subject}</span>
                                        <span>Submitted: {new Date(sub.submittedAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        width: 80, height: 80, borderRadius: '50%',
                                        background: percentage >= 70 ? 'var(--success-bg)' : percentage >= 40 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: `3px solid ${percentage >= 70 ? 'var(--success)' : percentage >= 40 ? 'var(--warning)' : 'var(--danger)'}`,
                                        flexDirection: 'column'
                                    }}>
                                        <span style={{
                                            fontSize: '1.25rem', fontWeight: 800,
                                            color: percentage >= 70 ? 'var(--success)' : percentage >= 40 ? 'var(--warning)' : 'var(--danger)'
                                        }}>{percentage}%</span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                        {sub.totalScore}/{exam.totalMarks}
                                    </p>
                                </div>
                            </div>

                            {/* Question Breakdown */}
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Question-wise Breakdown</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {exam.questions.map((q, i) => {
                                    const grade = sub.grades?.[q.id];
                                    const userAnswer = sub.answers?.[q.id];
                                    const isCorrect = q.type === 'mcq' ? userAnswer === q.correctAnswer : grade > 0;
                                    const isUnanswered = userAnswer === undefined || userAnswer === '';

                                    return (
                                        <div key={q.id} style={{
                                            padding: '14px 18px', borderRadius: 'var(--radius-md)',
                                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                    {isUnanswered ? (
                                                        <MinusCircle size={16} style={{ color: 'var(--text-muted)' }} />
                                                    ) : isCorrect ? (
                                                        <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                                                    ) : (
                                                        <XCircle size={16} style={{ color: 'var(--danger)' }} />
                                                    )}
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Q{i + 1}.</span>
                                                    <span className={`badge ${q.type === 'mcq' ? 'badge-info' : 'badge-accent'}`}>{q.type === 'mcq' ? 'MCQ' : 'Subjective'}</span>
                                                </div>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{q.text}</p>
                                                {q.type === 'mcq' && (
                                                    <div style={{ marginTop: 8, fontSize: '0.8rem' }}>
                                                        <span style={{ color: 'var(--text-muted)' }}>Your answer: </span>
                                                        <span style={{ color: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                                                            {isUnanswered ? 'Not answered' : q.options[userAnswer]}
                                                        </span>
                                                        {!isCorrect && !isUnanswered && (
                                                            <span style={{ color: 'var(--success)', marginLeft: 12 }}>
                                                                Correct: {q.options[q.correctAnswer]}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'right', minWidth: 60 }}>
                                                <span style={{
                                                    fontSize: '0.9rem', fontWeight: 700,
                                                    color: grade > 0 ? 'var(--success)' : 'var(--danger)'
                                                }}>
                                                    {grade ?? '-'}/{q.marks}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
