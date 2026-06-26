import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { Plus, Trash2, Save, CheckCircle, FileText } from 'lucide-react';

export default function CreateExam() {
    const { user } = useAuth();
    const { createExam } = useExam();
    const { getStudents } = useAuth();

    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [duration, setDuration] = useState(60);
    const [scheduledDate, setScheduledDate] = useState('');
    const [questions, setQuestions] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [success, setSuccess] = useState(false);

    const students = getStudents();
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

    const addQuestion = (type) => {
        setQuestions(prev => [...prev, {
            id: `q${Date.now()}`,
            type,
            text: '',
            marks: 5,
            options: type === 'mcq' ? ['', '', '', ''] : undefined,
            correctAnswer: type === 'mcq' ? 0 : undefined,
        }]);
    };

    const updateQuestion = (index, field, value) => {
        setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
    };

    const updateOption = (qIndex, optIndex, value) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIndex) return q;
            const newOpts = [...q.options];
            newOpts[optIndex] = value;
            return { ...q, options: newOpts };
        }));
    };

    const removeQuestion = (index) => {
        setQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const toggleStudent = (studentId) => {
        setSelectedStudents(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !subject || questions.length === 0) return;

        await createExam({
            title,
            subject,
            duration: parseInt(duration),
            totalMarks,
            createdBy: user.id,
            scheduledDate: scheduledDate || new Date().toISOString(),
            assignedStudents: selectedStudents,
            questions: questions.map(q => ({
                ...q,
                marks: parseInt(q.marks),
                correctAnswer: q.type === 'mcq' ? parseInt(q.correctAnswer) : undefined,
            })),
        });

        setSuccess(true);
        setTitle('');
        setSubject('');
        setDuration(60);
        setScheduledDate('');
        setQuestions([]);
        setSelectedStudents([]);
        setTimeout(() => setSuccess(false), 3000);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Create Exam</h1>
                <p>Set up a new exam with questions</p>
            </div>

            {success && (
                <div style={{
                    background: 'var(--success-bg)', color: 'var(--success)', padding: '14px 18px',
                    borderRadius: 'var(--radius-md)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10
                }}>
                    <CheckCircle size={18} /> Exam created successfully!
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Exam Details */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>📝 Exam Details</h3>
                    <div className="responsive-grid-2">
                        <div className="form-group">
                            <label className="form-label">Exam Title *</label>
                            <input className="form-input" type="text" placeholder="e.g., Data Structures Mid-Term" value={title} onChange={e => setTitle(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Subject *</label>
                            <input className="form-input" type="text" placeholder="e.g., Computer Science" value={subject} onChange={e => setSubject(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Duration (minutes)</label>
                            <input className="form-input" type="number" min="10" max="180" value={duration} onChange={e => setDuration(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Scheduled Date</label>
                            <input className="form-input" type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Assign Students */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>👥 Assign Students</h3>
                    {students.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No students registered yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {students.map(s => (
                                <button
                                    key={s.id} type="button"
                                    className={`btn btn-sm ${selectedStudents.includes(s.id) ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => toggleStudent(s.id)}
                                >
                                    {s.name}
                                </button>
                             ))}
                        </div>
                    )}
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10 }}>
                        Selected: {selectedStudents.length} students
                    </p>
                </div>

                {/* Questions */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: '1rem' }}>❓ Questions ({questions.length})</h3>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addQuestion('mcq')}>
                                <Plus size={14} /> Add MCQ
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addQuestion('subjective')}>
                                <Plus size={14} /> Add Subjective
                            </button>
                        </div>
                    </div>

                    {questions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                            <FileText size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                            <p>No questions added yet. Click the buttons above to add questions.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {questions.map((q, i) => (
                                <div key={q.id} style={{
                                    padding: '18px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="badge badge-accent">Q{i + 1}</span>
                                            <span className={`badge ${q.type === 'mcq' ? 'badge-info' : 'badge-warning'}`}>{q.type === 'mcq' ? 'MCQ' : 'Subjective'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Marks:</label>
                                                <input className="form-input" type="number" min="1" max="50" value={q.marks}
                                                    onChange={e => updateQuestion(i, 'marks', e.target.value)}
                                                    style={{ width: 60, padding: '6px 10px', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeQuestion(i)} style={{ padding: '6px 8px' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: q.type === 'mcq' ? 14 : 0 }}>
                                        <textarea className="form-textarea" placeholder="Enter question text..." value={q.text}
                                            onChange={e => updateQuestion(i, 'text', e.target.value)}
                                            style={{ minHeight: 60 }}
                                        />
                                    </div>

                                    {q.type === 'mcq' && (
                                        <div>
                                            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Options:</label>
                                            {q.options.map((opt, j) => (
                                                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                                    <input
                                                        type="radio"
                                                        name={`correct-${q.id}`}
                                                        checked={q.correctAnswer === j}
                                                        onChange={() => updateQuestion(i, 'correctAnswer', j)}
                                                        style={{ accentColor: 'var(--success)' }}
                                                        title="Mark as correct answer"
                                                    />
                                                    <input className="form-input" type="text" placeholder={`Option ${j + 1}`}
                                                        value={opt} onChange={e => updateOption(i, j, e.target.value)}
                                                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                            ))}
                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                ● Select the radio button next to the correct answer
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                        Total Marks: <strong style={{ color: 'var(--accent)' }}>{totalMarks}</strong>
                    </div>
                </div>

                {/* Submit */}
                <button className="btn btn-primary btn-lg" type="submit" disabled={!title || !subject || questions.length === 0}>
                    <Save size={18} /> Create Exam
                </button>
            </form>
        </div>
    );
}
