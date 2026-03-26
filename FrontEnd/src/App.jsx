import React, { useState, useEffect } from 'react';
import GraphCanvas from './components/GraphCanvas';
import Uploader from './components/Uploader';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';

function MainApp({ signOut, user }) {
  const [token, setToken] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { tokens } = await fetchAuthSession();
        setToken(tokens.idToken.toString());
      } catch (err) {
        console.error("No session found", err);
      }
    };
    fetchToken();
  }, [user]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <>
      <Uploader token={token} onUploadComplete={handleRefresh} signOut={signOut} />
      <GraphCanvas token={token} refreshTrigger={refreshTrigger} />
    </>
  );
}

export default function App() {
  return (
    <Authenticator loginMechanisms={['email']} signUpAttributes={['email']}>
      {({ signOut, user }) => (
        <MainApp signOut={signOut} user={user} />
      )}
    </Authenticator>
  );
}
