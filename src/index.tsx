import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './components/Navbar';
import Marquesina from './components/Marquesina';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { instalarInterceptor } from './utils/axiosSetup';

instalarInterceptor();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}></LocalizationProvider>
      <BrowserRouter>
        <Marquesina />
        <Navbar />
        <App />
      </BrowserRouter>
    </ThemeProvider>
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
);
