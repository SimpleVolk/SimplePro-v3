// Minimal _error page for Pages Router error handling
// Main app uses App Router (src/app) with error.tsx and not-found.tsx

function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
      }}
    >
      <h1 style={{ fontSize: '4rem', margin: '0' }}>{statusCode || 'Error'}</h1>
      <p style={{ fontSize: '1.5rem', color: '#999' }}>
        {statusCode === 404
          ? 'Page not found'
          : statusCode === 500
            ? 'Internal server error'
            : 'An error occurred'}
      </p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
