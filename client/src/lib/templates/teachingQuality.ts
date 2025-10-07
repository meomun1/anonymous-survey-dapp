export interface SurveyQuestion {
  id: number;
  text: string;
  category: string;
}

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  totalQuestions: number;
  questions: SurveyQuestion[];
}

export const TEACHING_QUALITY_TEMPLATE: SurveyTemplate = {
  id: 'teaching_quality_25q',
  name: 'Teaching Quality Assessment',
  description: 'Comprehensive evaluation of teaching effectiveness across 25 key areas',
  totalQuestions: 25,
  questions: [
    {
      id: 1,
      text: 'The instructor clearly communicates the learning objectives at the beginning of each class.',
      category: 'Communication'
    },
    {
      id: 2,
      text: 'The instructor explains complex concepts in a way that is easy to understand.',
      category: 'Communication'
    },
    {
      id: 3,
      text: 'The instructor uses examples and illustrations effectively to clarify points.',
      category: 'Communication'
    },
    {
      id: 4,
      text: 'The instructor encourages questions and provides helpful answers.',
      category: 'Communication'
    },
    {
      id: 5,
      text: 'The instructor speaks clearly and at an appropriate pace.',
      category: 'Communication'
    },
    {
      id: 6,
      text: 'The course materials are well-organized and logically structured.',
      category: 'Content Organization'
    },
    {
      id: 7,
      text: 'The instructor follows a clear lesson plan and stays on topic.',
      category: 'Content Organization'
    },
    {
      id: 8,
      text: 'The instructor effectively manages class time and pace.',
      category: 'Content Organization'
    },
    {
      id: 9,
      text: 'The instructor provides adequate preparation for assignments and exams.',
      category: 'Content Organization'
    },
    {
      id: 10,
      text: 'The course content is relevant and up-to-date.',
      category: 'Content Organization'
    },
    {
      id: 11,
      text: 'The instructor demonstrates deep knowledge of the subject matter.',
      category: 'Subject Knowledge'
    },
    {
      id: 12,
      text: 'The instructor can answer questions beyond the basic course material.',
      category: 'Subject Knowledge'
    },
    {
      id: 13,
      text: 'The instructor connects course content to real-world applications.',
      category: 'Subject Knowledge'
    },
    {
      id: 14,
      text: 'The instructor stays current with developments in the field.',
      category: 'Subject Knowledge'
    },
    {
      id: 15,
      text: 'The instructor provides additional resources for deeper learning.',
      category: 'Subject Knowledge'
    },
    {
      id: 16,
      text: 'The instructor creates a positive and inclusive learning environment.',
      category: 'Learning Environment'
    },
    {
      id: 17,
      text: 'The instructor treats all students with respect and fairness.',
      category: 'Learning Environment'
    },
    {
      id: 18,
      text: 'The instructor encourages student participation and engagement.',
      category: 'Learning Environment'
    },
    {
      id: 19,
      text: 'The instructor provides constructive feedback on student work.',
      category: 'Learning Environment'
    },
    {
      id: 20,
      text: 'The instructor is approachable and available for student consultation.',
      category: 'Learning Environment'
    },
    {
      id: 21,
      text: 'The instructor uses appropriate teaching methods for the subject matter.',
      category: 'Teaching Methods'
    },
    {
      id: 22,
      text: 'The instructor incorporates different learning styles in their teaching.',
      category: 'Teaching Methods'
    },
    {
      id: 23,
      text: 'The instructor uses technology effectively to enhance learning.',
      category: 'Teaching Methods'
    },
    {
      id: 24,
      text: 'The instructor provides meaningful and varied learning activities.',
      category: 'Teaching Methods'
    },
    {
      id: 25,
      text: 'Overall, I would recommend this instructor to other students.',
      category: 'Overall Assessment'
    }
  ]
};

export const ANSWER_SCALE = [
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Fair' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Great' },
  { value: 5, label: 'Excellent' }
];

export const CATEGORIES = [
  'Communication',
  'Content Organization', 
  'Subject Knowledge',
  'Learning Environment',
  'Teaching Methods',
  'Overall Assessment'
];
