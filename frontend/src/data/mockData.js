// ===== MOCK DATA FOR EXAM PROCTOR SYSTEM =====

export const MOCK_USERS = [
    { id: 'admin1', name: 'Dr. Sharma', email: 'admin@exam.com', password: 'admin123', role: 'admin' },
    { id: 'stu1', name: 'Asif Ahmed', email: 'asif@student.com', password: 'student123', role: 'student' },
    { id: 'stu2', name: 'Priya Patel', email: 'priya@student.com', password: 'student123', role: 'student' },
    { id: 'stu3', name: 'Rahul Kumar', email: 'rahul@student.com', password: 'student123', role: 'student' },
    { id: 'stu4', name: 'Sneha Reddy', email: 'sneha@student.com', password: 'student123', role: 'student' },
];

export const MOCK_EXAMS = [
    {
        id: 'exam1',
        title: 'Data Structures & Algorithms',
        subject: 'Computer Science',
        duration: 60, // minutes
        totalMarks: 50,
        status: 'published', // draft, published, completed
        createdBy: 'admin1',
        scheduledDate: '2026-03-10T10:00:00',
        assignedStudents: ['stu1', 'stu2', 'stu3', 'stu4'],
        resultsPublished: false,
        questions: [
            {
                id: 'q1', type: 'mcq', marks: 5,
                text: 'What is the time complexity of binary search?',
                options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
                correctAnswer: 1
            },
            {
                id: 'q2', type: 'mcq', marks: 5,
                text: 'Which data structure uses FIFO principle?',
                options: ['Stack', 'Queue', 'Tree', 'Graph'],
                correctAnswer: 1
            },
            {
                id: 'q3', type: 'mcq', marks: 5,
                text: 'What is the worst-case time complexity of quicksort?',
                options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
                correctAnswer: 2
            },
            {
                id: 'q4', type: 'mcq', marks: 5,
                text: 'Which traversal visits the root node first?',
                options: ['Inorder', 'Preorder', 'Postorder', 'Level order'],
                correctAnswer: 1
            },
            {
                id: 'q5', type: 'subjective', marks: 10,
                text: 'Explain the difference between a stack and a queue with real-world examples.',
            },
            {
                id: 'q6', type: 'mcq', marks: 5,
                text: 'Which sorting algorithm has the best average-case performance?',
                options: ['Bubble Sort', 'Selection Sort', 'Merge Sort', 'Insertion Sort'],
                correctAnswer: 2
            },
            {
                id: 'q7', type: 'subjective', marks: 10,
                text: 'Write the algorithm for inserting a node at the end of a singly linked list. Explain each step.',
            },
            {
                id: 'q8', type: 'mcq', marks: 5,
                text: 'A complete binary tree with n nodes has height:',
                options: ['O(n)', 'O(log n)', 'O(n²)', 'O(√n)'],
                correctAnswer: 1
            },
        ]
    },
    {
        id: 'exam2',
        title: 'Database Management Systems',
        subject: 'Computer Science',
        duration: 45,
        totalMarks: 40,
        status: 'published',
        createdBy: 'admin1',
        scheduledDate: '2026-03-15T14:00:00',
        assignedStudents: ['stu1', 'stu2', 'stu3'],
        resultsPublished: false,
        questions: [
            {
                id: 'q1', type: 'mcq', marks: 5,
                text: 'Which normal form eliminates transitive dependency?',
                options: ['1NF', '2NF', '3NF', 'BCNF'],
                correctAnswer: 2
            },
            {
                id: 'q2', type: 'mcq', marks: 5,
                text: 'SQL stands for:',
                options: ['Structured Query Language', 'Sequential Query Language', 'Standard Query Logic', 'Simple Query Language'],
                correctAnswer: 0
            },
            {
                id: 'q3', type: 'mcq', marks: 5,
                text: 'Which command is used to remove a table from the database?',
                options: ['DELETE', 'REMOVE', 'DROP', 'TRUNCATE'],
                correctAnswer: 2
            },
            {
                id: 'q4', type: 'subjective', marks: 10,
                text: 'Explain the ACID properties of a transaction with examples.',
            },
            {
                id: 'q5', type: 'mcq', marks: 5,
                text: 'Which join returns all rows from both tables?',
                options: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'],
                correctAnswer: 3
            },
            {
                id: 'q6', type: 'subjective', marks: 10,
                text: 'What is normalization? Explain 1NF, 2NF, and 3NF with examples.',
            },
        ]
    },
    {
        id: 'exam3',
        title: 'Operating Systems',
        subject: 'Computer Science',
        duration: 30,
        totalMarks: 30,
        status: 'completed',
        createdBy: 'admin1',
        scheduledDate: '2026-02-20T09:00:00',
        assignedStudents: ['stu1', 'stu2'],
        resultsPublished: true,
        questions: [
            {
                id: 'q1', type: 'mcq', marks: 5,
                text: 'Which scheduling algorithm gives minimum average waiting time?',
                options: ['FCFS', 'SJF', 'Round Robin', 'Priority'],
                correctAnswer: 1
            },
            {
                id: 'q2', type: 'mcq', marks: 5,
                text: 'Deadlock occurs when all four conditions hold. Which is NOT one of them?',
                options: ['Mutual Exclusion', 'Hold and Wait', 'Preemption', 'Circular Wait'],
                correctAnswer: 2
            },
            {
                id: 'q3', type: 'subjective', marks: 10,
                text: 'Explain the concept of virtual memory and how paging works.',
            },
            {
                id: 'q4', type: 'mcq', marks: 5,
                text: 'Which memory allocation strategy results in external fragmentation?',
                options: ['Paging', 'Segmentation', 'Both', 'Neither'],
                correctAnswer: 1
            },
            {
                id: 'q5', type: 'mcq', marks: 5,
                text: 'A semaphore is used for:',
                options: ['Memory allocation', 'Process synchronization', 'Disk scheduling', 'File management'],
                correctAnswer: 1
            },
        ]
    }
];

export const MOCK_SUBMISSIONS = [
    {
        id: 'sub1',
        examId: 'exam3',
        studentId: 'stu1',
        answers: { q1: 1, q2: 2, q3: 'Virtual memory is a memory management technique that creates an illusion of a large contiguous block of memory. Paging divides both physical and logical memory into fixed-size blocks called frames and pages respectively.', q4: 1, q5: 1 },
        tabSwitches: 2,
        webcamSnapshots: [],
        submittedAt: '2026-02-20T09:28:00',
        grades: { q1: 5, q2: 5, q3: 8, q4: 5, q5: 5 },
        totalScore: 28,
        isGraded: true,
    },
    {
        id: 'sub2',
        examId: 'exam3',
        studentId: 'stu2',
        answers: { q1: 1, q2: 0, q3: 'Virtual memory uses disk space to extend physical memory. Paging splits memory into pages.', q4: 0, q5: 1 },
        tabSwitches: 5,
        webcamSnapshots: [],
        submittedAt: '2026-02-20T09:30:00',
        grades: { q1: 5, q2: 0, q3: 5, q4: 0, q5: 5 },
        totalScore: 15,
        isGraded: true,
    }
];

// Helper to get data from localStorage or use defaults
export function getStoredData(key, defaultValue) {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch {
        return defaultValue;
    }
}

export function storeData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
