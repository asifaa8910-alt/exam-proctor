import { useExam } from '../../context/ExamContext';
import { Award, Eye, EyeOff, CheckCircle, Clock, Users } from 'lucide-react';

export default function PublishResults() {
    const { exams, submissions, togglePublishResults } = useExam();

    const getExamStats = (examId) => {
        const subs = submissions.filter(s => s.examId === examId);
        const graded = subs.filter(s => s.isGraded);
        const avgScore = graded.length > 0
            ? Math.round(graded.reduce((s, sub) => s + sub.totalScore, 0) / graded.length)
            : 0;
        return { total: subs.length, graded: graded.length, avgScore };
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Publish Results</h1>
                <p>Control which exam results are visible to students</p>
            </div>

            {exams.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                    <Award size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <p>No exams created yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {exams.map(exam => {
                        const stats = getExamStats(exam.id);
                        const allGraded = stats.total > 0 && stats.graded === stats.total;

                        return (
                            <div key={exam.id} className="card" style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                flexWrap: 'wrap', gap: 16,
                                borderLeft: `4px solid ${exam.resultsPublished ? 'var(--success)' : 'var(--border-light)'}`
                            }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.05rem', marginBottom: 6 }}>{exam.title}</h3>
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Users size={13} /> {stats.total} submissions
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <CheckCircle size={13} /> {stats.graded} graded
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Award size={13} /> Avg: {stats.avgScore}/{exam.totalMarks}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Clock size={13} /> {new Date(exam.scheduledDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                                        <span className={`badge ${exam.resultsPublished ? 'badge-success' : 'badge-warning'}`}>
                                            {exam.resultsPublished ? '✅ Published' : '⏳ Unpublished'}
                                        </span>
                                        {!allGraded && stats.total > 0 && (
                                            <span className="badge badge-danger">
                                                {stats.total - stats.graded} ungraded
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className={`btn ${exam.resultsPublished ? 'btn-secondary' : 'btn-success'}`}
                                    onClick={() => togglePublishResults(exam.id)}
                                >
                                    {exam.resultsPublished ? (
                                        <><EyeOff size={16} /> Unpublish</>
                                    ) : (
                                        <><Eye size={16} /> Publish Results</>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
