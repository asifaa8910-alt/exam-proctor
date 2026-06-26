import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const ExamContext = createContext(null);

export function ExamProvider({ children }) {
    const { user } = useAuth();
    const [exams, setExams] = useState([]);
    const [submissions, setSubmissions] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            if (user) {
                try {
                    const examsRes = await api.get('/exams');
                    const subsRes = await api.get('/exams/submissions');
                    setExams(examsRes.exams);
                    setSubmissions(subsRes.submissions);
                } catch (err) {
                    console.error('Failed to load exam data:', err);
                }
            } else {
                setExams([]);
                setSubmissions([]);
            }
        };
        loadData();
    }, [user]);

    // Create a new exam
    const createExam = async (examData) => {
        try {
            const data = await api.post('/exams', examData);
            setExams(prev => [...prev, data.exam]);
            return data.exam;
        } catch (err) {
            console.error('Failed to create exam:', err);
            throw err;
        }
    };

    // Get exams assigned to a student
    const getStudentExams = (studentId) => {
        return exams.filter(e => e.assignedStudents?.includes(studentId));
    };

    // Get upcoming exams for a student (not yet submitted)
    const getUpcomingExams = (studentId) => {
        const studentExams = getStudentExams(studentId);
        return studentExams.filter(e => {
            const hasSubmission = submissions.find(s => s.examId === e.id && s.studentId === studentId);
            return !hasSubmission && e.status === 'published';
        });
    };

    // Get completed exams for a student
    const getCompletedExams = (studentId) => {
        return submissions
            .filter(s => s.studentId === studentId)
            .map(sub => ({
                ...sub,
                exam: exams.find(e => e.id === sub.examId)
            }))
            .filter(s => s.exam);
    };

    // Submit an exam
    const submitExam = async (submission) => {
        try {
            const data = await api.post(`/exams/${submission.examId}/submit`, {
                answers: submission.answers,
                tabSwitches: submission.tabSwitches,
                webcamSnapshots: submission.webcamSnapshots
            });
            setSubmissions(prev => [...prev, data.submission]);
            return data.submission;
        } catch (err) {
            console.error('Failed to submit exam:', err);
            throw err;
        }
    };

    // Get submissions for an exam
    const getExamSubmissions = (examId) => {
        return submissions.filter(s => s.examId === examId);
    };

    // Get a specific submission
    const getSubmission = (examId, studentId) => {
        return submissions.find(s => s.examId === examId && s.studentId === studentId);
    };

    // Batch grade multiple questions at once
    const gradeSubmission = async (submissionId, gradesMap) => {
        try {
            const data = await api.post(`/exams/submissions/${submissionId}/grade`, { gradesMap });
            setSubmissions(prev => prev.map(s => s.id === submissionId ? data.submission : s));
            return data.submission;
        } catch (err) {
            console.error('Failed to grade submission:', err);
            throw err;
        }
    };

    // Grade a subjective answer (single question)
    const gradeAnswer = async (submissionId, questionId, marks) => {
        return gradeSubmission(submissionId, { [questionId]: marks });
    };

    // Toggle publish results
    const togglePublishResults = async (examId) => {
        try {
            const data = await api.post(`/exams/${examId}/toggle-publish`);
            setExams(prev => prev.map(e => e.id === examId ? { ...e, resultsPublished: data.resultsPublished } : e));
        } catch (err) {
            console.error('Failed to toggle publish status:', err);
            throw err;
        }
    };

    // Assign exam to students
    const assignExamToStudents = async (examId, studentIds) => {
        try {
            const data = await api.post(`/exams/${examId}/assign`, { studentIds });
            setExams(prev => prev.map(e => e.id === examId ? { ...e, assignedStudents: data.assignedStudents } : e));
        } catch (err) {
            console.error('Failed to assign students to exam:', err);
            throw err;
        }
    };

    const deleteExam = async (examId) => {
        try {
            await api.delete(`/exams/${examId}`);
            setExams(prev => prev.filter(e => e.id !== examId));
            return { success: true };
        } catch (err) {
            console.error('Failed to delete exam:', err);
            throw err;
        }
    };

    return (
        <ExamContext.Provider value={{
            exams, submissions,
            createExam, deleteExam, getStudentExams, getUpcomingExams, getCompletedExams,
            submitExam, getExamSubmissions, getSubmission, gradeAnswer, gradeSubmission,
            togglePublishResults, assignExamToStudents
        }}>
            {children}
        </ExamContext.Provider>
    );
}

export function useExam() {
    const ctx = useContext(ExamContext);
    if (!ctx) throw new Error('useExam must be used within ExamProvider');
    return ctx;
}
