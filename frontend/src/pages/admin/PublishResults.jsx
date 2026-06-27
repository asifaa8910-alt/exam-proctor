import { useState } from 'react';
import { useExam } from '../../context/ExamContext';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { 
  Award, Eye, EyeOff, CheckCircle, Clock, Users, FileText, 
  ChevronDown, ChevronUp, Check, AlertCircle, X 
} from 'lucide-react';

export default function PublishResults() {
  const { exams, submissions, togglePublishResults } = useExam();
  const { users } = useAuth(); // User profiles for student data

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'published'
  const [expandedExam, setExpandedExam] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [publishingId, setPublishingId] = useState(null);

  const getExamStats = (examId) => {
    const subs = submissions.filter(s => s.examId === examId);
    const graded = subs.filter(s => s.isGraded);
    const avgScore = graded.length > 0
      ? Math.round(graded.reduce((s, sub) => s + sub.totalScore, 0) / graded.length)
      : 0;
    return { total: subs.length, graded: graded.length, avgScore, subs };
  };

  const handleTogglePublish = async (examId) => {
    setPublishingId(examId);
    try {
      await togglePublishResults(examId);
    } catch (err) {
      console.error('Toggle publish error:', err);
    } finally {
      setPublishingId(null);
    }
  };

  const handleViewResponses = (sub, exam) => {
    setSelectedSubmission({ sub, exam });
    setShowResponseModal(true);
  };

  const pendingExams = exams.filter(e => !e.resultsPublished);
  const publishedExams = exams.filter(e => e.resultsPublished);

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>Exam Result Publishing</h1>
        <p>Review student response sheets, verify auto-generated scores, and publish marks to student dashboards.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', marginBottom: 24, paddingBottom: 10 }}>
        <button
          className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('pending')}
        >
          <Clock size={16} /> Awaiting Approval ({pendingExams.length})
        </button>
        <button
          className={`btn ${activeTab === 'published' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('published')}
        >
          <CheckCircle size={16} /> Published Results ({publishedExams.length})
        </button>
      </div>

      {/* Active Tab rendering */}
      {activeTab === 'pending' ? (
        pendingExams.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
            <CheckCircle size={40} style={{ marginBottom: 12, color: 'var(--success)' }} />
            <p>No results pending approval. All caught up! 🎉</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pendingExams.map(exam => {
              const stats = getExamStats(exam.id);
              const isExpanded = expandedExam === exam.id;
              const allGraded = stats.total > 0 && stats.graded === stats.total;

              return (
                <div key={exam.id} className="card card-glow" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: 6 }}>{exam.title}</h3>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={13} /> {stats.total} submissions</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={13} /> {stats.graded} graded</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> {new Date(exam.scheduledDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setExpandedExam(isExpanded ? null : exam.id)}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Submissions
                      </button>
                      <button
                        className="btn btn-success"
                        disabled={stats.total === 0 || publishingId === exam.id}
                        onClick={() => handleTogglePublish(exam.id)}
                      >
                        {publishingId === exam.id ? 'Publishing...' : <><Eye size={16} /> Publish Results</>}
                      </button>
                    </div>
                  </div>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div style={{
                      marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)',
                      animation: 'scaleIn 0.15s ease'
                    }}>
                      <h4 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 12 }}>Submitted Responses</h4>
                      {stats.subs.length === 0 ? (
                        <div style={{ padding: 20, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          No student submissions received yet for this exam.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {stats.subs.map(sub => {
                            const pct = Math.round((sub.totalScore / exam.totalMarks) * 100);
                            return (
                              <div key={sub.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)'
                              }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{sub.studentName || 'Student'}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    Submitted: {new Date(sub.submittedAt).toLocaleTimeString()}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                  <span className={`badge ${sub.isGraded ? 'badge-info' : 'badge-warning'}`}>
                                    {sub.isGraded ? `Score: ${sub.totalScore}/${exam.totalMarks} (${pct}%)` : 'Grading Pending'}
                                  </span>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleViewResponses(sub, exam)}
                                  >
                                    <FileText size={12} /> Review Marks
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        publishedExams.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
            <EyeOff size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p>No results have been published yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {publishedExams.map(exam => {
              const stats = getExamStats(exam.id);

              return (
                <div key={exam.id} className="card" style={{ borderLeft: '4px solid var(--success)', padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: 6 }}>{exam.title}</h3>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <span><Users size={13} /> {stats.total} Submissions</span>
                        <span><Award size={13} /> Class Avg: {stats.avgScore}/{exam.totalMarks}</span>
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleTogglePublish(exam.id)}
                    >
                      <EyeOff size={14} /> Unpublish Results
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Response Review Modal */}
      {showResponseModal && selectedSubmission && (
        <Modal
          isOpen={showResponseModal}
          onClose={() => setShowResponseModal(false)}
          title={`Review Sheet: ${selectedSubmission.sub.studentName}`}
        >
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 6 }}>
            <div style={{ marginBottom: 20, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Exam Name:</span>
                <span style={{ fontWeight: 600 }}>{selectedSubmission.exam.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Submitted At:</span>
                <span>{new Date(selectedSubmission.sub.submittedAt).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Final Score:</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{selectedSubmission.sub.totalScore} / {selectedSubmission.exam.totalMarks}</span>
              </div>
            </div>

            <h4 style={{ fontSize: '0.9rem', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
              Student Answers & Auto-Grades
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selectedSubmission.exam.questions.map((q, idx) => {
                const studentAns = selectedSubmission.sub.answers?.[q.id];
                const marksAwarded = selectedSubmission.sub.grades?.[q.id];
                const isCorrect = q.type === 'mcq' && studentAns === q.correctAnswer;
                const isUnanswered = studentAns === undefined || studentAns === '';

                return (
                  <div key={q.id} style={{
                    padding: 14, background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Q{idx + 1}. ({q.type.toUpperCase()})</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: marksAwarded > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {marksAwarded ?? 0} / {q.marks} Marks
                      </span>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 10 }}>{q.text}</p>
                    
                    {q.type === 'mcq' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {q.options.map((opt, oIdx) => {
                          const isSelected = studentAns === oIdx;
                          const isCorrectOpt = q.correctAnswer === oIdx;
                          let border = '1px solid var(--border)';
                          let bg = 'var(--bg-input)';
                          if (isSelected) {
                            border = isCorrect ? '1px solid var(--success)' : '1px solid var(--danger)';
                            bg = isCorrect ? 'var(--success-bg)' : 'var(--danger-bg)';
                          } else if (isCorrectOpt) {
                            border = '1px solid var(--success)';
                            bg = 'var(--success-bg)';
                          }
                          return (
                            <div key={oIdx} style={{
                              padding: '8px 12px', borderRadius: 'var(--radius-sm)', border, background: bg,
                              fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between'
                            }}>
                              <span>{opt}</span>
                              {isSelected && (isCorrect ? <Check size={12} style={{ color: 'var(--success)' }} /> : <X size={12} style={{ color: 'var(--danger)' }} />)}
                              {!isSelected && isCorrectOpt && <Check size={12} style={{ color: 'var(--success)' }} />}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.82rem' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.72rem', textTransform: 'uppercase' }}>Student Response:</div>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{isUnanswered ? 'Not answered' : studentAns}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setShowResponseModal(false)}>Close Review</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
