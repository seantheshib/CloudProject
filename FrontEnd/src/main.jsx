import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';

const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || "us-east-1_xxxxx";
const clientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID || "xxxxxxxxx";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: poolId,
      userPoolClientId: clientId,
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
