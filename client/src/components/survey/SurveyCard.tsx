import { FC } from 'react';
import Link from 'next/link';

interface SurveyCardProps {
  id: string;
  title: string;
  description: string;
  totalResponses: number;
  isPublished: boolean;
}

export const SurveyCard: FC<SurveyCardProps> = ({
  id,
  title,
  description,
  totalResponses,
  isPublished,
}) => {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              {totalResponses} responses
            </span>
            <span
              className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                isPublished
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
          <Link
            href={`/surveys/${id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            View Survey
          </Link>
        </div>
      </div>
    </div>
  );
}; 