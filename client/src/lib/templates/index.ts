import { SurveyTemplate, SurveyQuestion, TEACHING_QUALITY_TEMPLATE, ANSWER_SCALE, CATEGORIES } from './teachingQuality';

export type { SurveyTemplate, SurveyQuestion };
export { ANSWER_SCALE, CATEGORIES, TEACHING_QUALITY_TEMPLATE };

// Template registry
export const TEMPLATES: Record<string, SurveyTemplate> = {
  [TEACHING_QUALITY_TEMPLATE.id]: TEACHING_QUALITY_TEMPLATE
};

/**
 * Get a template by its ID
 */
export function getTemplate(templateId: string): SurveyTemplate | null {
  return TEMPLATES[templateId] || null;
}

/**
 * Get all available templates
 */
export function getAllTemplates(): SurveyTemplate[] {
  return Object.values(TEMPLATES);
}

/**
 * Get the default template (teaching quality)
 */
export function getDefaultTemplate(): SurveyTemplate {
  return TEACHING_QUALITY_TEMPLATE;
}

/**
 * Encode answers into a single string format
 * @param answers Array of answer values (1-5)
 * @param totalQuestions Expected total number of questions
 * @returns Encoded string (e.g., "12345..123")
 */
export function encodeAnswers(answers: number[], totalQuestions: number = 25): string {
  if (answers.length !== totalQuestions) {
    throw new Error(`Expected ${totalQuestions} answers, got ${answers.length}`);
  }
  
  // Validate all answers are 1-5
  for (let i = 0; i < answers.length; i++) {
    if (answers[i] < 1 || answers[i] > 5) {
      throw new Error(`Invalid answer value ${answers[i]} at position ${i + 1}. Must be 1-5.`);
    }
  }
  
  return answers.join('');
}

/**
 * Decode a string format into individual answers
 * @param encodedString Encoded answer string (e.g., "12345..123")
 * @param totalQuestions Expected total number of questions
 * @returns Array of answer values (1-5)
 */
export function decodeAnswers(encodedString: string, totalQuestions: number = 25): number[] {
  if (encodedString.length !== totalQuestions) {
    throw new Error(`Expected string length ${totalQuestions}, got ${encodedString.length}`);
  }
  
  const answers = encodedString.split('').map(char => parseInt(char));
  
  // Validate all answers are 1-5
  for (let i = 0; i < answers.length; i++) {
    if (isNaN(answers[i]) || answers[i] < 1 || answers[i] > 5) {
      throw new Error(`Invalid answer value ${answers[i]} at position ${i + 1}. Must be 1-5.`);
    }
  }
  
  return answers;
}
