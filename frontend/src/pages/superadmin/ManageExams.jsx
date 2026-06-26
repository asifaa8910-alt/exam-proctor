import { useExam } from '../../context/ExamContext';
import { useAuth } from '../../context/AuthContext';
import { Trash2, FileText, Calendar, Clock, Award } from 'lucide-react';

export default function SuperAdminExams() {
    const { exams, submissions, deleteExam } = useExam();
    const { examiners } = useAuth();

    const getExamStats = (examId) => {
        const subs = submissions.filter(s => s.examId === examId);
        const graded = subs.filter(s => s.isGraded);
        const avgScore = graded.length > 0
            ? Math.round(graded.reduce((s, sub) => s + sub.totalScore, 0) / graded.length)
            : 0;
        return { total: subs.length, graded: graded.length, avgScore };
    };

    const handleDelete = async (examId) => {
        if (window.confirm('Are you sure you want to delete this Exam? This will delete all submissions associated with it.')) {
            try {
                await deleteExam(examId);
            } catch (err) {
                alert(`Failed to delete exam: ${err.message}`);
            }
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Manage Exams</h1>
                <p>System overview of all exams created by platform examiners</p>
            </div>

            {exams.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                    <FileText size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <p>No exams created yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {exams.map(exam => {
                        const stats = getExamStats(exam.id);
                        const examinerName = examiners.find(ex => ex.examinerId === exam.examinerId)?.name || 'Unknown Examiner';

                        return (
                            <div key={exam.id} className="card" style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                flexWrap: 'wrap', gap: 16,
                                borderLeft: `4px solid ${exam.resultsPublished ? 'var(--success)' : 'var(--border-light)'}`
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                        <h3 style={{ fontSize: '1.05rem', margin: 0 }}>{exam.title}</h3>
                                        <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                                            Examiner: {examinerName} ({exam.examinerId})
                                        </span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                        <span>Subject: <strong>{exam.subject}</strong></span>
                                        <span>Duration: <strong>{exam.duration} min</strong></span>
                                        <span>Total Marks: <strong>{exam.totalMarks}</strong></span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Calendar size={13} /> {new Date(exam.scheduledDate).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        <span>Submissions: <strong>{stats.total}</strong></span>
                                        <span>Graded: <strong>{stats.graded}</strong></span>
                                        <span>Average Score: <strong>{stats.avgScore} pts</strong></span>
                                        <span className={`badge ${exam.resultsPublished ? 'badge-success' : 'badge-warning'}`} style={{ scale: '0.9' }}>
                                            {exam.resultsPublished ? 'Published' : 'Unpublished'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDelete(exam.id)}
                                    style={{ padding: '8px' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
