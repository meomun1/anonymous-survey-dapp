import { FC, useState } from 'react';
import { CreateSurveyData } from '@/lib/api/surveys';
import { getDefaultTemplate } from '@/lib/templates';

interface SurveyFormProps {
  initialData?: Partial<CreateSurveyData>;
  onSubmit: (data: CreateSurveyData) => void;
  loading?: boolean;
  error?: string;
  onTitleChange?: (title: string) => void;
}

export const SurveyForm: FC<SurveyFormProps> = ({
  initialData,
  onSubmit,
  loading = false,
  error,
  onTitleChange
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const template = getDefaultTemplate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      templateId: template.id
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-semibold text-gray-800 mb-2"
          >
            Survey Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              onTitleChange?.(e.target.value);
            }}
            placeholder="e.g., CS101 Course Evaluation - Spring 2024"
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Choose a clear, descriptive title for your survey</p>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-semibold text-gray-800 mb-2"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional: Provide additional context about this survey..."
            rows={2}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Optional description to provide context to participants</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            Survey Template
          </label>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-blue-900 mb-1">{template.name}</h4>
                <p className="text-xs text-blue-800 mb-2">{template.description}</p>
                <div className="flex items-center space-x-2 flex-wrap">
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                    📊 {template.totalQuestions} Questions
                  </div>
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                    ⭐ 1-5 Scale
                  </div>
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                    🎯 Teaching Quality
                  </div>
                </div>
                <div className="mt-2 text-xs text-blue-700">
                  <strong>Categories:</strong> Communication, Content Organization, Subject Knowledge, Learning Environment, Teaching Methods, Overall Assessment
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

    </form>
  );
}; 