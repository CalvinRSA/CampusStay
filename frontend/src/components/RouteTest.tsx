// src/components/RouteTest.tsx - Simple test component
export default function RouteTest() {
  console.log('🎯 RouteTest component rendered!');
  console.log('URL:', window.location.href);
  
  return (
    <div style={{ 
      padding: '40px', 
      background: 'linear-gradient(135deg, #f97316, #dc2626)',
      minHeight: '100vh',
      color: 'white',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>
        ✅ ROUTE TEST SUCCESSFUL!
      </h1>
      
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '8px' }}>
        <p style={{ marginBottom: '10px' }}><strong>Current URL:</strong></p>
        <p style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '4px' }}>
          {window.location.href}
        </p>
        
        <p style={{ marginTop: '20px', marginBottom: '10px' }}><strong>Pathname:</strong></p>
        <p style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '4px' }}>
          {window.location.pathname}
        </p>
        
        <p style={{ marginTop: '20px', marginBottom: '10px' }}><strong>Search Params:</strong></p>
        <p style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '4px' }}>
          {window.location.search || '(none)'}
        </p>
      </div>

      <div style={{ marginTop: '30px', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>What This Means:</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '10px' }}>✅ React Router is working correctly</li>
          <li style={{ marginBottom: '10px' }}>✅ The route matched successfully</li>
          <li style={{ marginBottom: '10px' }}>✅ Components can render on this route</li>
        </ul>
        
        <p style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,0,0.3)', borderRadius: '4px' }}>
          <strong>🎯 Next Step:</strong> Replace this test component with your actual VerifyEmail or ResetPassword component
        </p>
      </div>

      <button
        onClick={() => window.location.href = '/'}
        style={{
          marginTop: '30px',
          padding: '15px 30px',
          fontSize: '18px',
          background: 'white',
          color: '#f97316',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        ← Back to Home
      </button>
    </div>
  );
}