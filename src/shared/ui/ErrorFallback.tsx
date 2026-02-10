interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorFallback = ({ error, resetError }: ErrorFallbackProps) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-24-bold text-black-100">문제가 발생했습니다</h1>
      <p className="text-14-regular text-black-60 text-center max-w-md">
        예상치 못한 오류가 발생했습니다. 문제가 지속되면 고객센터로 문의해주세요.
      </p>
      {import.meta.env.DEV && (
        <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-black-10 p-4 text-12-regular text-black-80">
          {error.message}
        </pre>
      )}
      <button
        onClick={resetError}
        className="mt-4 rounded-lg bg-primary px-6 py-3 text-14-medium text-white-100 hover:bg-primary/90 transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
};
