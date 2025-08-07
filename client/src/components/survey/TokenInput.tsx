import { FC, useState } from 'react';

interface TokenInputProps {
  onSubmit: (token: string) => void;
  isLoading?: boolean;
  error?: string;
}

export const TokenInput: FC<TokenInputProps> = ({
  onSubmit,
  isLoading = false,
  error,
}) => {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(token);
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="token"
            className="block text-sm font-medium text-gray-700"
          >
            Survey Token
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="token"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter your survey token"
              required
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600" id="token-error">
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Validating...' : 'Access Survey'}
        </button>
      </form>
    </div>
  );
}; 