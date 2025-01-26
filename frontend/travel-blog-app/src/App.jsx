import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';

import Login from './pages/Auth/Login';
import SignUp from './pages/Auth/SignUp';
import Home from './pages/Home/Home';

const App = () => {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path='/' exact element={<Root />} />
          <Route path='/dashboard' exact element={<Home />} />
          <Route path='/login' exact element={<Login />} />
          <Route path='/signup' exact element={<SignUp />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

// define root component to handle initial redirect
const Root = () => {
  // check if token exists in localStorage
  const isAuth = !!localStorage.getItem("token");

  // redirect to dashboard if authenticated otherwise redirect to login
  return isAuth ? (
    <Navigate to="/dashboard" />
  ) : (
    <Navigate to="/login" />
  );
};


export default App;