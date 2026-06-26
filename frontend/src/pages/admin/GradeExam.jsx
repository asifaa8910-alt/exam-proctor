import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { CheckCircle, Save, ClipboardCheck, AlertTriangle } from 'lucide-react';

export default function GradeExam() {
    const { getStudents } = useAuth();
    const { exams, submissions, gradeSubmission } = useExam();
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedSubId, setSelectedSubId] = useState(null);
    const [localGrades, setLocalGrades] = useState({});
    const [saved, setSaved] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const students = getStudents();
    const exam = exams.find(e => e.id === selectedExam);
    const examSubmissions = useMemo(
        () => submissions.filter(s => s.examId === selectedExam),
        [submissions, selectedExam]
    );

    // Always get fresh submission from context (never stale)
    const selectedSubmission = useMemo(
        () => submissions.find(s => s.id === selectedSubId),
        [submissions, selectedSubId]
    );

    const selectSubmission = (sub) => {
        setSelectedSubId(sub.id);
        setErrorMessage('');
        // Initialize local grades from current submission data
        const grades = {};
        if (exam) {
            exam.questions.forEach(q => {
                if (q.type === 'subjective') {
                    grades[q.id] = sub.grades?.[q.id] != null ? sub.grades[q.id] : '';
                }
            });
        }
        setLocalGrades(grades);
        setSaved(false);
    };

    const handleSaveGrades = () => {
        if (!selectedSubmission) return;
        setErrorMessage('');

        // Validate all grades
        const validatedGrades = {};
        let hasError = false;
        let validationErrorMessage = '';

        if (exam) {
            exam.questions.forEach((q, idx) => {
                if (q.type === 'subjective') {
                    const val = localGrades[q.id];
                    const answer = selectedSubmission.answers?.[q.id];
                    let numVal = parseInt(val);

                    if (val === '' || val === undefined) {
                        // Default to 0 marks if student didn't submit an answer
                        if (!answer || answer.trim() === '') {
                            numVal = 0;
                        } else {
                            hasError = true;
                            validationErrorMessage = `Please assign marks for Q${idx + 1} (written response exists).`;
                        }
                    } else if (isNaN(numVal) || numVal < 0 || numVal > q.marks) {
                        hasError = true;
                        validationErrorMessage = `Marks for Q${idx + 1} must be a number between 0 and ${q.marks}.`;
                    }

                    if (!hasError) {
                        validatedGrades[q.id] = numVal;
                    }
                }
            });
        }

        if (hasError) {
            setErrorMessage(validationErrorMessage);
            return; // Don't save if validation fails
        }

        // Batch update all grades at once — fixes the race condition
        gradeSubmission(selectedSubmission.id, validatedGrades);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    // Calculate live total based on local grades + MCQ auto-grades
    const getLiveTotal = () => {
        if (!selectedSubmission || !exam) return 0;
        let total = 0;
        exam.questions.forEach(q => {
            if (q.type === 'mcq') {
                total += selectedSubmission.grades?.[q.id] || 0;
            } else {
                const val = parseInt(localGrades[q.id]);
                total += isNaN(val) ? 0 : val;
            }
        });
        return total;
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Grade Exams</h1>
                <p>Review and grade student submissions</p>
            </div>

            {/* Exam Selector */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Select Exam</label>
                    <select className="form-select" value={selectedExam} onChange={e => {
                        setSelectedExam(e.target.value);
                        setSelectedSubId(null);
                        setLocalGrades({});
                    }}>
                        <option value="">-- Choose an exam --</option>
                        {exams.map(e => (
                            <option key={e.id} value={e.id}>{e.title} ({e.subject})</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedExam && (
                <div className="admin-grade-layout">
                    {/* Student List */}
                    <div className="card" style={{ padding: 16 }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: 14, color: 'var(--text-secondary)' }}>
                            Submissions ({examSubmissions.length})
                        </h4>
                        {examSubmissions.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                                No submissions yet.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {examSubmissions.map(sub => {
                                    const student = students.find(s => s.id === sub.studentId);
                                    return (
                                        <button
                                            key={sub.id}
                                            onClick={() => selectSubmission(sub)}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '12px 14px', borderRadius: 'var(--radius-md)', border: 'none',
                                                background: selectedSubId === sub.id ? 'var(--accent-glow)' : 'var(--bg-input)',
                                                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                                                transition: 'all 0.15s', width: '100%'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {student?.name || 'Unknown'}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    {new Date(sub.submittedAt).toLocaleString()}
                                                </div>
                                            </div>
                                            <span className={`badge ${sub.isGraded ? 'badge-success' : 'badge-warning'}`}>
                                                {sub.isGraded ? `${sub.totalScore}pts` : 'Pending'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Grading Panel */}
                    <div>
                        {!selectedSubmission ? (
                            <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                                <ClipboardCheck size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
                                <p>Select a submission to start grading</p>
                            </div>
                        ) : (
                            <div className="card">
                                {saved && (
                                    <div style={{
                                        background: 'var(--success-bg)', color: 'var(--success)', padding: '10px 14px',
                                        borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8
                                    }}>
                                        <CheckCircle size={16} /> Grades saved successfully!
                                    </div>
                                )}

                                {errorMessage && (
                                    <div style={{
                                        background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px',
                                        borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8
                                    }}>
                                        <AlertTriangle size={16} /> {errorMessage}
                                    </div>
                                )}

                                {/* Score summary bar */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '16px 20px', borderRadius: 'var(--radius-md)',
                                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                                    marginBottom: 20
                                }}>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', marginBottom: 2 }}>
                                            {students.find(s => s.id === selectedSubmission.studentId)?.name}'s Answers
                                        </h3>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>
                                            {getLiveTotal()}<span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>/{exam.totalMarks}</span>
                                        </div>
                                        <span className={`badge ${selectedSubmission.isGraded ? 'badge-success' : 'badge-warning'}`}>
                                            {selectedSubmission.isGraded ? 'Fully Graded' : 'Grading Required'}
                                        </span>
                                    </div>
                                </div>

                                {/* Tab switches warning */}
                                {selectedSubmission.tabSwitches > 2 && (
                                    <div style={{
                                        background: 'var(--warning-bg)', color: 'var(--warning)', padding: '10px 14px',
                                        borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
                                        fontSize: '0.85rem'
                                    }}>
                                        <AlertTriangle size={16} /> This student had {selectedSubmission.tabSwitches} tab switches during the exam.
                                    </div>
                                )}

                                {exam.questions.map((q, i) => {
                                    const answer = selectedSubmission.answers?.[q.id];
                                    const grade = selectedSubmission.grades?.[q.id];
                                    const localVal = localGrades[q.id];
                                    const displayVal = q.type === 'subjective' ? (localVal !== undefined ? localVal : (grade ?? '')) : grade;

                                    return (
                                        <div key={q.id} style={{
                                            padding: '18px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border)', marginBottom: 14
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span className="badge badge-accent">Q{i + 1}</span>
                                                    <span className={`badge ${q.type === 'mcq' ? 'badge-info' : 'badge-warning'}`}>
                                                        {q.type === 'mcq' ? 'MCQ' : 'Subjective'}
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.marks} marks</span>
                                            </div>

                                            <p style={{ fontSize: '0.9rem', marginBottom: 12, color: 'var(--text-heading)' }}>{q.text}</p>

                                            {q.type === 'mcq' ? (
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', marginBottom: 6 }}>
                                                        <span style={{ color: 'var(--text-muted)' }}>Student's answer: </span>
                                                        <span style={{ color: answer === q.correctAnswer ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                                            {answer !== undefined ? q.options[answer] : 'Not answered'}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem' }}>
                                                        <span style={{ color: 'var(--text-muted)' }}>Correct answer: </span>
                                                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>{q.options[q.correctAnswer]}</span>
                                                    </div>
                                                    <div style={{ marginTop: 8 }}>
                                                        <span className={`badge ${grade > 0 ? 'badge-success' : 'badge-danger'}`}>
                                                            {grade}/{q.marks} marks (auto-graded)
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div style={{
                                                        padding: '12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
                                                        fontSize: '0.85rem', color: 'var(--text-secondary)',
                                                        lineHeight: 1.6, marginBottom: 12, border: '1px solid var(--border)',
                                                        minHeight: 60, whiteSpace: 'pre-wrap'
                                                    }}>
                                                        {answer || <i style={{ color: 'var(--text-muted)' }}>Not answered</i>}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                            Marks (0-{q.marks}):
                                                        </label>
                                                        <input
                                                            className="form-input"
                                                            type="number"
                                                            min="0"
                                                            max={q.marks}
                                                            value={displayVal}
                                                            onChange={e => setLocalGrades(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                            style={{ width: 80, padding: '6px 10px', fontSize: '0.85rem' }}
                                                        />
                                                        {parseInt(displayVal) > q.marks && (
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
                                                                Max: {q.marks}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <button className="btn btn-primary btn-lg" onClick={handleSaveGrades} style={{ marginTop: 8 }}>
                                    <Save size={16} /> Save All Grades
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
