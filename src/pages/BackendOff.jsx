import React from 'react';
import '../styles/BackendOff.css';

const BackendOff = () => {
    return (
        <div className="backend-off-container">
            <h1>Backend Offline</h1>
            <p>We are currently unable to connect to the backend server. Please try again later.</p>
            <p>You can see <a href="https://www.bilibili.com/video/BV139TNzTEN6/">our video</a> to know how our system works</p>
        </div>
    );
};

export default BackendOff; 