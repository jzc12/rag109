import React from 'react';
import '../styles/BackendOff.css';

const BackendOff = () => {
    return (
        <div className="backend-off-container">
            <h1>Backend Offline</h1>
            <p>We are currently unable to connect to the backend server. Please try again later.</p>
            <p>If the problem persists, please contact support.</p>
        </div>
    );
};

export default BackendOff; 